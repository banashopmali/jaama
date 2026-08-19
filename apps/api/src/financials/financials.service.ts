import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface CashflowSummary {
  totalSalesMinor: number;
  totalCollectedMinor: number;
  totalOutstandingMinor: number;
  totalExpensesMinor: number;
  netCashflowMinor: number;
  byPaymentMethod: Record<string, number>;
}

@Injectable()
export class FinancialsService {
  /**
   * JAA-S1-14 / JAA-S1-15: Computes authoritative West-African financial ledger & cashflow summary
   */
  public async getCashflowSummary(
    userContext: UserContext,
    startDate?: string,
    endDate?: string,
    prismaClient = defaultPrisma
  ): Promise<CashflowSummary> {
    const organizationId = userContext.organizationId;

    const paymentWhere: any = { organizationId, status: "SUCCESS" };
    const expenseWhere: any = { organizationId };
    const salesWhere: any = { organizationId };

    if (startDate || endDate) {
      paymentWhere.recordedAt = {};
      expenseWhere.occurredAt = {};
      salesWhere.occurredAt = {};

      if (startDate) {
        paymentWhere.recordedAt.gte = new Date(startDate);
        expenseWhere.occurredAt.gte = new Date(startDate);
        salesWhere.occurredAt.gte = new Date(startDate);
      }
      if (endDate) {
        paymentWhere.recordedAt.lte = new Date(endDate);
        expenseWhere.occurredAt.lte = new Date(endDate);
        salesWhere.occurredAt.lte = new Date(endDate);
      }
    }

    const [salesAggregate, payments, expenseAggregate] = await Promise.all([
      prismaClient.sale.aggregate({
        where: salesWhere,
        _sum: { totalMinor: true, paidMinor: true, remainingMinor: true },
      }),
      prismaClient.payment.findMany({
        where: paymentWhere,
        select: { method: true, amountMinor: true },
      }),
      prismaClient.expense.aggregate({
        where: expenseWhere,
        _sum: { amountMinor: true },
      }),
    ]);

    const totalSalesMinor = salesAggregate._sum?.totalMinor || 0;
    const totalCollectedMinor = salesAggregate._sum?.paidMinor || 0;
    const totalOutstandingMinor = salesAggregate._sum?.remainingMinor || 0;
    const totalExpensesMinor = expenseAggregate._sum?.amountMinor || 0;

    const byPaymentMethod: Record<string, number> = {
      ESPECES: 0,
      WAVE: 0,
      ORANGE_MONEY: 0,
      VIREMENT: 0,
      CARTE: 0,
      CREDIT: 0,
    };

    for (const p of payments) {
      if (byPaymentMethod[p.method] !== undefined) {
        byPaymentMethod[p.method] += p.amountMinor;
      } else {
        byPaymentMethod[p.method] = p.amountMinor;
      }
    }

    const netCashflowMinor = totalCollectedMinor - totalExpensesMinor;

    return {
      totalSalesMinor,
      totalCollectedMinor,
      totalOutstandingMinor,
      totalExpensesMinor,
      netCashflowMinor,
      byPaymentMethod,
    };
  }

  /**
   * JAA-S1-15: Helper calculation for West-African VAT (TVA 18% standard rate in UEMOA)
   */
  public computeTvaXof(amountTtcMinor: number, tvaRateFraction = 0.18): {
    htMinor: number;
    tvaMinor: number;
    ttcMinor: number;
  } {
    const htMinor = Math.round(amountTtcMinor / (1 + tvaRateFraction));
    const tvaMinor = amountTtcMinor - htMinor;
    return {
      htMinor,
      tvaMinor,
      ttcMinor: amountTtcMinor,
    };
  }
}
