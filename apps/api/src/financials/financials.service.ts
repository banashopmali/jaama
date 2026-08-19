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
   * Computes authoritative financial ledger & cashflow summary using canonical payment method keys.
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
      cash: 0,
      wave: 0,
      orange_money: 0,
      bank_transfer: 0,
      card: 0,
    };

    for (const p of payments) {
      const key = p.method ? String(p.method).toLowerCase() : "cash";
      if (byPaymentMethod[key] !== undefined) {
        byPaymentMethod[key] += p.amountMinor;
      } else {
        byPaymentMethod[key] = p.amountMinor;
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
}
