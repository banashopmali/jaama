import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { Customer, UserContext } from "@jaama/types";

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  type?: "walk_in" | "registered";
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: "active" | "archived";
  type?: "walk_in" | "registered";
}

export interface ListCustomersQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomersService {
  public async createCustomer(
    userContext: UserContext,
    dto: CreateCustomerDto,
    prismaClient = defaultPrisma
  ): Promise<Customer> {
    const organizationId = userContext.organizationId;

    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException("Le nom du client est obligatoire.");
    }

    const trimmedName = dto.name.trim();
    if (
      trimmedName.toLowerCase() === "client comptoir" ||
      trimmedName.toLowerCase() === "client passage"
    ) {
      throw new BadRequestException(
        "Le 'Client Comptoir' ne doit pas être créé comme fiche client master. Utilisez customerId = null pour les ventes au comptoir."
      );
    }

    return prismaClient.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          organizationId,
          name: trimmedName,
          phone: dto.phone ? dto.phone.trim() : null,
          email: dto.email ? dto.email.trim().toLowerCase() : null,
          address: dto.address ? dto.address.trim() : null,
          notes: dto.notes ? dto.notes.trim() : null,
          type: dto.type || "registered",
          status: "active",
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "customer.create",
          resourceType: "customer",
          resourceId: customer.id,
          metadataJson: JSON.stringify({ name: customer.name, phone: customer.phone }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "CustomerCreated",
          aggregateType: "Customer",
          aggregateId: customer.id,
          payloadJson: JSON.stringify({ customerId: customer.id, name: customer.name }),
        },
      });

      return customer as Customer;
    });
  }

  public async updateCustomer(
    userContext: UserContext,
    customerId: string,
    dto: UpdateCustomerDto,
    prismaClient = defaultPrisma
  ): Promise<Customer> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: customerId,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Client introuvable.");
      }

      const updated = await tx.customer.update({
        where: {
          organizationId_id: {
            organizationId,
            id: customerId,
          },
        },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone ? dto.phone.trim() : null }),
          ...(dto.email !== undefined && { email: dto.email ? dto.email.trim().toLowerCase() : null }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.type !== undefined && { type: dto.type }),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "customer.update",
          resourceType: "customer",
          resourceId: customerId,
          metadataJson: JSON.stringify({ updatedFields: Object.keys(dto) }),
        },
      });

      return updated as Customer;
    });
  }

  public async getCustomerDetail(
    userContext: UserContext,
    customerId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    const customer = await prismaClient.customer.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: customerId,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Client introuvable.");
    }

    // Authoritative Read Model Summary derived from Sales
    const sales = await prismaClient.sale.findMany({
      where: {
        organizationId,
        customerId,
      },
      select: {
        id: true,
        reference: true,
        totalMinor: true,
        paidMinor: true,
        remainingMinor: true,
        paymentStatus: true,
        saleStatus: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: "desc" },
    });

    const salesCount = sales.length;
    const salesTotalMinor = sales.reduce((acc, s) => acc + s.totalMinor, 0);
    const paidMinor = sales.reduce((acc, s) => acc + s.paidMinor, 0);
    const outstandingMinor = sales.reduce((acc, s) => acc + s.remainingMinor, 0);

    return {
      ...customer,
      summary: {
        salesCount,
        salesTotalMinor,
        paidMinor,
        outstandingMinor,
      },
      recentSales: sales.slice(0, 10),
    };
  }

  public async listCustomers(
    userContext: UserContext,
    query: ListCustomersQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
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
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prismaClient.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prismaClient.customer.count({ where }),
    ]);

    return {
      data: customers as Customer[],
      total,
      page,
      limit,
    };
  }

  public async archiveCustomer(
    userContext: UserContext,
    customerId: string,
    prismaClient = defaultPrisma
  ): Promise<Customer> {
    return this.updateCustomer(userContext, customerId, { status: "archived" }, prismaClient);
  }
}
