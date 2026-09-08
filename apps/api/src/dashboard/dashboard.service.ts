import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

@Injectable()
export class DashboardService {
  public async getSummary(
    userContext: UserContext,
    period: "today" | "7d" | "30d" = "today",
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const now = new Date();
    const startDate = new Date();

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(now.getDate() - 30);
    }

    const [
      salesAgg,
      previousSalesAgg,
      receivablesAgg,
      lowStockCount,
      outOfStockCount,
      recentSales,
      expenseAgg,
    ] = await Promise.all([
      // Current Period Sales
      prismaClient.sale.aggregate({
        where: {
          organizationId,
          occurredAt: { gte: startDate },
          saleStatus: "COMPLETED",
        },
        _sum: { totalMinor: true, paidMinor: true, remainingMinor: true },
        _count: { id: true },
      }),
      // Previous Period Sales for trend calculation
      prismaClient.sale.aggregate({
        where: {
          organizationId,
          occurredAt: {
            gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())),
            lt: startDate,
          },
          saleStatus: "COMPLETED",
        },
        _sum: { totalMinor: true },
      }),
      // Total Outstanding Receivables
      prismaClient.sale.aggregate({
        where: {
          organizationId,
          remainingMinor: { gt: 0 },
          saleStatus: "COMPLETED",
        },
        _sum: { remainingMinor: true },
        _count: { id: true },
      }),
      // Low stock count (1 to 5)
      prismaClient.product.count({
        where: {
          organizationId,
          status: "active",
          inventoryBalances: {
            some: { availableQuantity: { gt: 0, lte: 5 } },
          },
        },
      }),
      // Out of stock count (<= 0)
      prismaClient.product.count({
        where: {
          organizationId,
          status: "active",
          inventoryBalances: {
            some: { availableQuantity: { lte: 0 } },
          },
        },
      }),
      // Recent Sales List
      prismaClient.sale.findMany({
        where: { organizationId },
        include: { customer: { select: { name: true } }, lines: true },
        orderBy: { occurredAt: "desc" },
        take: 5,
      }),
      // Period Expenses
      prismaClient.expense.aggregate({
        where: {
          organizationId,
          occurredAt: { gte: startDate },
        },
        _sum: { amountMinor: true },
      }),
    ]);

    const totalSalesMinor = salesAgg._sum.totalMinor || 0;
    const previousSalesMinor = previousSalesAgg._sum.totalMinor || 0;
    const growthPercent =
      previousSalesMinor > 0
        ? Math.round(((totalSalesMinor - previousSalesMinor) / previousSalesMinor) * 100)
        : 0;

    return {
      period,
      metrics: {
        totalSalesMinor,
        salesCount: salesAgg._count.id,
        collectedMinor: salesAgg._sum.paidMinor || 0,
        periodOutstandingMinor: salesAgg._sum.remainingMinor || 0,
        totalOutstandingMinor: receivablesAgg._sum.remainingMinor || 0,
        totalExpensesMinor: expenseAgg._sum.amountMinor || 0,
        netCashflowMinor: (salesAgg._sum.paidMinor || 0) - (expenseAgg._sum.amountMinor || 0),
        growthPercent,
        lowStockCount,
        outOfStockCount,
      },
      recentSales,
    };
  }
}
