import * as crypto from "crypto";
import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  UserContext,
  CurrencyCode,
  calculateAppliedPaidMinor,
  calculateRemainingMinor,
  derivePaymentStatusFromMinor,
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
} from "./provider.interface";
import { PaymentProviderResolver } from "./provider-registry";

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

function mapProviderToPaymentMethod(provider: PaymentProviderType): "cash" | "wave" | "orange_money" | "bank_transfer" | "card" {
  switch (provider) {
    case "wave":
      return "wave";
    case "orange_money":
      return "orange_money";
    case "bank_transfer":
      return "bank_transfer";
    case "mock":
    case "moov_money":
    case "mtn_momo":
    default:
      return "cash";
  }
}

@Injectable()
export class PaymentIntentService {
  constructor(
    private readonly providerResolver: PaymentProviderResolver,
    @Optional() private readonly prismaClient = defaultPrisma
  ) {}

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

    const intent = await this.prismaClient.$transaction(async (tx) => {
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
    });

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

    // Concurrency-safe intent lookup & PostgreSQL row lock (SELECT ... FOR UPDATE)
    const setupResult = await this.prismaClient.$transaction(async (tx) => {
      // 1. First check if attempt already exists for this idempotency key
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

      // 2. Not a replay: lock PaymentIntent row
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

      // Calculate total succeeded amount to prevent overcollection
      const succeededAttemptsResult: any[] = await tx.$queryRaw`
        SELECT coalesce(sum("amountMinor"), 0) as "totalSucceededMinor"
        FROM "PaymentAttempt"
        WHERE "organizationId" = ${organizationId}
          AND "paymentIntentId" = ${intent.id}
          AND "status" = 'SUCCEEDED'
      `;
      const totalSucceededMinor = Number(succeededAttemptsResult[0]?.totalSucceededMinor ?? 0);
      const remainingMinor = intent.amountMinor - totalSucceededMinor;

      if (remainingMinor <= 0) {
        throw new PaymentDomainError("PAYMENT_INTENT_ALREADY_PAID", "No remaining collectible balance on this PaymentIntent.");
      }

      const requestedAttemptAmount = dto.amountMinor ?? remainingMinor;
      assertSafeIntegerAmount(requestedAttemptAmount, "amountMinor", 1);

      if (requestedAttemptAmount > remainingMinor) {
        throw new PaymentDomainError(
          "AMOUNT_MISMATCH",
          `Requested attempt amount (${requestedAttemptAmount}) exceeds remaining collectible amount (${remainingMinor}).`
        );
      }

      // Compute canonical request hash for strict idempotency binding
      const currentRequestHash = computeCanonicalAttemptHash({
        organizationId,
        paymentIntentId: intent.id,
        provider: dto.provider,
        amountMinor: requestedAttemptAmount,
        currencyCode: intent.currencyCode,
      });

      // Create PaymentAttempt in CREATED status
      const attempt = await tx.paymentAttempt.create({
        data: {
          organizationId,
          paymentIntentId: intent.id,
          provider: dto.provider,
          amountMinor: requestedAttemptAmount,
          currencyCode: intent.currencyCode,
          status: "CREATED",
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

      // Advance Attempt to PENDING_PROVIDER
      assertValidPaymentAttemptTransition(attempt.status, "PENDING_PROVIDER");
      const pendingAttempt = await tx.paymentAttempt.update({
        where: { organizationId_id: { organizationId, id: attempt.id } },
        data: { status: "PENDING_PROVIDER" },
      });

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
    });

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

    // Re-enter database transaction to advance attempt and update financial ledger
    const finalAttempt = await this.prismaClient.$transaction(async (tx) => {
      const normalizedState: PaymentAttemptStatus = providerResult.state;
      if (attempt.status !== normalizedState) {
        assertValidPaymentAttemptTransition(attempt.status, normalizedState);
      }

      let createdPaymentId: string | null = null;

      if (normalizedState === "SUCCEEDED") {
        // Re-lock PaymentIntent row to guarantee no concurrent overcollection
        const lockedIntentCheck: any[] = await tx.$queryRaw`
          SELECT "id", "amountMinor"
          FROM "PaymentIntent"
          WHERE "organizationId" = ${organizationId}
            AND "id" = ${intent.id}
          FOR UPDATE
        `;

        const succeededSoFar: any[] = await tx.$queryRaw`
          SELECT coalesce(sum("amountMinor"), 0) as "totalSucceededMinor"
          FROM "PaymentAttempt"
          WHERE "organizationId" = ${organizationId}
            AND "paymentIntentId" = ${intent.id}
            AND "status" = 'SUCCEEDED'
        `;
        const currentConfirmedMinor = Number(succeededSoFar[0]?.totalSucceededMinor ?? 0);

        if (currentConfirmedMinor + attempt.amountMinor > lockedIntentCheck[0].amountMinor) {
          throw new PaymentDomainError(
            "AMOUNT_MISMATCH",
            `Concurrent confirmation would overcollect intent total: confirmed=${currentConfirmedMinor}, attempt=${attempt.amountMinor}, total=${lockedIntentCheck[0].amountMinor}`
          );
        }

        // DOMAIN INVARIANT: PAYMENT_ATTEMPT != PAYMENT & SALE != PAYMENT
        // Create internal Payment ledger row exactly once if linked to a Sale
        if (intent.saleId) {
          const sale = await tx.sale.findUnique({
            where: {
              organizationId_id: {
                organizationId,
                id: intent.saleId,
              },
            },
            include: { payments: true },
          });

          if (sale) {
            const internalPayment = await tx.payment.create({
              data: {
                organizationId,
                saleId: sale.id,
                method: mapProviderToPaymentMethod(dto.provider),
                amountMinor: attempt.amountMinor,
                status: "SUCCESS",
              },
            });
            createdPaymentId = internalPayment.id;

            // Recalculate Sale financial state
            const updatedPayments = await tx.payment.findMany({
              where: { organizationId, saleId: sale.id },
            });

            const newPaidMinor = calculateAppliedPaidMinor(
              updatedPayments.map((p) => ({ amountMinor: p.amountMinor, status: p.status })),
              sale.totalMinor
            );
            const newRemainingMinor = calculateRemainingMinor(sale.totalMinor, newPaidMinor);
            const newPaymentStatus = derivePaymentStatusFromMinor(sale.totalMinor, newPaidMinor);

            await tx.sale.update({
              where: { organizationId_id: { organizationId, id: sale.id } },
              data: {
                paidMinor: newPaidMinor,
                remainingMinor: newRemainingMinor,
                paymentStatus: newPaymentStatus,
              },
            });
          }
        }

        // Update PaymentIntent status
        const newTotalConfirmed = currentConfirmedMinor + attempt.amountMinor;
        const newIntentStatus =
          newTotalConfirmed >= lockedIntentCheck[0].amountMinor ? "PAID" : "PARTIALLY_PAID";

        await tx.paymentIntent.update({
          where: { organizationId_id: { organizationId, id: intent.id } },
          data: { status: newIntentStatus },
        });
      }

      // Update attempt status and link to internal payment (enforcing 1-to-1 unique linkage)
      const updatedAttempt = await tx.paymentAttempt.update({
        where: {
          organizationId_id: {
            organizationId,
            id: attempt.id,
          },
        },
        data: {
          status: normalizedState,
          paymentId: createdPaymentId,
          providerReference: providerResult.providerReference || null,
          errorCode: providerResult.errorCode || null,
          errorMessage: providerResult.errorMessage || null,
        },
      });

      // Record ProviderTransaction if provider returned a reference
      if (providerResult.providerReference) {
        const feeMinor = providerResult.feeMinor ?? 0;
        const netMinor = providerResult.netMinor ?? (attempt.amountMinor - feeMinor);

        await tx.providerTransaction.create({
          data: {
            organizationId,
            paymentAttemptId: updatedAttempt.id,
            provider: dto.provider,
            providerTransactionId: providerResult.providerReference,
            statusRaw: providerResult.providerStatus || normalizedState,
            feeMinor,
            netMinor,
            rawPayloadJson: JSON.stringify(providerResult.rawResponse || {}),
          },
        });
      }

      // Emit Audit & Outbox events
      if (normalizedState === "SUCCEEDED") {
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: userContext.actorId,
            action: "PAYMENT_ATTEMPT_SUCCEEDED",
            resourceType: "PaymentAttempt",
            resourceId: updatedAttempt.id,
            metadataJson: JSON.stringify({
              paymentIntentId: intent.id,
              amountMinor: updatedAttempt.amountMinor,
              provider: dto.provider,
              providerReference: providerResult.providerReference,
              paymentId: createdPaymentId,
            }),
          },
        });

        await tx.outboxEvent.create({
          data: {
            organizationId,
            eventType: "payment_attempt.succeeded",
            aggregateType: "PaymentAttempt",
            aggregateId: updatedAttempt.id,
            payloadJson: JSON.stringify({
              attemptId: updatedAttempt.id,
              intentId: intent.id,
              amountMinor: updatedAttempt.amountMinor,
              provider: dto.provider,
              providerReference: providerResult.providerReference,
              paymentId: createdPaymentId,
            }),
          },
        });
      } else {
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
      }

      return updatedAttempt;
    });

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

    return this.prismaClient.$transaction(async (tx) => {
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
    });
  }
}
