import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext, CurrencyCode } from "@jaama/types";
import {
  Settlement,
  SettlementStatus,
  ReconciliationRecord,
  PaymentReconciliationStatus,
  PaymentProviderType,
  PaymentDomainError,
  assertSafeIntegerAmount,
  assertValidSettlementTransition,
} from "./provider.interface";

export interface CreateSettlementDto {
  provider: PaymentProviderType;
  reference: string;
  totalAmountMinor: number;
  currencyCode?: CurrencyCode;
  feeAmountMinor?: number;
}

export interface ReconcileTransactionDto {
  provider: PaymentProviderType;
  providerTransactionId: string;
  paymentId?: string;
  settlementId?: string;
}

@Injectable()
export class SettlementService {
  constructor(@Optional() private readonly prismaClient = defaultPrisma) {}

  public async createSettlement(
    userContext: UserContext,
    dto: CreateSettlementDto
  ): Promise<Settlement> {
    const { organizationId } = userContext;

    assertSafeIntegerAmount(dto.totalAmountMinor, "totalAmountMinor", 1);
    const feeAmountMinor = dto.feeAmountMinor ?? 0;
    assertSafeIntegerAmount(feeAmountMinor, "feeAmountMinor", 0, dto.totalAmountMinor);

    return this.prismaClient.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          organizationId,
          provider: dto.provider,
          reference: dto.reference,
          currencyCode: dto.currencyCode || "XOF",
          totalAmountMinor: dto.totalAmountMinor,
          feeAmountMinor,
          status: "PENDING",
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "SETTLEMENT_CREATED",
          resourceType: "Settlement",
          resourceId: created.id,
          metadataJson: JSON.stringify({
            provider: created.provider,
            reference: created.reference,
            totalAmountMinor: created.totalAmountMinor,
            feeAmountMinor: created.feeAmountMinor,
          }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "settlement.created",
          aggregateType: "Settlement",
          aggregateId: created.id,
          payloadJson: JSON.stringify({
            id: created.id,
            provider: created.provider,
            reference: created.reference,
            totalAmountMinor: created.totalAmountMinor,
            status: created.status,
          }),
        },
      });

      return created as unknown as Settlement;
    });
  }

  public async updateSettlementStatus(
    userContext: UserContext,
    settlementId: string,
    toStatus: SettlementStatus,
    settledAmountMinor?: number
  ): Promise<Settlement> {
    const { organizationId } = userContext;

    return this.prismaClient.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: settlementId,
          },
        },
      });

      if (!settlement) {
        throw new PaymentDomainError("TENANT_MISMATCH", `Settlement '${settlementId}' not found.`);
      }

      assertValidSettlementTransition(settlement.status as SettlementStatus, toStatus);

      let finalSettledAmount = settlement.settledAmountMinor;
      if (settledAmountMinor !== undefined) {
        assertSafeIntegerAmount(settledAmountMinor, "settledAmountMinor", 0, settlement.totalAmountMinor);
        finalSettledAmount = settledAmountMinor;
      }

      // Check monetary compatibility with status
      if (toStatus === "SETTLED" && finalSettledAmount < settlement.totalAmountMinor) {
        throw new PaymentDomainError(
          "AMOUNT_MISMATCH",
          `Cannot mark settlement SETTLED when settled amount (${finalSettledAmount}) is less than total amount (${settlement.totalAmountMinor}).`
        );
      }

      const updated = await tx.settlement.update({
        where: {
          organizationId_id: {
            organizationId,
            id: settlementId,
          },
        },
        data: {
          status: toStatus,
          settledAmountMinor: finalSettledAmount,
          settledAt:
            toStatus === "SETTLED" || toStatus === "RECONCILED"
              ? new Date()
              : settlement.settledAt,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "SETTLEMENT_STATUS_UPDATED",
          resourceType: "Settlement",
          resourceId: updated.id,
          metadataJson: JSON.stringify({
            from: settlement.status,
            to: toStatus,
            settledAmountMinor: finalSettledAmount,
          }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "settlement.status_updated",
          aggregateType: "Settlement",
          aggregateId: updated.id,
          payloadJson: JSON.stringify({
            id: updated.id,
            status: updated.status,
            settledAmountMinor: updated.settledAmountMinor,
          }),
        },
      });

      return updated as unknown as Settlement;
    });
  }

  public async reconcileRecord(
    userContext: UserContext,
    dto: ReconcileTransactionDto
  ): Promise<ReconciliationRecord> {
    const { organizationId } = userContext;

    return this.prismaClient.$transaction(async (tx) => {
      // 1. Verify ProviderTransaction
      const providerTx = await tx.providerTransaction.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: dto.providerTransactionId,
          },
        },
      });

      if (!providerTx) {
        throw new PaymentDomainError(
          "TENANT_MISMATCH",
          `ProviderTransaction '${dto.providerTransactionId}' not found.`
        );
      }

      // Reconciliation status is NEVER assumed MATCHED by default
      let status: PaymentReconciliationStatus;
      let discrepancyType: string | null = null;

      // 2. Validate internal Payment
      if (!dto.paymentId) {
        status = "UNMATCHED_INTERNAL";
        discrepancyType = "MISSING_INTERNAL_PAYMENT";
      } else {
        const payment = await tx.payment.findUnique({
          where: {
            organizationId_id: {
              organizationId,
              id: dto.paymentId,
            },
          },
        });

        if (!payment) {
          status = "UNMATCHED_INTERNAL";
          discrepancyType = "INTERNAL_PAYMENT_NOT_FOUND";
        } else if (providerTx.provider !== dto.provider) {
          status = "DISCREPANCY_STATUS";
          discrepancyType = "PROVIDER_MISMATCH";
        } else if (payment.amountMinor !== providerTx.netMinor + providerTx.feeMinor) {
          status = "DISCREPANCY_AMOUNT";
          discrepancyType = "AMOUNT_MISMATCH_LEDGER_VS_PROVIDER";
        } else if (payment.status !== "SUCCESS") {
          status = "DISCREPANCY_STATUS";
          discrepancyType = "PAYMENT_NOT_SUCCESS";
        } else {
          // If settlement supplied, verify its consistency
          if (dto.settlementId) {
            const settlement = await tx.settlement.findUnique({
              where: {
                organizationId_id: {
                  organizationId,
                  id: dto.settlementId,
                },
              },
            });

            if (!settlement) {
              status = "DISCREPANCY_STATUS";
              discrepancyType = "SETTLEMENT_NOT_FOUND";
            } else if (settlement.provider !== dto.provider) {
              status = "DISCREPANCY_STATUS";
              discrepancyType = "SETTLEMENT_PROVIDER_MISMATCH";
            } else {
              status = "MATCHED";
            }
          } else {
            status = "MATCHED";
          }
        }
      }

      const record = await tx.reconciliationRecord.create({
        data: {
          organizationId,
          provider: dto.provider,
          providerTransactionId: providerTx.id,
          paymentId: dto.paymentId || null,
          settlementId: dto.settlementId || null,
          status,
          discrepancyType,
          detailsJson: JSON.stringify({
            providerTxId: providerTx.id,
            paymentId: dto.paymentId,
            settlementId: dto.settlementId,
            status,
            discrepancyType,
          }),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "RECONCILIATION_RECORDED",
          resourceType: "ReconciliationRecord",
          resourceId: record.id,
          metadataJson: JSON.stringify({
            status: record.status,
            discrepancyType: record.discrepancyType,
            providerTxId: providerTx.id,
          }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "reconciliation.recorded",
          aggregateType: "ReconciliationRecord",
          aggregateId: record.id,
          payloadJson: JSON.stringify({
            id: record.id,
            status: record.status,
            discrepancyType: record.discrepancyType,
          }),
        },
      });

      return record as unknown as ReconciliationRecord;
    });
  }

  public async listSettlements(userContext: UserContext): Promise<Settlement[]> {
    const { organizationId } = userContext;
    const settlements = await this.prismaClient.settlement.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return settlements as unknown as Settlement[];
  }
}
