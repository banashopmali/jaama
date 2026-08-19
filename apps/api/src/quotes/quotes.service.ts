import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface CreateQuoteLineDto {
  productId: string;
  quantity: number;
}

export interface CreateQuoteDto {
  customerId?: string;
  lines: CreateQuoteLineDto[];
  discountMinor?: number;
  expirationDate?: string;
  notes?: string;
}

export interface ListQuotesQuery {
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class QuotesService {
  public async createQuote(
    userContext: UserContext,
    dto: CreateQuoteDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Un devis doit contenir au moins une ligne d'article.");
    }

    return prismaClient.$transaction(async (tx) => {
      // 1. Validate Customer if provided
      let customerId: string | null = null;
      if (dto.customerId) {
        const customer = await tx.customer.findUnique({
          where: {
            organizationId_id: {
              organizationId,
              id: dto.customerId,
            },
          },
        });
        if (!customer) {
          throw new BadRequestException("Client introuvable.");
        }
        customerId = customer.id;
      }

      // 2. Fetch Products and validate lines
      const productIds = dto.lines.map((l) => l.productId);
      const products = await tx.product.findMany({
        where: {
          organizationId,
          id: { in: productIds },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotalMinor = 0;
      const quoteLinesData = dto.lines.map((line) => {
        const p = productMap.get(line.productId);
        if (!p) {
          throw new BadRequestException(`Produit avec ID ${line.productId} introuvable.`);
        }
        if (line.quantity <= 0) {
          throw new BadRequestException("La quantité de chaque ligne doit être supérieure à zéro.");
        }

        const lineTotalMinor = p.unitPriceMinor * line.quantity;
        subtotalMinor += lineTotalMinor;

        return {
          productId: p.id,
          productNameSnapshot: p.name,
          skuSnapshot: p.sku,
          quantity: line.quantity,
          unitPriceMinor: p.unitPriceMinor,
          lineTotalMinor,
        };
      });

      const discountMinor = Math.max(0, Math.min(dto.discountMinor || 0, subtotalMinor));
      const totalMinor = subtotalMinor - discountMinor;

      // 3. Generate Reference
      const count = await tx.quote.count({ where: { organizationId } });
      const reference = `DEV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;

      // 4. Insert Quote Record
      const quote = await tx.quote.create({
        data: {
          organizationId,
          reference,
          customerId,
          subtotalMinor,
          discountMinor,
          totalMinor,
          expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
          status: "DRAFT",
          notes: dto.notes ? dto.notes.trim() : null,
          lines: {
            create: quoteLinesData,
          },
        },
        include: {
          lines: true,
          customer: true,
        },
      });

      // 5. Audit & Outbox
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "quote.create",
          resourceType: "quote",
          resourceId: quote.id,
          metadataJson: JSON.stringify({ reference, totalMinor }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "QuoteCreated",
          aggregateType: "Quote",
          aggregateId: quote.id,
          payloadJson: JSON.stringify({ quoteId: quote.id, reference }),
        },
      });

      return quote;
    });
  }

  public async getQuote(
    userContext: UserContext,
    quoteId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const quote = await prismaClient.quote.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: quoteId,
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    if (!quote) {
      throw new NotFoundException("Devis introuvable.");
    }

    return quote;
  }

  public async listQuotes(
    userContext: UserContext,
    query: ListQuotesQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.search && query.search.trim().length > 0) {
      where.reference = { contains: query.search.trim(), mode: "insensitive" };
    }

    const [quotes, total] = await Promise.all([
      prismaClient.quote.findMany({
        where,
        include: {
          customer: true,
          lines: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.quote.count({ where }),
    ]);

    return {
      data: quotes,
      total,
      page,
      limit,
    };
  }

  public async updateQuoteStatus(
    userContext: UserContext,
    quoteId: string,
    status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED",
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const existing = await tx.quote.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: quoteId,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Devis introuvable.");
      }

      const updated = await tx.quote.update({
        where: {
          organizationId_id: {
            organizationId,
            id: quoteId,
          },
        },
        data: { status },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "quote.update_status",
          resourceType: "quote",
          resourceId: quoteId,
          metadataJson: JSON.stringify({ oldStatus: existing.status, newStatus: status }),
        },
      });

      return updated;
    });
  }
}
