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
  PaymentDomainError,
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

    if (!dto.amountMinor || dto.amountMinor <= 0) {
      throw new PaymentDomainError("AMOUNT_MISMATCH", "PaymentIntent amount must be strictly positive.", {
        amountMinor: dto.amountMinor,
      });
    }

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
          amountMinor: Math.round(dto.amountMinor),
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

    if (!dto.idempotencyKey) {
      throw new PaymentDomainError("IDEMPOTENCY_CONFLICT", "Idempotency key is required for payment attempts.");
    }

    // Idempotency check: check if attempt already exists for this tenant & idempotencyKey
    const existingAttempt = await this.prismaClient.paymentAttempt.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
      include: {
        transactions: true,
      },
    });

    if (existingAttempt) {
      return {
        attempt: existingAttempt as unknown as PaymentAttempt,
        providerResult: { idempotentReplay: true, status: existingAttempt.status },
      };
    }

    // Resolve provider and verify tenant configuration
    const { provider, config } = await this.providerResolver.resolveProvider(organizationId, dto.provider);

    // Concurrency-safe intent lookup & lock
    const result = await this.prismaClient.$transaction(async (tx) => {
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

      if (intent.status === "PAID") {
        throw new PaymentDomainError("PAYMENT_INTENT_ALREADY_PAID", "PaymentIntent is already PAID.");
      }

      if (new Date() > intent.expiresAt) {
        if (intent.status !== "EXPIRED") {
          await tx.paymentIntent.update({
            where: { organizationId_id: { organizationId, id: intent.id } },
            data: { status: "EXPIRED" },
          });
        }
        throw new PaymentDomainError("PAYMENT_INTENT_EXPIRED", "PaymentIntent has expired.");
      }

      // Assert transition to PROCESSING
      assertValidPaymentIntentTransition(intent.status as any, "PROCESSING");

      const attemptAmountMinor = dto.amountMinor || intent.amountMinor;
      if (attemptAmountMinor <= 0) {
        throw new PaymentDomainError("AMOUNT_MISMATCH", "Attempt amount must be positive.");
      }

      // Create PaymentAttempt in CREATED status
      const attempt = await tx.paymentAttempt.create({
        data: {
          organizationId,
          paymentIntentId: intent.id,
          provider: dto.provider,
          amountMinor: attemptAmountMinor,
          currencyCode: intent.currencyCode,
          status: "CREATED",
          idempotencyKey: dto.idempotencyKey,
          metadataJson: JSON.stringify(dto.metadata || {}),
        },
      });

      // Advance Intent to PROCESSING
      await tx.paymentIntent.update({
        where: { organizationId_id: { organizationId, id: intent.id } },
        data: { status: "PROCESSING" },
      });

      // Advance Attempt to PENDING_PROVIDER
      assertValidPaymentAttemptTransition(attempt.status as any, "PENDING_PROVIDER");
      const pendingAttempt = await tx.paymentAttempt.update({
        where: { organizationId_id: { organizationId, id: attempt.id } },
        data: { status: "PENDING_PROVIDER" },
      });

      return {
        intent: intent as unknown as PaymentIntent,
        attempt: pendingAttempt as unknown as PaymentAttempt,
      };
    });

    // Execute provider call outside database lock
    let providerResult: any;
    try {
      providerResult = await provider.createPaymentAttempt(config, result.intent, result.attempt);
    } catch (err: any) {
      providerResult = {
        success: false,
        providerReference: `err_${Date.now()}`,
        providerStatus: "FAILED",
        errorCode: "PROVIDER_ERROR",
        errorMessage: err.message || "Provider call failed",
      };
    }

    // Re-enter database transaction to finalize attempt and internal ledger
    const finalAttempt = await this.prismaClient.$transaction(async (tx) => {
      const nextStatus = providerResult.success ? "SUCCEEDED" : "FAILED";
      assertValidPaymentAttemptTransition(result.attempt.status, nextStatus);

      const updatedAttempt = await tx.paymentAttempt.update({
        where: {
          organizationId_id: {
            organizationId,
            id: result.attempt.id,
          },
        },
        data: {
          status: nextStatus,
          providerReference: providerResult.providerReference || null,
          errorCode: providerResult.errorCode || null,
          errorMessage: providerResult.errorMessage || null,
        },
      });

      // Record ProviderTransaction (external transaction != internal payment)
      if (providerResult.providerReference) {
        const feeMinor = providerResult.rawResponse?.feeMinor || 0;
        await tx.providerTransaction.create({
          data: {
            organizationId,
            paymentAttemptId: updatedAttempt.id,
            provider: dto.provider,
            providerTransactionId: providerResult.providerReference,
            statusRaw: providerResult.providerStatus || nextStatus,
            feeMinor,
            netMinor: updatedAttempt.amountMinor - feeMinor,
            rawPayloadJson: JSON.stringify(providerResult.rawResponse || {}),
          },
        });
      }

      if (providerResult.success) {
        // Evaluate PaymentIntent status
        const allSucceededAttempts = await tx.paymentAttempt.findMany({
          where: {
            organizationId,
            paymentIntentId: result.intent.id,
            status: "SUCCEEDED",
          },
        });

        const totalSucceededMinor = allSucceededAttempts.reduce(
          (sum, a) => sum + a.amountMinor,
          0
        );

        const newIntentStatus =
          totalSucceededMinor >= result.intent.amountMinor ? "PAID" : "PARTIALLY_PAID";

        assertValidPaymentIntentTransition("PROCESSING", newIntentStatus);

        await tx.paymentIntent.update({
          where: {
            organizationId_id: {
              organizationId,
              id: result.intent.id,
            },
          },
          data: { status: newIntentStatus },
        });

        // DOMAIN INVARIANT: PAYMENT_ATTEMPT != PAYMENT & SALE != PAYMENT
        // Create internal Payment record only when payment attempt succeeds on a linked Sale
        if (result.intent.saleId) {
          const sale = await tx.sale.findUnique({
            where: {
              organizationId_id: {
                organizationId,
                id: result.intent.saleId,
              },
            },
            include: { payments: true },
          });

          if (sale) {
            // Map provider to internal PaymentMethod
            const methodMapping: Record<PaymentProviderType, any> = {
              mock: "cash",
              wave: "wave",
              orange_money: "orange_money",
              bank_transfer: "bank_transfer",
              moov_money: "cash",
              mtn_momo: "cash",
            };

            await tx.payment.create({
              data: {
                organizationId,
                saleId: sale.id,
                method: methodMapping[dto.provider] || "cash",
                amountMinor: updatedAttempt.amountMinor,
                status: "SUCCESS",
              },
            });

            // Re-fetch updated payments and recalculate Sale financial state
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

        // Audit Event
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: userContext.actorId,
            action: "PAYMENT_ATTEMPT_SUCCEEDED",
            resourceType: "PaymentAttempt",
            resourceId: updatedAttempt.id,
            metadataJson: JSON.stringify({
              paymentIntentId: result.intent.id,
              amountMinor: updatedAttempt.amountMinor,
              provider: dto.provider,
              providerReference: providerResult.providerReference,
            }),
          },
        });

        // Outbox Event
        await tx.outboxEvent.create({
          data: {
            organizationId,
            eventType: "payment_attempt.succeeded",
            aggregateType: "PaymentAttempt",
            aggregateId: updatedAttempt.id,
            payloadJson: JSON.stringify({
              attemptId: updatedAttempt.id,
              intentId: result.intent.id,
              amountMinor: updatedAttempt.amountMinor,
              provider: dto.provider,
              providerReference: providerResult.providerReference,
            }),
          },
        });
      } else {
        // Failed attempt audit
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: userContext.actorId,
            action: "PAYMENT_ATTEMPT_FAILED",
            resourceType: "PaymentAttempt",
            resourceId: updatedAttempt.id,
            metadataJson: JSON.stringify({
              paymentIntentId: result.intent.id,
              provider: dto.provider,
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
