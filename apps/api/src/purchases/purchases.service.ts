import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { hashCanonicalPayload } from "../common/canonical-hash";

export class CreatePurchaseLineDto {
  productId!: string;
  quantity!: number;
  unitCostMinor!: number;
  totalCostMinor?: number;
}

export class CreatePurchaseDto {
  supplierId!: string;
  lines!: CreatePurchaseLineDto[];
  notes?: string;
}

export class ReceiveLineDto {
  productId!: string;
  quantityReceived!: number;
}

export class ReceivePurchaseDto {
  idempotencyKey!: string;
  lines!: ReceiveLineDto[];
  notes?: string;
}

export class ListPurchasesQuery {
  supplierId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PurchasesService {
  public async listPurchases(
    userContext: UserContext,
    query: ListPurchasesQuery = {},
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, totalCount] = await Promise.all([
      prismaClient.purchase.findMany({
        where,
        include: {
          supplier: true,
          lines: {
            include: { product: true },
          },
          receivings: {
            include: { lines: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.purchase.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  public async getPurchase(
    userContext: UserContext,
    id: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const purchase = await prismaClient.purchase.findUnique({
      where: {
        organizationId_id: { organizationId, id },
      },
      include: {
        supplier: true,
        lines: { include: { product: true } },
        receivings: { include: { lines: true } },
      },
    });

    if (!purchase) {
      throw new NotFoundException("Commande d'achat introuvable.");
    }
    return purchase;
  }

  public async createPurchase(
    userContext: UserContext,
    dto: CreatePurchaseDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.supplierId) {
      throw new BadRequestException("Un fournisseur est obligatoire pour passer une commande.");
    }
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Une commande d'achat doit comporter au moins une ligne d'article.");
    }

    return prismaClient.$transaction(async (tx) => {
      // Lock Organization Row for Concurrency-Safe Purchase Reference Generation
      await tx.$executeRaw`
        UPDATE "Organization"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${organizationId}
      `;

      const supplier = await tx.supplier.findUnique({
        where: { organizationId_id: { organizationId, id: dto.supplierId } },
      });

      if (!supplier) {
        throw new NotFoundException("Fournisseur introuvable dans votre entreprise.");
      }

      const purchaseCount = await tx.purchase.count({ where: { organizationId } });
      const refNumber = (purchaseCount + 1).toString().padStart(4, "0");
      const reference = `ACH-${new Date().getFullYear()}-${refNumber}`;

      let totalMinor = 0;
      const linesData: any[] = [];

      for (const line of dto.lines) {
        if (line.quantity <= 0 || !Number.isInteger(line.quantity)) {
          throw new BadRequestException("La quantité commandée doit être un entier positif.");
        }
        if (line.unitCostMinor < 0 || !Number.isInteger(line.unitCostMinor)) {
          throw new BadRequestException("Le coût unitaire doit être un entier positif.");
        }

        const product = await tx.product.findUnique({
          where: { organizationId_id: { organizationId, id: line.productId } },
        });

        if (!product) {
          throw new NotFoundException(`Produit introuvable (ID: ${line.productId}).`);
        }

        const lineTotal = line.quantity * line.unitCostMinor;
        totalMinor += lineTotal;

        linesData.push({
          productId: product.id,
          orderedQuantity: line.quantity,
          receivedQuantity: 0,
          unitCostMinor: line.unitCostMinor,
          lineTotalMinor: line.totalCostMinor || lineTotal,
        });

      }

      const purchase = await tx.purchase.create({
        data: {
          organizationId,
          reference,
          supplierId: supplier.id,
          status: "ORDERED",
          totalMinor,
          notes: dto.notes || null,
          lines: {
            create: linesData,
          },
        },
        include: {
          supplier: true,
          lines: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "purchase.create",
          resourceType: "purchase",
          resourceId: purchase.id,
          metadataJson: JSON.stringify({ reference, totalMinor, lineCount: linesData.length }),
        },
      });

      return purchase;
    });
  }

  /**
   * JAA-S1-09: Goods Receiving Workflow with Required Idempotency & P0 Over-receiving Protection
   */
  public async receivePurchase(
    userContext: UserContext,
    purchaseId: string,
    dto: ReceivePurchaseDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const operation = "purchases.receive";
    const idempotencyKey = dto.idempotencyKey;

    if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      throw new BadRequestException("La clé d'idempotence (idempotencyKey) est obligatoire pour enregistrer une réception.");
    }

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Une réception doit contenir au moins une ligne d'article.");
    }

    const requestHash = hashCanonicalPayload({ purchaseId, lines: dto.lines, notes: dto.notes });

    return prismaClient.$transaction(async (tx) => {
      // 1. Idempotency handling
      const existingRecord = await tx.idempotencyRecord.findUnique({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation,
            idempotencyKey,
          },
        },
      });

      if (existingRecord) {
        if (existingRecord.requestHash !== requestHash) {
          throw new ConflictException("Conflit d'idempotence : La même clé a été soumise avec des données de réception différentes.");
        }
        if (existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
          return JSON.parse(existingRecord.responseJson);
        }
        if (existingRecord.status === "PROCESSING") {
          throw new ConflictException("Réception idempotente en cours de traitement.");
        }
      }

      try {
        await tx.idempotencyRecord.create({
          data: {
            organizationId,
            operation,
            idempotencyKey,
            requestHash,
            status: "PROCESSING",
          },
        });
      } catch (e: any) {
        if (e.code === "P2002" || e?.message?.includes("Unique constraint")) {
          throw new ConflictException("Réception idempotente en cours de traitement.");
        }
        throw e;
      }

      // 2. Lock Organization Row for Concurrency-Safe Reference Generation
      await tx.$executeRaw`
        UPDATE "Organization"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${organizationId}
      `;

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

        // P0 Row Lock on PurchaseLine to prevent concurrent over-receiving
        const lockedLines: any[] = await tx.$queryRaw`
          SELECT "id", "orderedQuantity", "receivedQuantity"
          FROM "PurchaseLine"
          WHERE "organizationId" = ${organizationId}
            AND "id" = ${pLine.id}
          FOR UPDATE
        `;

        const lockedLine = lockedLines[0];
        if (!lockedLine) {
          throw new NotFoundException("Ligne de commande d'achat introuvable.");
        }

        // P0 Over-Receiving Verification: alreadyReceived + incoming <= orderedQuantity
        const remainingToReceive = lockedLine.orderedQuantity - lockedLine.receivedQuantity;
        if (recLine.quantityReceived > remainingToReceive) {
          throw new BadRequestException(
            `Dépassement de la quantité commandée pour le produit ${recLine.productId}. Restant à recevoir : ${remainingToReceive}, quantité fournie : ${recLine.quantityReceived}.`
          );
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
          create: {
            organizationId,
            productId: recLine.productId,
            availableQuantity: recLine.quantityReceived,
          },
          update: {
            availableQuantity: { increment: recLine.quantityReceived },
          },
        });

        // 3. Create StockMovement (PURCHASE_IN)
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

      // 4. Create Receiving record
      const receiving = await tx.receiving.create({
        data: {
          organizationId,
          purchaseId: purchase.id,
          reference: receivingRef,
          notes: dto.notes || null,
          createdById: userContext.actorId,
          lines: {
            create: receivingLinesData,
          },
        },
        include: {
          lines: true,
        },
      });

      // 5. Update Purchase status
      const updatedLines = await tx.purchaseLine.findMany({
        where: { organizationId, purchaseId: purchase.id },
      });

      const allCompleted = updatedLines.every((l) => l.receivedQuantity >= l.orderedQuantity);
      const newStatus = allCompleted ? "RECEIVED" : "PARTIALLY_RECEIVED";

      await tx.purchase.update({
        where: { organizationId_id: { organizationId, id: purchase.id } },
        data: { status: newStatus },
      });

      // 6. Create AuditEvent
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "purchase.receive",
          resourceType: "receiving",
          resourceId: receiving.id,
          metadataJson: JSON.stringify({
            purchaseId: purchase.id,
            receivingReference: receivingRef,
            status: newStatus,
          }),
        },
      });

      // 7. Create OutboxEvent GoodsReceived
      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "GoodsReceived",
          aggregateType: "receiving",
          aggregateId: receiving.id,
          payloadJson: JSON.stringify({
            receivingId: receiving.id,
            purchaseId: purchase.id,
            reference: receivingRef,
            lines: dto.lines,
          }),
          status: "PENDING",
        },
      });

      // 8. Mark Idempotency Record COMPLETED
      const responsePayload = {
        ...receiving,
        status: newStatus,
        purchaseStatus: newStatus,
      };

      await tx.idempotencyRecord.update({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation,
            idempotencyKey,
          },
        },
        data: {
          status: "COMPLETED",
          responseJson: JSON.stringify(responsePayload),
        },
      });

      return responsePayload;
    }, { maxWait: 15000, timeout: 30000 });
  }
}
