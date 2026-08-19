import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { InventoryBalance, StockMovement, StockMovementType, UserContext } from "@jaama/types";

export interface RecordStockAdjustmentDto {
  productId: string;
  movementType: StockMovementType;
  quantityDelta: number;
  reference?: string;
}

export interface ListInventoryQuery {
  status?: "normal" | "low" | "out_of_stock";
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InventoryService {
  public async recordAdjustment(
    userContext: UserContext,
    dto: RecordStockAdjustmentDto,
    prismaClient = defaultPrisma
  ): Promise<{ balance: InventoryBalance; movement: StockMovement }> {
    const organizationId = userContext.organizationId;
    const { productId, movementType, quantityDelta, reference } = dto;

    if (!productId) {
      throw new BadRequestException("L'identifiant du produit est obligatoire.");
    }
    if (!movementType) {
      throw new BadRequestException("Le type de mouvement de stock est obligatoire.");
    }
    if (quantityDelta === undefined || quantityDelta === 0) {
      throw new BadRequestException("La quantité de mouvement doit être différente de zéro.");
    }

    return prismaClient.$transaction(async (tx) => {
      // 1. Verify Product exists in org
      const product = await tx.product.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: productId,
          },
        },
      });

      if (!product) {
        throw new NotFoundException("Produit introuvable ou n'appartient pas à votre organisation.");
      }

      // 2. Fetch or initialize balance
      let balance = await tx.inventoryBalance.findUnique({
        where: {
          organizationId_productId: {
            organizationId,
            productId,
          },
        },
      });

      if (!balance) {
        balance = await tx.inventoryBalance.create({
          data: {
            organizationId,
            productId,
            availableQuantity: 0,
            reservedQuantity: 0,
          },
        });
      }

      // Compute actual delta based on movement type
      let actualDelta = quantityDelta;
      if (
        movementType === "SALE_OUT" ||
        movementType === "ADJUSTMENT_OUT" ||
        movementType === "RETURN_OUT"
      ) {
        actualDelta = -Math.abs(quantityDelta);
      } else {
        actualDelta = Math.abs(quantityDelta);
      }

      // Check negative stock prevention (P0 invariant)
      const newAvailable = balance.availableQuantity + actualDelta;
      if (newAvailable < 0) {
        throw new BadRequestException(
          `Stock insuffisant. Quantité disponible actuelle : ${balance.availableQuantity}, ajustement demandé : ${actualDelta}. Le stock ne peut pas être négatif.`
        );
      }

      // 3. Update Balance atomically using raw SQL or optimistic check
      const updatedCount = await tx.$executeRaw`
        UPDATE "InventoryBalance"
        SET "availableQuantity" = "availableQuantity" + ${actualDelta}
        WHERE "organizationId" = ${organizationId}
          AND "productId" = ${productId}
          AND ("availableQuantity" + ${actualDelta}) >= 0
      `;

      if (updatedCount === 0) {
        throw new BadRequestException("Échec de l'ajustement du stock (concurrence ou stock négatif).");
      }

      const updatedBalance = await tx.inventoryBalance.findUniqueOrThrow({
        where: {
          organizationId_productId: {
            organizationId,
            productId,
          },
        },
      });

      // 4. Create Movement Record
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          productId,
          movementType,
          quantityDelta: actualDelta,
          reference: reference || `AJUSTEMENT-${movementType}`,
        },
      });

      // 5. Audit & Outbox
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "inventory.adjust",
          resourceType: "inventory",
          resourceId: productId,
          metadataJson: JSON.stringify({
            movementType,
            quantityDelta: actualDelta,
            newAvailableQuantity: updatedBalance.availableQuantity,
          }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "InventoryAdjusted",
          aggregateType: "InventoryBalance",
          aggregateId: updatedBalance.id,
          payloadJson: JSON.stringify({
            productId,
            movementType,
            quantityDelta: actualDelta,
            availableQuantity: updatedBalance.availableQuantity,
          }),
        },
      });

      return {
        balance: updatedBalance as InventoryBalance,
        movement: movement as StockMovement,
      };
    });
  }

  public async listInventory(
    userContext: UserContext,
    query: ListInventoryQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId, status: { in: ["active", "inactive"] } };

    if (query.category && query.category !== "Tous") {
      where.category = query.category;
    }

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prismaClient.product.findMany({
        where,
        include: {
          inventoryBalances: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prismaClient.product.count({ where }),
    ]);

    const data = products.map((p) => {
      const available = p.inventoryBalances[0]?.availableQuantity ?? 0;
      const threshold = p.lowStockThreshold ?? 5;
      let stockStatus: "normal" | "low" | "out_of_stock" = "normal";
      if (available <= 0) {
        stockStatus = "out_of_stock";
      } else if (available <= threshold) {
        stockStatus = "low";
      }

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitPriceMinor: p.unitPriceMinor,
        availableQuantity: available,
        reservedQuantity: p.inventoryBalances[0]?.reservedQuantity ?? 0,
        lowStockThreshold: threshold,
        stockStatus,
      };
    });

    const filteredData = query.status
      ? data.filter((item) => item.stockStatus === query.status)
      : data;

    return {
      data: filteredData,
      total,
      page,
      limit,
    };
  }

  public async getStockMovements(
    userContext: UserContext,
    productId?: string,
    limit = 50,
    prismaClient = defaultPrisma
  ): Promise<StockMovement[]> {
    const organizationId = userContext.organizationId;
    const where: any = { organizationId };

    if (productId) {
      where.productId = productId;
    }

    const movements = await prismaClient.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { recordedAt: "desc" },
      take: Math.min(100, limit),
    });

    return movements as any;
  }
}
