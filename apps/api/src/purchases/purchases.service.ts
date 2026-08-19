import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface CreatePurchaseLineDto {
  productId: string;
  quantity: number;
  unitCostMinor: number;
}

export interface CreatePurchaseDto {
  supplierId: string;
  lines: CreatePurchaseLineDto[];
  notes?: string;
}

export interface ReceiveLineDto {
  productId: string;
  quantityReceived: number;
}

export interface ReceivePurchaseDto {
  lines: ReceiveLineDto[];
  notes?: string;
}

export interface ListPurchasesQuery {
  supplierId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PurchasesService {
  public async createPurchase(
    userContext: UserContext,
    dto: CreatePurchaseDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.supplierId) {
      throw new BadRequestException("Un fournisseur doit être spécifié pour chaque commande d'achat.");
    }
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Une commande d'achat doit contenir au moins une ligne.");
    }

    return prismaClient.$transaction(async (tx) => {
      // 1. Verify Supplier
      const supplier = await tx.supplier.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: dto.supplierId,
          },
        },
      });
      if (!supplier) {
        throw new BadRequestException("Fournisseur introuvable.");
      }

      // 2. Fetch Products
      const productIds = dto.lines.map((l) => l.productId);
      const products = await tx.product.findMany({
        where: {
          organizationId,
          id: { in: productIds },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalMinor = 0;
      const purchaseLinesData = dto.lines.map((line) => {
        const p = productMap.get(line.productId);
        if (!p) {
          throw new BadRequestException(`Produit avec ID ${line.productId} introuvable.`);
        }
        if (line.quantity <= 0) {
          throw new BadRequestException("La quantité commandée doit être supérieure à zéro.");
        }
        if (line.unitCostMinor < 0) {
          throw new BadRequestException("Le coût unitaire ne peut pas être négatif.");
        }

        const lineTotalMinor = line.unitCostMinor * line.quantity;
        totalMinor += lineTotalMinor;

        return {
          productId: p.id,
          orderedQuantity: line.quantity,
          receivedQuantity: 0,
          unitCostMinor: line.unitCostMinor,
          lineTotalMinor,
        };
      });

      const count = await tx.purchase.count({ where: { organizationId } });
      const reference = `ACH-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;

      const purchase = await tx.purchase.create({
        data: {
          organizationId,
          reference,
          supplierId: supplier.id,
          orderDate: new Date(),
          totalMinor,
          status: "ORDERED",
          notes: dto.notes ? dto.notes.trim() : null,
          lines: {
            create: purchaseLinesData,
          },
        },
        include: {
          lines: true,
          supplier: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "purchase.create",
          resourceType: "purchase",
          resourceId: purchase.id,
          metadataJson: JSON.stringify({ reference, totalMinor, supplierName: supplier.name }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "PurchaseCreated",
          aggregateType: "Purchase",
          aggregateId: purchase.id,
          payloadJson: JSON.stringify({ purchaseId: purchase.id, reference }),
        },
      });

      return purchase;
    });
  }

  /**
   * JAA-S1-09: Goods Receiving Workflow
   * Atomically increments stock balance (PURCHASE_IN) in InventoryBalance & StockMovement
   */
  public async receivePurchase(
    userContext: UserContext,
    purchaseId: string,
    dto: ReceivePurchaseDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Une réception doit contenir au moins une ligne d'article.");
    }

    return prismaClient.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: purchaseId,
          },
        },
        include: {
          lines: true,
        },
      });

      if (!purchase) {
        throw new NotFoundException("Commande d'achat introuvable.");
      }

      if (purchase.status === "RECEIVED" || purchase.status === "CANCELLED") {
        throw new BadRequestException(`Impossible de réceptionner une commande avec le statut ${purchase.status}.`);
      }

      const lineMap = new Map(purchase.lines.map((l) => [l.productId, l]));

      const receivingCount = await tx.receiving.count({ where: { organizationId } });
      const receivingRef = `REC-${new Date().getFullYear()}-${(receivingCount + 1).toString().padStart(4, "0")}`;

      const receivingLinesData: any[] = [];

      for (const recLine of dto.lines) {
        const pLine = lineMap.get(recLine.productId);
        if (!pLine) {
          throw new BadRequestException(`Le produit ${recLine.productId} ne fait pas partie de la commande.`);
        }
        if (recLine.quantityReceived <= 0) {
          throw new BadRequestException("La quantité réceptionnée doit être supérieure à zéro.");
        }

        // 1. Update PurchaseLine receivedQuantity
        await tx.purchaseLine.update({
          where: {
            organizationId_id: {
              organizationId,
              id: pLine.id,
            },
          },
          data: {
            receivedQuantity: { increment: recLine.quantityReceived },
          },
        });

        // 2. Increment InventoryBalance (PURCHASE_IN)
        await tx.inventoryBalance.upsert({
          where: {
            organizationId_productId: {
              organizationId,
              productId: recLine.productId,
            },
          },
          update: {
            availableQuantity: { increment: recLine.quantityReceived },
          },
          create: {
            organizationId,
            productId: recLine.productId,
            availableQuantity: recLine.quantityReceived,
            reservedQuantity: 0,
          },
        });

        // 3. Record StockMovement
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: recLine.productId,
            movementType: "PURCHASE_IN",
            quantityDelta: recLine.quantityReceived,
            reference: receivingRef,
          },
        });

        receivingLinesData.push({
          productId: recLine.productId,
          quantityReceived: recLine.quantityReceived,
        });
      }

      // 4. Check if fully or partially received
      const updatedPurchaseLines = await tx.purchaseLine.findMany({
        where: { organizationId, purchaseId },
      });

      const isFullyReceived = updatedPurchaseLines.every((l) => l.receivedQuantity >= l.orderedQuantity);
      const newStatus = isFullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

      await tx.purchase.update({
        where: {
          organizationId_id: {
            organizationId,
            id: purchaseId,
          },
        },
        data: { status: newStatus },
      });

      // 5. Create Receiving Log Record
      const receiving = await tx.receiving.create({
        data: {
          organizationId,
          reference: receivingRef,
          purchaseId,
          receivedAt: new Date(),
          createdById: userContext.actorId,
          notes: dto.notes ? dto.notes.trim() : null,
          lines: {
            create: receivingLinesData,
          },
        },
        include: {
          lines: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "purchase.receive",
          resourceType: "receiving",
          resourceId: receiving.id,
          metadataJson: JSON.stringify({ purchaseId, receivingRef, newStatus }),
        },
      });

      return receiving;
    });
  }

  public async getPurchase(
    userContext: UserContext,
    purchaseId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const purchase = await prismaClient.purchase.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: purchaseId,
        },
      },
      include: {
        lines: true,
        supplier: true,
        receivings: {
          include: { lines: true },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException("Commande d'achat introuvable.");
    }

    return purchase;
  }

  public async listPurchases(
    userContext: UserContext,
    query: ListPurchasesQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim().length > 0) {
      where.reference = { contains: query.search.trim(), mode: "insensitive" };
    }

    const [purchases, total] = await Promise.all([
      prismaClient.purchase.findMany({
        where,
        include: {
          supplier: true,
          lines: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.purchase.count({ where }),
    ]);

    return {
      data: purchases,
      total,
      page,
      limit,
    };
  }
}
