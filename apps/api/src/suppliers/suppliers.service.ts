import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export class CreateSupplierDto {
  name!: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export class UpdateSupplierDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export class ListSuppliersQuery {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SuppliersService {
  public async createSupplier(
    userContext: UserContext,
    dto: CreateSupplierDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException("Le nom du fournisseur est obligatoire.");
    }

    return prismaClient.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          phone: dto.phone ? dto.phone.trim() : null,
          email: dto.email ? dto.email.trim() : null,
          address: dto.address ? dto.address.trim() : null,
          notes: dto.notes ? dto.notes.trim() : null,
          status: "active",
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "supplier.create",
          resourceType: "supplier",
          resourceId: supplier.id,
          metadataJson: JSON.stringify({ name: supplier.name }),
        },
      });

      return supplier;
    });
  }

  public async getSupplier(
    userContext: UserContext,
    supplierId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const supplier = await prismaClient.supplier.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: supplierId,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException("Fournisseur introuvable.");
    }

    const purchasesAggregate = await prismaClient.purchase.aggregate({
      where: {
        organizationId,
        supplierId,
      },
      _count: { _all: true },
      _sum: { totalMinor: true },
    });

    return {
      ...supplier,
      summary: {
        purchasesCount: purchasesAggregate._count?._all || 0,
        totalPurchasedMinor: purchasesAggregate._sum?.totalMinor || 0,
      },
    };
  }

  public async listSuppliers(
    userContext: UserContext,
    query: ListSuppliersQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = "active";
    }

    if (query.search && query.search.trim().length > 0) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: "insensitive" } },
        { phone: { contains: query.search.trim(), mode: "insensitive" } },
        { email: { contains: query.search.trim(), mode: "insensitive" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prismaClient.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prismaClient.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      total,
      page,
      limit,
    };
  }

  public async updateSupplier(
    userContext: UserContext,
    supplierId: string,
    dto: UpdateSupplierDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const existing = await tx.supplier.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: supplierId,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Fournisseur introuvable.");
      }

      const updated = await tx.supplier.update({
        where: {
          organizationId_id: {
            organizationId,
            id: supplierId,
          },
        },
        data: {
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone ? dto.phone.trim() : null }),
          ...(dto.email !== undefined && { email: dto.email ? dto.email.trim() : null }),
          ...(dto.address !== undefined && { address: dto.address ? dto.address.trim() : null }),
          ...(dto.notes !== undefined && { notes: dto.notes ? dto.notes.trim() : null }),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "supplier.update",
          resourceType: "supplier",
          resourceId: supplierId,
          metadataJson: JSON.stringify({ name: updated.name }),
        },
      });

      return updated;
    });
  }

  public async archiveSupplier(
    userContext: UserContext,
    supplierId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const existing = await tx.supplier.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: supplierId,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Fournisseur introuvable.");
      }

      const archived = await tx.supplier.update({
        where: {
          organizationId_id: {
            organizationId,
            id: supplierId,
          },
        },
        data: { status: "archived" },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "supplier.archive",
          resourceType: "supplier",
          resourceId: supplierId,
          metadataJson: JSON.stringify({ name: existing.name }),
        },
      });

      return archived;
    });
  }
}
