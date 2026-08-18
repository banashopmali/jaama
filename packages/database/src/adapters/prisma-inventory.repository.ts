import { PrismaClient } from "@prisma/client";
import { InventoryBalance } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaInventoryRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public async getBalance(organizationId: string, productId: string): Promise<InventoryBalance | null> {
    const balance = await this.db.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId,
          productId,
        },
      },
    });

    if (!balance) return null;

    return {
      id: balance.id,
      organizationId: balance.organizationId,
      productId: balance.productId,
      availableQuantity: balance.availableQuantity,
      reservedQuantity: balance.reservedQuantity,
      updatedAt: balance.updatedAt,
    };
  }

  /**
   * Atomic stock decrement inside PostgreSQL enforcing non-negative availableQuantity.
   */
  public async decrementAvailableQuantity(
    organizationId: string,
    productId: string,
    requestedQuantity: number,
    tx: PrismaClient = this.db
  ): Promise<void> {
    const updatedCount = await tx.$executeRaw`
      UPDATE "InventoryBalance"
      SET "availableQuantity" = "availableQuantity" - ${requestedQuantity},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "organizationId" = ${organizationId}
        AND "productId" = ${productId}
        AND "availableQuantity" >= ${requestedQuantity}
    `;

    if (updatedCount === 0) {
      throw new Error(`Stock disponible insuffisant pour le produit (id: ${productId}).`);
    }
  }
}
