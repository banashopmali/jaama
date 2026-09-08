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
  assertValidPaymentIntentTransition,
} from "./provider.interface";
import { PaymentProviderRegistry, PaymentProviderResolver } from "./provider-registry";

@Injectable()
export class WebhookEventService {
  constructor(
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly providerResolver: PaymentProviderResolver,
    @Optional() private readonly prismaClient = defaultPrisma
  ) {}

  public async handleWebhook(
    providerType: PaymentProviderType,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
    payload: Record<string, any>
  ): Promise<{ status: string; eventId: string }> {
    const provider = this.providerRegistry.get(providerType);
    if (!provider) {
      throw new PaymentDomainError("PROVIDER_UNAVAILABLE", `Provider '${providerType}' not supported.`);
    }

    const parsedEvent = provider.parseWebhookEvent(payload);
    const eventId = parsedEvent.eventId;

    // Idempotency check: check if event already recorded
    const existingEvent = await this.prismaClient.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: providerType,
          eventId,
        },
      },
    });

    if (existingEvent && existingEvent.status === "PROCESSED") {
      return { status: "ALREADY_PROCESSED", eventId };
    }

    // Locate matching PaymentAttempt by providerReference
    let attempt = await this.prismaClient.paymentAttempt.findFirst({
      where: {
        provider: providerType,
        providerReference: parsedEvent.providerReference,
      },
      include: {
        paymentIntent: true,
      },
    });

    if (!attempt && parsedEvent.rawPayload?.attemptId) {
      attempt = await this.prismaClient.paymentAttempt.findUnique({
        where: { id: String(parsedEvent.rawPayload.attemptId) },
        include: { paymentIntent: true },
      });
    }

    const organizationId = attempt?.organizationId || payload.organizationId || null;

    // Verify signature if organization resolved
    let signatureVerified = false;
    if (organizationId) {
      try {
        const { config } = await this.providerResolver.resolveProvider(organizationId, providerType);
        const secret = config.webhookSecret || "mock_secret_default";
        signatureVerified = await provider.verifyWebhookSignature(headers, rawBody, secret);
      } catch {
        signatureVerified = false;
      }
    } else if (providerType === "mock") {
      signatureVerified = true;
    }

    if (!signatureVerified) {
      await this.prismaClient.webhookEvent.upsert({
        where: {
          provider_eventId: {
            provider: providerType,
            eventId,
          },
        },
        create: {
          provider: providerType,
          eventId,
          eventType: parsedEvent.eventType,
          payloadJson: JSON.stringify(payload),
          headersJson: JSON.stringify(headers),
          signatureVerified: false,
          status: "FAILED",
          errorMessage: "Invalid webhook signature",
          organizationId,
        },
        update: {
          signatureVerified: false,
          status: "FAILED",
          errorMessage: "Invalid webhook signature",
        },
      });

      throw new PaymentDomainError("INVALID_SIGNATURE", "Webhook signature verification failed.");
    }

    // Process event in database transaction
    await this.prismaClient.$transaction(async (tx) => {
      // Record or update WebhookEvent
      await tx.webhookEvent.upsert({
        where: {
          provider_eventId: {
            provider: providerType,
            eventId,
          },
        },
        create: {
          provider: providerType,
          eventId,
          eventType: parsedEvent.eventType,
          payloadJson: JSON.stringify(payload),
          headersJson: JSON.stringify(headers),
          signatureVerified: true,
          status: "PROCESSED",
          processedAt: new Date(),
          organizationId,
        },
        update: {
          signatureVerified: true,
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      if (attempt && attempt.status !== "SUCCEEDED" && attempt.status !== "FAILED") {
        const nextStatus = parsedEvent.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED";
        assertValidPaymentAttemptTransition(attempt.status as any, nextStatus);

        const updatedAttempt = await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: nextStatus,
            providerReference: parsedEvent.providerReference || attempt.providerReference,
          },
        });

        // Record ProviderTransaction
        await tx.providerTransaction.create({
          data: {
            organizationId: attempt.organizationId,
            paymentAttemptId: updatedAttempt.id,
            provider: providerType,
            providerTransactionId: parsedEvent.providerReference || `tx_${Date.now()}`,
            statusRaw: parsedEvent.status,
            feeMinor: parsedEvent.feeMinor || 0,
            netMinor: (parsedEvent.netMinor ?? updatedAttempt.amountMinor),
            rawPayloadJson: JSON.stringify(payload),
          },
        });

        if (nextStatus === "SUCCEEDED") {
          // Check PaymentIntent
          const allAttempts = await tx.paymentAttempt.findMany({
            where: {
              organizationId: attempt.organizationId,
              paymentIntentId: attempt.paymentIntentId,
              status: "SUCCEEDED",
            },
          });
          const totalPaid = allAttempts.reduce((sum, a) => sum + a.amountMinor, 0);
          const newIntentStatus =
            totalPaid >= attempt.paymentIntent.amountMinor ? "PAID" : "PARTIALLY_PAID";

          assertValidPaymentIntentTransition("PROCESSING", newIntentStatus);

          await tx.paymentIntent.update({
            where: { id: attempt.paymentIntentId },
            data: { status: newIntentStatus },
          });

          // If linked to Sale, update internal Payment ledger
          if (attempt.paymentIntent.saleId) {
            const sale = await tx.sale.findUnique({
              where: { id: attempt.paymentIntent.saleId },
              include: { payments: true },
            });

            if (sale) {
              const methodMap: Record<PaymentProviderType, any> = {
                mock: "cash",
                wave: "wave",
                orange_money: "orange_money",
                bank_transfer: "bank_transfer",
                moov_money: "cash",
                mtn_momo: "cash",
              };

              await tx.payment.create({
                data: {
                  organizationId: attempt.organizationId,
                  saleId: sale.id,
                  method: methodMap[providerType] || "cash",
                  amountMinor: updatedAttempt.amountMinor,
                  status: "SUCCESS",
                },
              });

              const updatedPayments = await tx.payment.findMany({
                where: { organizationId: attempt.organizationId, saleId: sale.id },
              });

              const newPaidMinor = calculateAppliedPaidMinor(
                updatedPayments.map((p) => ({ amountMinor: p.amountMinor, status: p.status })),
                sale.totalMinor
              );
              const newRemainingMinor = calculateRemainingMinor(sale.totalMinor, newPaidMinor);
              const newPaymentStatus = derivePaymentStatusFromMinor(sale.totalMinor, newPaidMinor);

              await tx.sale.update({
                where: { id: sale.id },
                data: {
                  paidMinor: newPaidMinor,
                  remainingMinor: newRemainingMinor,
                  paymentStatus: newPaymentStatus,
                },
              });
            }
          }
        }
      }
    });

    return { status: "SUCCESS", eventId };
  }
}
