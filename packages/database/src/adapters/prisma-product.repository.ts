import { PrismaClient } from "@prisma/client";
import { Product } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaProductRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public async findByOrganizationAndId(organizationId: string, id: string): Promise<Product | null> {
    const product = await this.db.product.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id,
        },
      },
    });

    if (!product) return null;

    return {
      id: product.id,
      organizationId: product.organizationId,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unitPriceMinor: product.unitPriceMinor,
      costMinor: product.costMinor,
      currencyCode: (product.currencyCode as any) || "XOF",
      status: product.status as "active" | "inactive" | "archived",
      barcode: product.barcode,
      lowStockThreshold: product.lowStockThreshold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  public async listActiveByOrganization(organizationId: string): Promise<Product[]> {
    const products = await this.db.product.findMany({
      where: {
        organizationId,
        status: "active",
      },
      orderBy: { name: "asc" },
    });

    return products.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitPriceMinor: p.unitPriceMinor,
      costMinor: p.costMinor,
      currencyCode: (p.currencyCode as any) || "XOF",
      status: p.status as "active" | "inactive" | "archived",
      barcode: p.barcode,
      lowStockThreshold: p.lowStockThreshold,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }
}
