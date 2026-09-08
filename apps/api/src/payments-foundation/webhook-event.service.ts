import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  calculateAppliedPaidMinor,
  calculateRemainingMinor,
  derivePaymentStatusFromMinor,
} from "@jaama/types";
import {
  PaymentProviderType,
  PaymentDomainError,
  assertValidPaymentAttemptTransition,
} from "./provider.interface";
import { PaymentProviderResolver } from "./provider-registry";

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
export class WebhookEventService {
  constructor(
    private readonly providerResolver: PaymentProviderResolver,
    @Optional() private readonly prismaClient = defaultPrisma
  ) {}

  public async handleWebhook(
    providerType: PaymentProviderType,
    webhookEndpointKey: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Uint8Array,
    payload: Record<string, any>
  ): Promise<{ status: string; eventId: string }> {
    // 1. Deterministic Tenant & Provider Config Resolution (NEVER trust payload.organizationId)
    const { provider, config } = await this.providerResolver.resolveByWebhookEndpoint(
      providerType,
      webhookEndpointKey
    );
    const organizationId = config.organizationId;
    const webhookSecret = config.webhookSecret;

    if (!webhookSecret) {
      throw new PaymentDomainError(
        "UNAUTHORIZED_PROVIDER_ACTION",
        "Provider webhook secret is not configured"
      );
    }

    // 2. Cryptographic Signature Verification using RAW request bytes
    const signatureVerified = await provider.verifyWebhookSignature(
      headers,
      rawBody,
      webhookSecret
    );

    if (!signatureVerified) {
      // Record failed event for security audit
      const rawEventId = payload.id ?? payload.eventId ?? `unverified_${Date.now()}`;
      await this.prismaClient.webhookEvent.upsert({
        where: {
          provider_eventId: {
            provider: providerType,
            eventId: String(rawEventId),
          },
        },
        create: {
          organizationId,
          provider: providerType,
          eventId: String(rawEventId),
          eventType: String(payload.type || payload.eventType || "unknown"),
          payloadJson: JSON.stringify(payload),
          headersJson: JSON.stringify(headers),
          signatureVerified: false,
          status: "FAILED",
          errorMessage: "Invalid cryptographic signature on raw body",
        },
        update: {
          signatureVerified: false,
          status: "FAILED",
          errorMessage: "Invalid cryptographic signature on raw body",
        },
      });

      throw new PaymentDomainError("INVALID_SIGNATURE", "Webhook signature verification failed.");
    }

    // 3. Parse and strictly validate payload
    const parsedEvent = provider.parseWebhookEvent(payload);
    const eventId = parsedEvent.eventId;

    // 4. Idempotency Check scoped to provider & tenant
    const existingEvent = await this.prismaClient.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: providerType,
          eventId,
        },
      },
    });

    if (existingEvent) {
      if (existingEvent.organizationId && existingEvent.organizationId !== organizationId) {
        throw new PaymentDomainError(
          "TENANT_MISMATCH",
          "Cross-tenant webhook event collision detected."
        );
      }
      if (existingEvent.status === "PROCESSED") {
        return { status: "ALREADY_PROCESSED", eventId };
      }
    }

    // 5. Look up PaymentAttempt strictly within the verified tenant
    const attempt = await this.prismaClient.paymentAttempt.findFirst({
      where: {
        organizationId,
        provider: providerType,
        providerReference: parsedEvent.providerReference,
      },
      include: {
        paymentIntent: true,
      },
    });

    if (!attempt) {
      // Malformed or cross-tenant attempt reference
      await this.prismaClient.webhookEvent.upsert({
        where: { provider_eventId: { provider: providerType, eventId } },
        create: {
          organizationId,
          provider: providerType,
          eventId,
          eventType: parsedEvent.eventType,
          payloadJson: JSON.stringify(payload),
          headersJson: JSON.stringify(headers),
          signatureVerified: true,
          status: "FAILED",
          errorMessage: `No tenant attempt matching providerReference '${parsedEvent.providerReference}'`,
        },
        update: {
          status: "FAILED",
          errorMessage: `No tenant attempt matching providerReference '${parsedEvent.providerReference}'`,
        },
      });

      throw new PaymentDomainError(
        "TENANT_MISMATCH",
        `PaymentAttempt with reference '${parsedEvent.providerReference}' does not belong to organization '${organizationId}'.`
      );
    }

    // 6. Enforce financial invariants before any state changes
    if (parsedEvent.currencyCode !== attempt.currencyCode) {
      await this.prismaClient.reconciliationRecord.create({
        data: {
          organizationId,
          provider: providerType,
          providerTransactionId: null,
          status: "DISCREPANCY_STATUS",
          discrepancyType: "CURRENCY_MISMATCH",
          detailsJson: JSON.stringify({
            providerReference: parsedEvent.providerReference,
            expectedCurrency: attempt.currencyCode,
            webhookCurrency: parsedEvent.currencyCode,
            attemptId: attempt.id,
          }),
        },
      });

      throw new PaymentDomainError(
        "CURRENCY_MISMATCH",
        `Webhook currency (${parsedEvent.currencyCode}) does not match attempt currency (${attempt.currencyCode}).`
      );
    }

    if (parsedEvent.amountMinor !== attempt.amountMinor) {
      await this.prismaClient.reconciliationRecord.create({
        data: {
          organizationId,
          provider: providerType,
          providerTransactionId: null,
          status: "DISCREPANCY_AMOUNT",
          discrepancyType: "AMOUNT_MISMATCH_WEBHOOK_VS_ATTEMPT",
          detailsJson: JSON.stringify({
            providerReference: parsedEvent.providerReference,
            expectedAmountMinor: attempt.amountMinor,
            webhookAmountMinor: parsedEvent.amountMinor,
            attemptId: attempt.id,
          }),
        },
      });

      throw new PaymentDomainError(
        "AMOUNT_MISMATCH",
        `Webhook amount (${parsedEvent.amountMinor}) does not match expected attempt amount (${attempt.amountMinor}).`
      );
    }

    // 7. Atomic transaction: update WebhookEvent, PaymentAttempt, Payment, and PaymentIntent
    await this.prismaClient.$transaction(async (tx) => {
      // Record WebhookEvent
      await tx.webhookEvent.upsert({
        where: { provider_eventId: { provider: providerType, eventId } },
        create: {
          organizationId,
          provider: providerType,
          eventId,
          eventType: parsedEvent.eventType,
          payloadJson: JSON.stringify(payload),
          headersJson: JSON.stringify(headers),
          signatureVerified: true,
          status: "PROCESSED",
          processedAt: new Date(),
        },
        update: {
          signatureVerified: true,
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      const targetStatus = parsedEvent.status;

      // Only transition if not already in terminal state
      if (attempt.status !== "SUCCEEDED" && attempt.status !== "FAILED" && attempt.status !== "CANCELLED" && attempt.status !== "EXPIRED") {
        assertValidPaymentAttemptTransition(attempt.status, targetStatus);

        let internalPaymentId: string | null = null;

        if (targetStatus === "SUCCEEDED") {
          // Row lock PaymentIntent to prevent concurrent overcollection
          const lockedIntents: any[] = await tx.$queryRaw`
            SELECT "id", "amountMinor"
            FROM "PaymentIntent"
            WHERE "organizationId" = ${organizationId}
              AND "id" = ${attempt.paymentIntentId}
            FOR UPDATE
          `;

          const succeededAttemptsResult: any[] = await tx.$queryRaw`
            SELECT coalesce(sum("amountMinor"), 0) as "totalSucceededMinor"
            FROM "PaymentAttempt"
            WHERE "organizationId" = ${organizationId}
              AND "paymentIntentId" = ${attempt.paymentIntentId}
              AND "status" = 'SUCCEEDED'
          `;
          const currentTotalSucceeded = Number(succeededAttemptsResult[0]?.totalSucceededMinor ?? 0);

          if (currentTotalSucceeded + attempt.amountMinor > lockedIntents[0].amountMinor) {
            throw new PaymentDomainError(
              "AMOUNT_MISMATCH",
              "Webhook confirmation would overcollect PaymentIntent total amount"
            );
          }

          // DOMAIN INVARIANT: PAYMENT_ATTEMPT != PAYMENT & SALE != PAYMENT
          // Create internal Payment ledger row if linked to Sale (and ensure 1-to-1 linkage)
          if (attempt.paymentIntent.saleId) {
            const sale = await tx.sale.findUnique({
              where: {
                organizationId_id: {
                  organizationId,
                  id: attempt.paymentIntent.saleId,
                },
              },
              include: { payments: true },
            });

            if (sale) {
              const newPayment = await tx.payment.create({
                data: {
                  organizationId,
                  saleId: sale.id,
                  method: mapProviderToPaymentMethod(providerType),
                  amountMinor: attempt.amountMinor,
                  status: "SUCCESS",
                },
              });
              internalPaymentId = newPayment.id;

              // Recalculate Sale financials
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

          // Advance Intent status
          const newTotalPaid = currentTotalSucceeded + attempt.amountMinor;
          const newIntentStatus =
            newTotalPaid >= lockedIntents[0].amountMinor ? "PAID" : "PARTIALLY_PAID";

          await tx.paymentIntent.update({
            where: { organizationId_id: { organizationId, id: attempt.paymentIntentId } },
            data: { status: newIntentStatus },
          });
        }

        // Update PaymentAttempt
        await tx.paymentAttempt.update({
          where: { organizationId_id: { organizationId, id: attempt.id } },
          data: {
            status: targetStatus,
            paymentId: internalPaymentId,
            providerReference: parsedEvent.providerReference || attempt.providerReference,
          },
        });

        // Record or update ProviderTransaction
        await tx.providerTransaction.upsert({
          where: {
            organizationId_provider_providerTransactionId: {
              organizationId,
              provider: providerType,
              providerTransactionId: parsedEvent.providerReference,
            },
          },
          create: {
            organizationId,
            paymentAttemptId: attempt.id,
            provider: providerType,
            providerTransactionId: parsedEvent.providerReference,
            statusRaw: parsedEvent.status,
            feeMinor: parsedEvent.feeMinor || 0,
            netMinor: parsedEvent.netMinor ?? (attempt.amountMinor - (parsedEvent.feeMinor || 0)),
            rawPayloadJson: JSON.stringify(payload),
          },
          update: {
            statusRaw: parsedEvent.status,
            feeMinor: parsedEvent.feeMinor || 0,
            netMinor: parsedEvent.netMinor ?? (attempt.amountMinor - (parsedEvent.feeMinor || 0)),
            rawPayloadJson: JSON.stringify(payload),
          },
        });

        // Audit & Outbox
        const actor = await tx.membership.findFirst({
          where: { organizationId, status: "active" },
          select: { userId: true },
        });

        if (actor?.userId) {
          await tx.auditEvent.create({
            data: {
              organizationId,
              actorId: actor.userId,
              action: `PAYMENT_ATTEMPT_${targetStatus}`,
              resourceType: "PaymentAttempt",
              resourceId: attempt.id,
              metadataJson: JSON.stringify({
                provider: providerType,
                eventId,
                providerReference: parsedEvent.providerReference,
                status: targetStatus,
              }),
            },
          });
        }

        if (targetStatus === "SUCCEEDED") {
          await tx.outboxEvent.create({
            data: {
              organizationId,
              eventType: "payment_attempt.succeeded",
              aggregateType: "PaymentAttempt",
              aggregateId: attempt.id,
              payloadJson: JSON.stringify({
                attemptId: attempt.id,
                paymentIntentId: attempt.paymentIntentId,
                amountMinor: attempt.amountMinor,
                provider: providerType,
                providerReference: parsedEvent.providerReference,
              }),
            },
          });
        }
      }
    });

    return { status: "SUCCESS", eventId };
  }
}
