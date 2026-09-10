import * as crypto from "crypto";
import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  PaymentProviderType,
  PaymentDomainError,
  assertValidPaymentAttemptTransition,
} from "./provider.interface";
import { PaymentProviderResolver } from "./provider-registry";
import { PaymentFinalizationService } from "./payment-finalization.service";

@Injectable()
export class WebhookEventService {
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

    // 2. Canonical payload hash for strict idempotency fingerprinting
    const bodyBuffer =
      typeof rawBody === "string"
        ? Buffer.from(rawBody, "utf8")
        : Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength);
    const payloadHash = crypto.createHash("sha256").update(bodyBuffer).digest("hex");

    // 3. Cryptographic Signature Verification using RAW request bytes
    const signatureVerified = await provider.verifyWebhookSignature(
      headers,
      rawBody,
      webhookSecret
    );

    if (!signatureVerified) {
      const rawEventId = payload.id ?? payload.eventId;
      if (!rawEventId || typeof rawEventId !== "string" || rawEventId.trim() === "") {
        // Section F: Do NOT manufacture fake provider event IDs with Date.now().
        // Log a security AuditEvent with incident details instead.
        const actor = await this.prismaClient.membership.findFirst({
          where: { organizationId, status: "active" },
          select: { userId: true },
        });
        if (actor?.userId) {
          await this.prismaClient.auditEvent.create({
            data: {
              organizationId,
              actorId: actor.userId,
              action: "SECURITY_WEBHOOK_INVALID_SIGNATURE",
              resourceType: "WebhookEndpoint",
              resourceId: webhookEndpointKey,
              metadataJson: JSON.stringify({
                provider: providerType,
                headers,
                payloadHash,
              }),
            },
          });
        }
        throw new PaymentDomainError("INVALID_SIGNATURE", "Webhook signature verification failed.");
      }

      await this.prismaClient.webhookEvent.upsert({
        where: {
          organizationId_provider_eventId: {
            organizationId,
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
          payloadHash,
          headersJson: JSON.stringify(headers),
          signatureVerified: false,
          status: "FAILED",
          errorMessage: "Invalid cryptographic signature on raw body",
        },
        update: {
          signatureVerified: false,
          status: "FAILED",
          payloadHash,
          errorMessage: "Invalid cryptographic signature on raw body",
        },
      });

      throw new PaymentDomainError("INVALID_SIGNATURE", "Webhook signature verification failed.");
    }

    // 4. Parse and strictly validate payload
    const parsedEvent = provider.parseWebhookEvent(payload);
    const eventId = parsedEvent.eventId;

    // 5. Tenant-scoped Idempotency Check with Canonical Hash (Section F)
    const existingEvent = await this.prismaClient.webhookEvent.findUnique({
      where: {
        organizationId_provider_eventId: {
          organizationId,
          provider: providerType,
          eventId,
        },
      },
    });

    if (existingEvent) {
      // Same event ID + DIFFERENT payload hash => reject as webhook idempotency conflict
      if (existingEvent.payloadHash && existingEvent.payloadHash !== payloadHash) {
        throw new PaymentDomainError(
          "IDEMPOTENCY_CONFLICT",
          `Webhook idempotency conflict: eventId '${eventId}' received with different payload hash.`
        );
      }

      // Same event ID + SAME payload hash => ALREADY_PROCESSED replay
      if (existingEvent.status === "PROCESSED") {
        return { status: "ALREADY_PROCESSED", eventId };
      }
    }

    // 6. Look up PaymentAttempt strictly within the verified tenant
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
      await this.prismaClient.webhookEvent.upsert({
        where: {
          organizationId_provider_eventId: {
            organizationId,
            provider: providerType,
            eventId,
          },
        },
        create: {
          organizationId,
          provider: providerType,
          eventId,
          eventType: parsedEvent.eventType,
          payloadJson: JSON.stringify(payload),
          payloadHash,
          headersJson: JSON.stringify(headers),
          signatureVerified: true,
          status: "FAILED",
          errorMessage: `No tenant attempt matching providerReference '${parsedEvent.providerReference}'`,
        },
        update: {
          status: "FAILED",
          payloadHash,
          errorMessage: `No tenant attempt matching providerReference '${parsedEvent.providerReference}'`,
        },
      });

      throw new PaymentDomainError(
        "TENANT_MISMATCH",
        `PaymentAttempt with reference '${parsedEvent.providerReference}' does not belong to organization '${organizationId}'.`
      );
    }

    // 7. Enforce financial invariants before state changes
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

    // 8. Repeated PENDING/PROCESSING webhook state for already identical state is a safe no-op
    if (
      attempt.status === parsedEvent.status &&
      (parsedEvent.status === "PENDING_PROVIDER" || parsedEvent.status === "PROCESSING")
    ) {
      return { status: "ALREADY_PROCESSED", eventId };
    }

    // 9. Atomic transaction: record WebhookEvent, finalize or update PaymentAttempt
    await this.prismaClient.$transaction(async (tx: any) => {
      await tx.webhookEvent.upsert({
        where: {
          organizationId_provider_eventId: {
            organizationId,
            provider: providerType,
            eventId,
          },
        },
        create: {
          organizationId,
          provider: providerType,
          eventId,
          eventType: parsedEvent.eventType,
          payloadJson: JSON.stringify(payload),
          payloadHash,
          headersJson: JSON.stringify(headers),
          signatureVerified: true,
          status: "PROCESSED",
          processedAt: new Date(),
        },
        update: {
          signatureVerified: true,
          status: "PROCESSED",
          payloadHash,
          processedAt: new Date(),
        },
      });

      const targetStatus = parsedEvent.status;

      if (targetStatus === "SUCCEEDED") {
        await this.finalizationService.finalizeAttemptSuccess(tx, {
          organizationId,
          attemptId: attempt.id,
          provider: providerType,
          providerReference: parsedEvent.providerReference,
          providerStatus: parsedEvent.status,
          feeMinor: parsedEvent.feeMinor,
          netMinor: parsedEvent.netMinor,
          rawPayload: payload,
        });
      } else if (
        attempt.status !== "SUCCEEDED" &&
        attempt.status !== "FAILED" &&
        attempt.status !== "CANCELLED" &&
        attempt.status !== "EXPIRED"
      ) {
        assertValidPaymentAttemptTransition(attempt.status, targetStatus);

        await tx.paymentAttempt.update({
          where: { organizationId_id: { organizationId, id: attempt.id } },
          data: {
            status: targetStatus,
            providerReference: parsedEvent.providerReference || attempt.providerReference,
          },
        });

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
      }
    }, { maxWait: 15000, timeout: 30000 });

    return { status: "SUCCESS", eventId };
  }
}
