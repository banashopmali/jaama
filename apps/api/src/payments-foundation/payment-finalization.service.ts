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

export interface FinalizeAttemptSuccessParams {
  organizationId: string;
  attemptId: string;
  provider: PaymentProviderType;
  providerReference: string;
  providerStatus?: string;
  feeMinor?: number;
  netMinor?: number;
  rawPayload?: Record<string, unknown>;
  actorId?: string;
}

export interface FinalizeAttemptResult {
  alreadyFinalized: boolean;
  attempt: any;
  paymentId: string | null;
}

export function mapProviderToPaymentMethod(
  provider: PaymentProviderType
): "cash" | "wave" | "orange_money" | "bank_transfer" | "card" {
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
export class PaymentFinalizationService {
  constructor(@Optional() private readonly prismaClient = defaultPrisma) {}

  /**
   * Authoritative, exactly-once payment attempt success finalization.
   * Shared by both synchronous provider confirmation and asynchronous webhook processing.
   *
   * Enforces:
   * 1. Row lock on PaymentAttempt FOR UPDATE
   * 2. Atomic check for already SUCCEEDED => idempotent return, zero new Payment rows
   * 3. Row lock on PaymentIntent FOR UPDATE + overcollection check
   * 4. Source uniqueness on Payment.sourcePaymentAttemptId (backed by DB unique index)
   * 5. Atomically links PaymentAttempt.paymentId
   * 6. Recalculates Sale financials if linked
   * 7. Transitions PaymentIntent to PAID or PARTIALLY_PAID
   * 8. Upserts ProviderTransaction
   * 9. Emits AuditEvent and OutboxEvent
   */
  public async finalizeAttemptSuccess(
    tx: any,
    params: FinalizeAttemptSuccessParams
  ): Promise<FinalizeAttemptResult> {
    const { organizationId, attemptId } = params;

    // 1. Row lock PaymentAttempt FOR UPDATE
    const lockedAttempts: any[] = await tx.$queryRaw`
      SELECT "id", "organizationId", "paymentIntentId", "provider", "amountMinor", "currencyCode", "status", "paymentId", "providerReference"
      FROM "PaymentAttempt"
      WHERE "organizationId" = ${organizationId}
        AND "id" = ${attemptId}
      FOR UPDATE
    `;

    const attempt = lockedAttempts[0];
    if (!attempt) {
      throw new PaymentDomainError("TENANT_MISMATCH", `PaymentAttempt '${attemptId}' not found.`);
    }

    // 2. Atomic check: if already SUCCEEDED, return idempotently
    if (attempt.status === "SUCCEEDED") {
      let existingPayment = null;
      if (attempt.paymentId) {
        existingPayment = await tx.payment.findUnique({
          where: {
            organizationId_id: {
              organizationId,
              id: attempt.paymentId,
            },
          },
        });
      }
      return {
        alreadyFinalized: true,
        attempt,
        paymentId: existingPayment?.id ?? attempt.paymentId ?? null,
      };
    }

    // 3. State transition assertion
    assertValidPaymentAttemptTransition(attempt.status, "SUCCEEDED");

    // 4. Row lock PaymentIntent FOR UPDATE
    const lockedIntents: any[] = await tx.$queryRaw`
      SELECT "id", "organizationId", "amountMinor", "status", "saleId"
      FROM "PaymentIntent"
      WHERE "organizationId" = ${organizationId}
        AND "id" = ${attempt.paymentIntentId}
      FOR UPDATE
    `;

    const intent = lockedIntents[0];
    if (!intent) {
      throw new PaymentDomainError(
        "TENANT_MISMATCH",
        `PaymentIntent '${attempt.paymentIntentId}' not found.`
      );
    }

    // 5. Compute confirmed amount and guard against overcollection
    const confirmedResult: any[] = await tx.$queryRaw`
      SELECT coalesce(sum("amountMinor"), 0) as "totalConfirmedMinor"
      FROM "PaymentAttempt"
      WHERE "organizationId" = ${organizationId}
        AND "paymentIntentId" = ${intent.id}
        AND "status" = 'SUCCEEDED'
    `;
    const currentConfirmedMinor = Number(confirmedResult[0]?.totalConfirmedMinor ?? 0);

    if (currentConfirmedMinor + attempt.amountMinor > intent.amountMinor) {
      throw new PaymentDomainError(
        "AMOUNT_MISMATCH",
        `Confirmation would overcollect PaymentIntent total amount: confirmed=${currentConfirmedMinor}, attempt=${attempt.amountMinor}, total=${intent.amountMinor}`
      );
    }

    // 6. Exactly-once Payment ledger creation with database source uniqueness
    let internalPayment = await tx.payment.findUnique({
      where: {
        organizationId_sourcePaymentAttemptId: {
          organizationId,
          sourcePaymentAttemptId: attempt.id,
        },
      },
    });

    if (!internalPayment && intent.saleId) {
      const sale = await tx.sale.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: intent.saleId,
          },
        },
      });

      if (sale) {
        internalPayment = await tx.payment.create({
          data: {
            organizationId,
            saleId: sale.id,
            method: mapProviderToPaymentMethod(params.provider),
            amountMinor: attempt.amountMinor,
            status: "SUCCESS",
            sourcePaymentAttemptId: attempt.id,
          },
        });

        // Recalculate Sale financials
        const updatedPayments = await tx.payment.findMany({
          where: { organizationId, saleId: sale.id },
        });

        const newPaidMinor = calculateAppliedPaidMinor(
          updatedPayments.map((p: any) => ({ amountMinor: p.amountMinor, status: p.status })),
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

    // 7. Advance PaymentIntent status
    const newTotalConfirmed = currentConfirmedMinor + attempt.amountMinor;
    const newIntentStatus = newTotalConfirmed >= intent.amountMinor ? "PAID" : "PARTIALLY_PAID";

    await tx.paymentIntent.update({
      where: { organizationId_id: { organizationId, id: intent.id } },
      data: { status: newIntentStatus },
    });

    // 8. Update PaymentAttempt status and link to internal payment
    const updatedAttempt = await tx.paymentAttempt.update({
      where: { organizationId_id: { organizationId, id: attempt.id } },
      data: {
        status: "SUCCEEDED",
        paymentId: internalPayment?.id ?? attempt.paymentId ?? null,
        providerReference: params.providerReference || attempt.providerReference,
        errorCode: null,
        errorMessage: null,
      },
    });

    // 9. Upsert ProviderTransaction
    if (params.providerReference) {
      const feeMinor = params.feeMinor ?? 0;
      const netMinor = params.netMinor ?? (attempt.amountMinor - feeMinor);

      await tx.providerTransaction.upsert({
        where: {
          organizationId_provider_providerTransactionId: {
            organizationId,
            provider: params.provider,
            providerTransactionId: params.providerReference,
          },
        },
        create: {
          organizationId,
          paymentAttemptId: attempt.id,
          provider: params.provider,
          providerTransactionId: params.providerReference,
          statusRaw: params.providerStatus || "SUCCEEDED",
          feeMinor,
          netMinor,
          rawPayloadJson: JSON.stringify(params.rawPayload || {}),
        },
        update: {
          statusRaw: params.providerStatus || "SUCCEEDED",
          feeMinor,
          netMinor,
          rawPayloadJson: JSON.stringify(params.rawPayload || {}),
        },
      });
    }

    // 10. Emit AuditEvent and OutboxEvent
    let actorId = params.actorId;
    if (!actorId) {
      const actor = await tx.membership.findFirst({
        where: { organizationId, status: "active" },
        select: { userId: true },
      });
      actorId = actor?.userId;
    }

    if (actorId) {
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId,
          action: "PAYMENT_ATTEMPT_SUCCEEDED",
          resourceType: "PaymentAttempt",
          resourceId: updatedAttempt.id,
          metadataJson: JSON.stringify({
            paymentIntentId: intent.id,
            amountMinor: updatedAttempt.amountMinor,
            provider: params.provider,
            providerReference: params.providerReference,
            paymentId: internalPayment?.id,
          }),
        },
      });
    }

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
          provider: params.provider,
          providerReference: params.providerReference,
          paymentId: internalPayment?.id,
        }),
      },
    });

    return {
      alreadyFinalized: false,
      attempt: updatedAttempt,
      paymentId: internalPayment?.id ?? null,
    };
  }
}
