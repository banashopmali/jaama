import * as crypto from "crypto";
import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  UserContext,
  CurrencyCode,
} from "@jaama/types";
import {
  PaymentIntent,
  PaymentAttempt,
  PaymentProviderType,
  PaymentAttemptStatus,
  PaymentDomainError,
  assertSafeIntegerAmount,
  assertValidPaymentIntentTransition,
  assertValidPaymentAttemptTransition,
  validateProviderAttemptResult,
} from "./provider.interface";
import { PaymentProviderResolver } from "./provider-registry";
import { PaymentFinalizationService } from "./payment-finalization.service";

export interface CreatePaymentIntentDto {
  amountMinor: number;
  currencyCode?: CurrencyCode;
  saleId?: string;
  orderId?: string;
  invoiceId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  expiresInMinutes?: number;
}

export interface CreatePaymentAttemptDto {
  provider: PaymentProviderType;
  amountMinor?: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export function computeCanonicalAttemptHash(params: {
  organizationId: string;
  paymentIntentId: string;
  provider: string;
  amountMinor: number;
  currencyCode: string;
}): string {
  const canonicalPayload = JSON.stringify({
    amountMinor: params.amountMinor,
    currencyCode: params.currencyCode,
    organizationId: params.organizationId,
    paymentIntentId: params.paymentIntentId,
    provider: params.provider,
  });
  return crypto.createHash("sha256").update(canonicalPayload).digest("hex");
}


@Injectable()
export class PaymentIntentService {
  private readonly finalizationService: PaymentFinalizationService;
  private readonly prismaClient: any;

  constructor(
    private readonly providerResolver: PaymentProviderResolver,
    @Optional() finalizationServiceOrPrisma?: PaymentFinalizationService | any,
    @Optional() prismaClient?: any
  ) {
    if (
      finalizationServiceOrPrisma &&
      typeof (finalizationServiceOrPrisma as any).finalizeAttemptSuccess === "function"
    ) {
      this.finalizationService = finalizationServiceOrPrisma;
      this.prismaClient = prismaClient || defaultPrisma;
    } else {
      this.prismaClient = finalizationServiceOrPrisma || defaultPrisma;
      this.finalizationService = new PaymentFinalizationService(this.prismaClient);
    }
  }

