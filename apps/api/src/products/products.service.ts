import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { Product, UserContext } from "@jaama/types";

export interface CreateProductDto {
  sku: string;
  name: string;
  category: string;
  unitPriceMinor: number;
  costMinor?: number;
  description?: string;
  barcode?: string;
  lowStockThreshold?: number;
  initialStock?: number;
}

export interface UpdateProductDto {
  name?: string;
  sku?: string;
  category?: string;
  unitPriceMinor?: number;
  costMinor?: number;
  description?: string;
  barcode?: string;
  lowStockThreshold?: number;
  status?: "active" | "inactive" | "archived";
}

export interface ListProductsQuery {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  public async createProduct(
    userContext: UserContext,
    dto: CreateProductDto,
    prismaClient = defaultPrisma
  ): Promise<Product> {
    const organizationId = userContext.organizationId;
    const skuClean = dto.sku.trim().toUpperCase();

    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException("Le nom du produit est obligatoire.");
    }
    if (!skuClean) {
      throw new BadRequestException("Le SKU du produit est obligatoire.");
    }
    if (dto.unitPriceMinor === undefined || dto.unitPriceMinor < 0) {
      throw new BadRequestException("Le prix unitaire doit être un entier positif ou nul.");
    }

    return prismaClient.$transaction(async (tx) => {
      // 1. SKU Uniqueness check within organization
      const existing = await tx.product.findUnique({
        where: {
          organizationId_sku: {
            organizationId,
            sku: skuClean,
          },
        },
      });

      if (existing) {
        throw new BadRequestException("Un produit avec ce SKU existe déjà dans votre organisation.");
      }

      // 2. Create Product
      const product = await tx.product.create({
        data: {
          organizationId,
          sku: skuClean,
          name: dto.name.trim(),
          category: dto.category ? dto.category.trim() : "Général",
          unitPriceMinor: Math.round(dto.unitPriceMinor),
          costMinor: dto.costMinor !== undefined ? Math.round(dto.costMinor) : null,
          description: dto.description ? dto.description.trim() : null,
          barcode: dto.barcode ? dto.barcode.trim() : null,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
          status: "active",
        },
      });

      // 3. Initialize Inventory Balance
      const initialQty = dto.initialStock && dto.initialStock > 0 ? dto.initialStock : 0;
      await tx.inventoryBalance.create({
        data: {
          organizationId,
          productId: product.id,
          availableQuantity: initialQty,
          reservedQuantity: 0,
        },
      });

      if (initialQty > 0) {
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: product.id,
            movementType: "OPENING",
            quantityDelta: initialQty,
            reference: "STOCK-INITIAL",
          },
        });
      }

      // 4. Audit & Outbox
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "product.create",
          resourceType: "product",
          resourceId: product.id,
          metadataJson: JSON.stringify({ sku: product.sku, name: product.name, unitPriceMinor: product.unitPriceMinor }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "ProductCreated",
          aggregateType: "Product",
          aggregateId: product.id,
          payloadJson: JSON.stringify({ productId: product.id, sku: product.sku, name: product.name }),
        },
      });

      return product as Product;
    });
  }

  public async updateProduct(
    userContext: UserContext,
    productId: string,
    dto: UpdateProductDto,
    prismaClient = defaultPrisma
  ): Promise<Product> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: productId,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Produit introuvable.");
      }

      let newSku = existing.sku;
      if (dto.sku && dto.sku.trim().toUpperCase() !== existing.sku) {
        newSku = dto.sku.trim().toUpperCase();
        const skuCheck = await tx.product.findUnique({
          where: {
            organizationId_sku: {
              organizationId,
              sku: newSku,
            },
          },
        });
        if (skuCheck) {
          throw new BadRequestException("Un autre produit utilise déjà ce SKU dans votre organisation.");
        }
      }

      const updated = await tx.product.update({
        where: {
          organizationId_id: {
            organizationId,
            id: productId,
          },
        },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          sku: newSku,
          ...(dto.category !== undefined && { category: dto.category.trim() }),
          ...(dto.unitPriceMinor !== undefined && { unitPriceMinor: Math.round(dto.unitPriceMinor) }),
          ...(dto.costMinor !== undefined && { costMinor: Math.round(dto.costMinor) }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.barcode !== undefined && { barcode: dto.barcode }),
          ...(dto.lowStockThreshold !== undefined && { lowStockThreshold: dto.lowStockThreshold }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "product.update",
          resourceType: "product",
          resourceId: productId,
          metadataJson: JSON.stringify({ updatedFields: Object.keys(dto) }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "ProductUpdated",
          aggregateType: "Product",
          aggregateId: productId,
          payloadJson: JSON.stringify({ productId, name: updated.name, unitPriceMinor: updated.unitPriceMinor }),
        },
      });

      return updated as Product;
    });
  }

  public async getProduct(
    userContext: UserContext,
    productId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const product = await prismaClient.product.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: productId,
        },
      },
      include: {
        inventoryBalances: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Produit introuvable.");
    }

    const availableStock = product.inventoryBalances[0]?.availableQuantity ?? 0;
    return {
      ...product,
      stock: {
        available: availableStock,
        reserved: product.inventoryBalances[0]?.reservedQuantity ?? 0,
      },
    };
  }

  public async listProducts(
    userContext: UserContext,
    query: ListProductsQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.category && query.category !== "Tous") {
      where.category = query.category;
    }

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: ["active", "inactive"] }; // Hide archived by default
    }

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term, mode: "insensitive" } },
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

    const mapped = products.map((p) => ({
      ...p,
      stock: {
        available: p.inventoryBalances[0]?.availableQuantity ?? 0,
        reserved: p.inventoryBalances[0]?.reservedQuantity ?? 0,
      },
    }));

    return {
      data: mapped,
      total,
      page,
      limit,
    };
  }

  public async archiveProduct(
    userContext: UserContext,
    productId: string,
    prismaClient = defaultPrisma
  ): Promise<Product> {
    return this.updateProduct(userContext, productId, { status: "archived" }, prismaClient);
  }
}
