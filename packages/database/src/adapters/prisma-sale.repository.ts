import { PrismaClient } from "@prisma/client";
import { Sale } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaSaleRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public async findByOrganizationAndId(organizationId: string, id: string): Promise<Sale | null> {
    const sale = await this.db.sale.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id,
        },
      },
      include: {
        lines: true,
        payments: true,
      },
    });

    if (!sale) return null;

    return {
      id: sale.id,
      organizationId: sale.organizationId,
      reference: sale.reference,
      customerId: sale.customerId,
      sellerUserId: sale.sellerUserId,
      lines: sale.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productNameSnapshot: l.productNameSnapshot,
        skuSnapshot: l.skuSnapshot,
        quantity: l.quantity,
        unitPriceMinor: l.unitPriceMinor,
        lineTotalMinor: l.lineTotalMinor,
      })),
      subtotalMinor: sale.subtotalMinor,
      discountMinor: sale.discountMinor,
      totalMinor: sale.totalMinor,
      paidMinor: sale.paidMinor,
      remainingMinor: sale.remainingMinor,
      saleStatus: sale.saleStatus as any,
      paymentStatus: sale.paymentStatus as any,
      occurredAt: sale.occurredAt,
      createdAt: sale.createdAt,
    };
  }

  public async generateNextReference(organizationId: string, tx: PrismaClient = this.db): Promise<string> {
    const count = await tx.sale.count({ where: { organizationId } });
    return `VTE-${String(count + 25).padStart(4, "0")}`;
  }
}
