import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface AnomalyReport {
  salesTotalDiscrepancies: any[];
  paymentsDiscrepancies: any[];
  inventoryDiscrepancies: any[];
  purchasesDiscrepancies: any[];
  hasAnomalies: boolean;
  checkedAt: string;
}

@Injectable()
export class ReconciliationService {
  public async runDiagnosticCheck(
    userContext: UserContext,
    prismaClient = defaultPrisma
  ): Promise<AnomalyReport> {
    const organizationId = userContext.organizationId;

    const [sales, inventoryBalances, purchases] = await Promise.all([
      prismaClient.sale.findMany({
        where: { organizationId },
        include: { lines: true, payments: true },
      }),
      prismaClient.inventoryBalance.findMany({
        where: { organizationId },
        include: { product: true },
      }),
      prismaClient.purchase.findMany({
        where: { organizationId },
        include: { lines: true, receivings: { include: { lines: true } } },
      }),
    ]);

    const salesTotalDiscrepancies: any[] = [];
    const paymentsDiscrepancies: any[] = [];
    const inventoryDiscrepancies: any[] = [];
    const purchasesDiscrepancies: any[] = [];

    // 1. Verify Sale Totals vs Lines sum & Payments sum
    for (const sale of sales) {
      const calculatedSubtotal = sale.lines.reduce((sum, l) => sum + l.lineTotalMinor, 0);
      const expectedTotal = calculatedSubtotal - sale.discountMinor;

      if (sale.totalMinor !== expectedTotal) {
        salesTotalDiscrepancies.push({
          saleId: sale.id,
          reference: sale.reference,
          storedTotal: sale.totalMinor,
          calculatedTotal: expectedTotal,
        });
      }

      const calculatedPaid = sale.payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + p.amountMinor, 0);

      if (sale.paidMinor !== calculatedPaid) {
        paymentsDiscrepancies.push({
          saleId: sale.id,
          reference: sale.reference,
          storedPaid: sale.paidMinor,
          calculatedPaid,
        });
      }
    }

    // 2. Verify Inventory Balances vs Movements
    const movements = await prismaClient.stockMovement.findMany({
      where: { organizationId },
    });

    const movementSumByProduct = new Map<string, number>();
    for (const m of movements) {
      const current = movementSumByProduct.get(m.productId) || 0;
      movementSumByProduct.set(m.productId, current + m.quantityDelta);
    }

    for (const ib of inventoryBalances) {
      const calculatedAvailable = movementSumByProduct.get(ib.productId) || 0;
      if (ib.availableQuantity !== calculatedAvailable) {
        inventoryDiscrepancies.push({
          productId: ib.productId,
          productName: ib.product?.name,
          storedAvailable: ib.availableQuantity,
          calculatedFromMovements: calculatedAvailable,
        });
      }
    }

    // 3. Verify Purchases received vs Receivings lines
    for (const pur of purchases) {
      for (const line of pur.lines) {
        const receivedFromLog = pur.receivings
          .flatMap((r) => r.lines)
          .filter((rl) => rl.productId === line.productId)
          .reduce((sum, rl) => sum + rl.quantityReceived, 0);

        if (line.receivedQuantity !== receivedFromLog) {
          purchasesDiscrepancies.push({
            purchaseId: pur.id,
            reference: pur.reference,
            productId: line.productId,
            storedReceivedQuantity: line.receivedQuantity,
            calculatedFromReceivings: receivedFromLog,
          });
        }
      }
    }

    const hasAnomalies =
      salesTotalDiscrepancies.length > 0 ||
      paymentsDiscrepancies.length > 0 ||
      inventoryDiscrepancies.length > 0 ||
      purchasesDiscrepancies.length > 0;

    return {
      salesTotalDiscrepancies,
      paymentsDiscrepancies,
      inventoryDiscrepancies,
      purchasesDiscrepancies,
      hasAnomalies,
      checkedAt: new Date().toISOString(),
    };
  }
}