  public async createPaymentIntent(
    userContext: UserContext,
    dto: CreatePaymentIntentDto
  ): Promise<PaymentIntent> {
    const { organizationId } = userContext;

    // Enforce safe integer money invariant
    assertSafeIntegerAmount(dto.amountMinor, "amountMinor", 1);

    const currencyCode = dto.currencyCode || "XOF";

    // Validate Sale if linked
    if (dto.saleId) {
      const sale = await this.prismaClient.sale.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: dto.saleId,
          },
        },
      });
      if (!sale) {
        throw new PaymentDomainError("TENANT_MISMATCH", `Sale '${dto.saleId}' does not belong to organization.`);
      }
    }

    // Validate Customer if linked
    if (dto.customerId) {
      const customer = await this.prismaClient.customer.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: dto.customerId,
          },
        },
      });
      if (!customer) {
        throw new PaymentDomainError("TENANT_MISMATCH", `Customer '${dto.customerId}' does not belong to organization.`);
      }
    }

    const reference = `PI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresInMinutes = dto.expiresInMinutes || 60;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const intent = await this.prismaClient.$transaction(async (tx: any) => {
      const created = await tx.paymentIntent.create({
        data: {
          organizationId,
          reference,
          amountMinor: dto.amountMinor,
          currencyCode,
          status: "REQUIRES_PAYMENT",
          saleId: dto.saleId || null,
          customerId: dto.customerId || null,
          description: dto.description || null,
          metadataJson: JSON.stringify(dto.metadata || {}),
          expiresAt,
        },
      });

      // Audit Event
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "PAYMENT_INTENT_CREATED",
          resourceType: "PaymentIntent",
          resourceId: created.id,
          metadataJson: JSON.stringify({
            reference: created.reference,
            amountMinor: created.amountMinor,
            currencyCode: created.currencyCode,
          }),
        },
      });

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "payment_intent.created",
          aggregateType: "PaymentIntent",
          aggregateId: created.id,
          payloadJson: JSON.stringify({
            id: created.id,
            reference: created.reference,
            amountMinor: created.amountMinor,
            status: created.status,
          }),
        },
      });

      return created;
    }, { maxWait: 15000, timeout: 30000 });

    return intent as unknown as PaymentIntent;
  }

  public async getPaymentIntent(
    userContext: UserContext,
    intentId: string
  ): Promise<any> {
    const { organizationId } = userContext;

    const intent = await this.prismaClient.paymentIntent.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: intentId,
        },
      },
      include: {
        attempts: {
          include: {
            transactions: true,
          },
        },
        sale: true,
      },
    });

    if (!intent) {
      throw new PaymentDomainError("TENANT_MISMATCH", `PaymentIntent '${intentId}' not found.`);
    }

    return intent;
  }

  public async createPaymentAttempt(
    userContext: UserContext,
    intentId: string,
    dto: CreatePaymentAttemptDto
  ): Promise<{ attempt: PaymentAttempt; providerResult: any }> {
    const { organizationId } = userContext;

    if (!dto.idempotencyKey || typeof dto.idempotencyKey !== "string" || dto.idempotencyKey.trim() === "") {
      throw new PaymentDomainError("IDEMPOTENCY_CONFLICT", "Idempotency key is required for payment attempts.");
    }

    if (dto.amountMinor !== undefined) {
      assertSafeIntegerAmount(dto.amountMinor, "amountMinor", 1);
    }

    // Resolve provider first to verify credentials and configuration
    const { provider, config } = await this.providerResolver.resolveProvider(organizationId, dto.provider);

    // Concurrency-safe intent lookup, active capacity reservation, & row lock
    let setupResult: any;
    try {
      setupResult = await this.prismaClient.$transaction(async (tx: any) => {
        // 1. Initial check for existing attempt with this idempotency key
        const existingAttempt = await tx.paymentAttempt.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });

        if (existingAttempt) {
          if (existingAttempt.paymentIntentId !== intentId) {
            throw new PaymentDomainError(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key has already been used with different request parameters.",
              { existingIntentId: existingAttempt.paymentIntentId, requestedIntentId: intentId }
            );
          }

          const requestedAttemptAmount = dto.amountMinor ?? existingAttempt.amountMinor;
          const currentRequestHash = computeCanonicalAttemptHash({
            organizationId,
            paymentIntentId: intentId,
            provider: dto.provider,
            amountMinor: requestedAttemptAmount,
            currencyCode: existingAttempt.currencyCode,
          });

          if (existingAttempt.requestHash && existingAttempt.requestHash !== currentRequestHash) {
            throw new PaymentDomainError(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key has already been used with different request parameters.",
              { existingIntentId: existingAttempt.paymentIntentId, requestedIntentId: intentId }
            );
          }

          return {
            isReplay: true,
            attempt: existingAttempt as unknown as PaymentAttempt,
            intent: null as any,
            currentRequestHash,
          };
        }

        // 2. Lock PaymentIntent row FOR UPDATE
        const lockedIntents: any[] = await tx.$queryRaw`
          SELECT "id", "organizationId", "reference", "amountMinor", "currencyCode", "status", "saleId", "customerId", "expiresAt"
          FROM "PaymentIntent"
          WHERE "organizationId" = ${organizationId}
            AND "id" = ${intentId}
          FOR UPDATE
        `;

        const intent = lockedIntents[0];
        if (!intent) {
          throw new PaymentDomainError("TENANT_MISMATCH", `PaymentIntent '${intentId}' not found.`);
        }

        if (intent.status === "PAID") {
          throw new PaymentDomainError("PAYMENT_INTENT_ALREADY_PAID", "PaymentIntent is already fully paid.");
        }

        if (intent.status === "CANCELLED" || intent.status === "EXPIRED") {
          throw new PaymentDomainError("INVALID_STATE_TRANSITION", `PaymentIntent is already ${intent.status}.`);
        }

        if (new Date() > new Date(intent.expiresAt)) {
          await tx.paymentIntent.update({
            where: { organizationId_id: { organizationId, id: intent.id } },
            data: { status: "EXPIRED" },
          });
          throw new PaymentDomainError("PAYMENT_INTENT_EXPIRED", "PaymentIntent has expired.");
        }

        // Re-check idempotency AFTER acquiring lock (handles race condition between simultaneous identical requests)
        const attemptAfterLock = await tx.paymentAttempt.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });

        if (attemptAfterLock) {
          if (attemptAfterLock.paymentIntentId !== intentId) {
            throw new PaymentDomainError(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key has already been used with different request parameters.",
              { existingIntentId: attemptAfterLock.paymentIntentId, requestedIntentId: intentId }
            );
          }

          const requestedAttemptAmount = dto.amountMinor ?? attemptAfterLock.amountMinor;
          const currentRequestHash = computeCanonicalAttemptHash({
            organizationId,
            paymentIntentId: intentId,
            provider: dto.provider,
            amountMinor: requestedAttemptAmount,
            currencyCode: attemptAfterLock.currencyCode,
          });

          if (attemptAfterLock.requestHash && attemptAfterLock.requestHash !== currentRequestHash) {
            throw new PaymentDomainError(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key has already been used with different request parameters.",
              { existingIntentId: attemptAfterLock.paymentIntentId, requestedIntentId: intentId }
            );
          }

          return {
            isReplay: true,
            attempt: attemptAfterLock as unknown as PaymentAttempt,
            intent: intent as unknown as PaymentIntent,
            currentRequestHash,
          };
        }

        // Active Capacity Reservation Invariant (Section A):
        // CONFIRMED + RESERVED <= PAYMENT_INTENT TOTAL
        // 1. Confirmed amount (status = SUCCEEDED)
        const confirmedResult: any[] = await tx.$queryRaw`
          SELECT coalesce(sum("amountMinor"), 0) as "totalConfirmedMinor"
          FROM "PaymentAttempt"
          WHERE "organizationId" = ${organizationId}
            AND "paymentIntentId" = ${intent.id}
            AND "status" = 'SUCCEEDED'
        `;
        const totalConfirmedMinor = Number(confirmedResult[0]?.totalConfirmedMinor ?? 0);

        // 2. Reserved active amount (status IN ('CREATED', 'PENDING_PROVIDER', 'PROCESSING'))
        const reservedResult: any[] = await tx.$queryRaw`
          SELECT coalesce(sum("amountMinor"), 0) as "totalReservedMinor"
          FROM "PaymentAttempt"
          WHERE "organizationId" = ${organizationId}
            AND "paymentIntentId" = ${intent.id}
            AND "status" IN ('CREATED', 'PENDING_PROVIDER', 'PROCESSING')
        `;
        const totalReservedMinor = Number(reservedResult[0]?.totalReservedMinor ?? 0);

        // 3. Compute available collectible capacity
        const availableMinor = intent.amountMinor - (totalConfirmedMinor + totalReservedMinor);

        if (availableMinor <= 0) {
          throw new PaymentDomainError(
            "AMOUNT_MISMATCH",
            `No collectible amount available on this PaymentIntent: confirmed=${totalConfirmedMinor}, reserved=${totalReservedMinor}, total=${intent.amountMinor}`
          );
        }

        const requestedAttemptAmount = dto.amountMinor ?? availableMinor;
        assertSafeIntegerAmount(requestedAttemptAmount, "amountMinor", 1);

        if (requestedAttemptAmount > availableMinor) {
          throw new PaymentDomainError(
            "AMOUNT_MISMATCH",
            `Requested attempt amount (${requestedAttemptAmount}) exceeds available collectible amount (${availableMinor}). Confirmed: ${totalConfirmedMinor}, Reserved: ${totalReservedMinor}, Intent Total: ${intent.amountMinor}`
          );
        }

        // Compute canonical request hash
        const currentRequestHash = computeCanonicalAttemptHash({
          organizationId,
          paymentIntentId: intent.id,
          provider: dto.provider,
          amountMinor: requestedAttemptAmount,
          currencyCode: intent.currencyCode,
        });

        // 4. Create attempt in PENDING_PROVIDER status (holds capacity reservation)
        const pendingAttempt = await tx.paymentAttempt.create({
          data: {
            organizationId,
            paymentIntentId: intent.id,
            provider: dto.provider,
            amountMinor: requestedAttemptAmount,
            currencyCode: intent.currencyCode,
            status: "PENDING_PROVIDER",
            idempotencyKey: dto.idempotencyKey,
            requestHash: currentRequestHash,
            metadataJson: JSON.stringify(dto.metadata || {}),
          },
        });

        // Advance Intent to PROCESSING if currently REQUIRES_PAYMENT
        if (intent.status === "REQUIRES_PAYMENT") {
          await tx.paymentIntent.update({
            where: { organizationId_id: { organizationId, id: intent.id } },
            data: { status: "PROCESSING" },
          });
        }

        // Audit attempt creation
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: userContext.actorId,
            action: "PAYMENT_ATTEMPT_CREATED",
            resourceType: "PaymentAttempt",
            resourceId: pendingAttempt.id,
            metadataJson: JSON.stringify({
              paymentIntentId: intent.id,
              provider: dto.provider,
              amountMinor: requestedAttemptAmount,
            }),
          },
        });

        return {
          isReplay: false,
          attempt: pendingAttempt as unknown as PaymentAttempt,
          intent: intent as unknown as PaymentIntent,
          currentRequestHash,
        };
      }, { maxWait: 15000, timeout: 30000 });
    } catch (err: any) {
      // Catch unique constraint violation on organizationId_idempotencyKey (concurrent recovery)
      if (
        err.code === "P2002" &&
        (err.meta?.target?.includes("idempotencyKey") || String(err.message).includes("idempotencyKey"))
      ) {
        const existingAttempt = await this.prismaClient.paymentAttempt.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (existingAttempt) {
          const requestedAttemptAmount = dto.amountMinor ?? existingAttempt.amountMinor;
          const currentRequestHash = computeCanonicalAttemptHash({
            organizationId,
            paymentIntentId: intentId,
            provider: dto.provider,
            amountMinor: requestedAttemptAmount,
            currencyCode: existingAttempt.currencyCode,
          });

          if (
            existingAttempt.paymentIntentId !== intentId ||
            (existingAttempt.requestHash && existingAttempt.requestHash !== currentRequestHash)
          ) {
            throw new PaymentDomainError(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key has already been used with different request parameters."
            );
          }

          return {
            attempt: existingAttempt as unknown as PaymentAttempt,
            providerResult: {
              state: existingAttempt.status,
              providerReference: existingAttempt.providerReference,
              idempotentReplay: true,
            },
          };
        }
      }
      throw err;
    }

    if (setupResult.isReplay) {
      return {
        attempt: setupResult.attempt,
        providerResult: {
          state: setupResult.attempt.status,
          providerReference: setupResult.attempt.providerReference,
          idempotentReplay: true,
        },
      };
    }

    const { attempt, intent } = setupResult;

    // Call external provider adapter
    let providerResult: any;
    try {
      providerResult = await provider.createPaymentAttempt(config, intent, attempt);
    } catch (err: any) {
      providerResult = {
        state: "FAILED",
        providerReference: `err_${Date.now()}`,
        providerStatus: "FAILED",
        errorCode: "PROVIDER_ERROR",
        errorMessage: err.message || "Provider call failed",
      };
    }

    // Validate normalized provider financial result (Section E)
    validateProviderAttemptResult(providerResult, attempt);

    // Re-enter database transaction to finalize or update attempt
    const finalAttempt = await this.prismaClient.$transaction(async (tx: any) => {
      const normalizedState: PaymentAttemptStatus = providerResult.state;

      if (normalizedState === "SUCCEEDED") {
        const finalization = await this.finalizationService.finalizeAttemptSuccess(tx, {
          organizationId,
          attemptId: attempt.id,
          provider: dto.provider,
          providerReference: providerResult.providerReference,
          providerStatus: providerResult.providerStatus,
          feeMinor: providerResult.feeMinor,
          netMinor: providerResult.netMinor,
          rawPayload: providerResult.rawResponse,
          actorId: userContext.actorId,
        });
        return finalization.attempt;
      }

      // If FAILED, CANCELLED, etc.
      if (attempt.status !== normalizedState) {
        assertValidPaymentAttemptTransition(attempt.status, normalizedState);
      }

      const updatedAttempt = await tx.paymentAttempt.update({
        where: {
          organizationId_id: {
            organizationId,
            id: attempt.id,
          },
        },
        data: {
          status: normalizedState,
          providerReference: providerResult.providerReference || null,
          errorCode: providerResult.errorCode || null,
          errorMessage: providerResult.errorMessage || null,
        },
      });

      if (providerResult.providerReference) {
        const feeMinor = providerResult.feeMinor ?? 0;
        const netMinor = providerResult.netMinor ?? (attempt.amountMinor - feeMinor);

        await tx.providerTransaction.upsert({
          where: {
            organizationId_provider_providerTransactionId: {
              organizationId,
              provider: dto.provider,
              providerTransactionId: providerResult.providerReference,
            },
          },
          create: {
            organizationId,
            paymentAttemptId: updatedAttempt.id,
            provider: dto.provider,
            providerTransactionId: providerResult.providerReference,
            statusRaw: providerResult.providerStatus || normalizedState,
            feeMinor,
            netMinor,
            rawPayloadJson: JSON.stringify(providerResult.rawResponse || {}),
          },
          update: {
            statusRaw: providerResult.providerStatus || normalizedState,
            feeMinor,
            netMinor,
            rawPayloadJson: JSON.stringify(providerResult.rawResponse || {}),
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: `PAYMENT_ATTEMPT_${normalizedState}`,
          resourceType: "PaymentAttempt",
          resourceId: updatedAttempt.id,
          metadataJson: JSON.stringify({
            paymentIntentId: intent.id,
            provider: dto.provider,
            status: normalizedState,
            errorCode: providerResult.errorCode,
          }),
        },
      });

      return updatedAttempt;
    }, { maxWait: 15000, timeout: 30000 });

    return {
      attempt: finalAttempt as unknown as PaymentAttempt,
      providerResult,
    };
  }

  public async cancelPaymentIntent(
    userContext: UserContext,
    intentId: string
  ): Promise<PaymentIntent> {
    const { organizationId } = userContext;

    return this.prismaClient.$transaction(async (tx: any) => {
      const intent = await tx.paymentIntent.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: intentId,
          },
        },
      });

      if (!intent) {
        throw new PaymentDomainError("TENANT_MISMATCH", `PaymentIntent '${intentId}' not found.`);
      }

      assertValidPaymentIntentTransition(intent.status as any, "CANCELLED");

      const updated = await tx.paymentIntent.update({
        where: { organizationId_id: { organizationId, id: intent.id } },
        data: { status: "CANCELLED" },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "PAYMENT_INTENT_CANCELLED",
          resourceType: "PaymentIntent",
          resourceId: updated.id,
        },
      });

      return updated as unknown as PaymentIntent;
    }, { maxWait: 15000, timeout: 30000 });
  }
}
