import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface SalesReport {
  period: { startDate?: string; endDate?: string };
  totalSalesCount: number;
  grossRevenueMinor: number;
  totalDiscountMinor: number;
  netRevenueMinor: number;
  totalPaidMinor: number;
  totalOutstandingMinor: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    totalQuantity: number;
    totalRevenueMinor: number;
  }>;
}

@Injectable()
export class ReportsService {
  /**
   * JAA-S1-17: Sales & Business Analytics Reporting Engine
   */
  public async getSalesReport(
    userContext: UserContext,
    startDate?: string,
    endDate?: string,
    prismaClient = defaultPrisma
  ): Promise<SalesReport> {
    const organizationId = userContext.organizationId;
    const where: any = { organizationId };

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate);
      if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    const [salesAggregate, saleLines] = await Promise.all([
      prismaClient.sale.aggregate({
        where,
        _count: { id: true },
        _sum: {
          subtotalMinor: true,
          discountMinor: true,
          totalMinor: true,
          paidMinor: true,
          remainingMinor: true,
        },
      }),
      prismaClient.saleLine.findMany({
        where: { organizationId, sale: where },
        select: {
          productId: true,
          productNameSnapshot: true,
          skuSnapshot: true,
          quantity: true,
          lineTotalMinor: true,
        },
      }),
    ]);

    // Aggregate top products
    const productStatsMap = new Map<string, { productName: string; sku: string; totalQuantity: number; totalRevenueMinor: number }>();

    for (const line of saleLines) {
      const existing = productStatsMap.get(line.productId) || {
        productName: line.productNameSnapshot,
        sku: line.skuSnapshot,
        totalQuantity: 0,
        totalRevenueMinor: 0,
      };
      existing.totalQuantity += line.quantity;
      existing.totalRevenueMinor += line.lineTotalMinor;
      productStatsMap.set(line.productId, existing);
    }

    const topSellingProducts = Array.from(productStatsMap.entries())
      .map(([productId, stats]) => ({
        productId,
        productName: stats.productName,
        sku: stats.sku,
        totalQuantity: stats.totalQuantity,
        totalRevenueMinor: stats.totalRevenueMinor,
      }))
      .sort((a, b) => b.totalRevenueMinor - a.totalRevenueMinor)
      .slice(0, 10);

    return {
      period: { startDate, endDate },
      totalSalesCount: salesAggregate._count.id || 0,
      grossRevenueMinor: salesAggregate._sum.subtotalMinor || 0,
      totalDiscountMinor: salesAggregate._sum.discountMinor || 0,
      netRevenueMinor: salesAggregate._sum.totalMinor || 0,
      totalPaidMinor: salesAggregate._sum.paidMinor || 0,
      totalOutstandingMinor: salesAggregate._sum.remainingMinor || 0,
      topSellingProducts,
    };
  }

  /**
   * JAA-S1-18: Stock Movement Auditing & Anomaly Detection
   */
  public async auditStockAnomalies(
    userContext: UserContext,
    prismaClient = defaultPrisma
  ): Promise<{ anomaliesCount: number; anomalies: any[] }> {
    const organizationId = userContext.organizationId;

    const balances = await prismaClient.inventoryBalance.findMany({
      where: {
        organizationId,
        availableQuantity: { lt: 0 },
      },
      include: {
        product: { select: { name: true, sku: true } },
      },
    });

    const anomalies = balances.map((b) => ({
      type: "NEGATIVE_STOCK",
      productId: b.productId,
      sku: b.product.sku,
      productName: b.product.name,
      availableQuantity: b.availableQuantity,
      severity: "CRITICAL",
    }));

    return {
      anomaliesCount: anomalies.length,
      anomalies,
    };
  }
}
