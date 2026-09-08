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

    if (dto.totalAmountMinor <= 0) {
      throw new PaymentDomainError("AMOUNT_MISMATCH", "Settlement amount must be positive.");
    }

    const created = await this.prismaClient.settlement.create({
      data: {
        organizationId,
        provider: dto.provider,
        reference: dto.reference,
        currencyCode: dto.currencyCode || "XOF",
        totalAmountMinor: dto.totalAmountMinor,
        feeAmountMinor: dto.feeAmountMinor || 0,
        status: "PENDING",
      },
    });

    await this.prismaClient.auditEvent.create({
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
        }),
      },
    });

    return created as unknown as Settlement;
  }

  public async updateSettlementStatus(
    userContext: UserContext,
    settlementId: string,
    toStatus: SettlementStatus,
    settledAmountMinor?: number
  ): Promise<Settlement> {
    const { organizationId } = userContext;

    const settlement = await this.prismaClient.settlement.findUnique({
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

    assertValidSettlementTransition(settlement.status as any, toStatus);

    const updated = await this.prismaClient.settlement.update({
      where: {
        organizationId_id: {
          organizationId,
          id: settlementId,
        },
      },
      data: {
        status: toStatus,
        settledAmountMinor:
          settledAmountMinor !== undefined ? settledAmountMinor : settlement.settledAmountMinor,
        settledAt: toStatus === "SETTLED" || toStatus === "RECONCILED" ? new Date() : settlement.settledAt,
      },
    });

    await this.prismaClient.auditEvent.create({
      data: {
        organizationId,
        actorId: userContext.actorId,
        action: "SETTLEMENT_STATUS_UPDATED",
        resourceType: "Settlement",
        resourceId: updated.id,
        metadataJson: JSON.stringify({ from: settlement.status, to: toStatus }),
      },
    });

    return updated as unknown as Settlement;
  }

  public async reconcileRecord(
    userContext: UserContext,
    dto: ReconcileTransactionDto
  ): Promise<ReconciliationRecord> {
    const { organizationId } = userContext;

    // Verify ProviderTransaction
    const providerTx = await this.prismaClient.providerTransaction.findUnique({
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

    let status: PaymentReconciliationStatus = "MATCHED";
    let discrepancyType: string | null = null;

    if (dto.paymentId) {
      const payment = await this.prismaClient.payment.findUnique({
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
      } else if (payment.amountMinor !== providerTx.netMinor + providerTx.feeMinor) {
        status = "DISCREPANCY_AMOUNT";
        discrepancyType = "AMOUNT_MISMATCH_LEDGER_VS_PROVIDER";
      }
    }

    const record = await this.prismaClient.reconciliationRecord.create({
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
        }),
      },
    });

    return record as unknown as ReconciliationRecord;
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
