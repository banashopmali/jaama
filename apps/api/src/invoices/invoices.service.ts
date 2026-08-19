import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface CreateInvoiceLineDto {
  productId: string;
  quantity: number;
}

export interface CreateInvoiceDto {
  customerId?: string;
  saleId?: string;
  dueDate?: string;
  lines: CreateInvoiceLineDto[];
  discountMinor?: number;
  notes?: string;
}

export interface ListInvoicesQuery {
  status?: string;
  customerId?: string;
  saleId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InvoicesService {
  public async createInvoice(
    userContext: UserContext,
    dto: CreateInvoiceDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Une facture doit contenir au moins une ligne d'article.");
    }

    return prismaClient.$transaction(async (tx) => {
      // 1. Lock Organization Row for Concurrency-Safe Reference Generation
      await tx.$executeRaw`
        UPDATE "Organization"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${organizationId}
      `;

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

      let saleId: string | null = null;
      if (dto.saleId) {
        const sale = await tx.sale.findUnique({
          where: {
            organizationId_id: {
              organizationId,
              id: dto.saleId,
            },
          },
        });
        if (!sale) {
          throw new BadRequestException("Vente introuvable.");
        }
        saleId = sale.id;
      }

      const productIds = dto.lines.map((l) => l.productId);
      const products = await tx.product.findMany({
        where: {
          organizationId,
          id: { in: productIds },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotalMinor = 0;
      const invoiceLinesData = dto.lines.map((line) => {
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
      const paidMinor = 0;
      const remainingMinor = totalMinor;

      const count = await tx.invoice.count({ where: { organizationId } });
      const reference = `FAC-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;

      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          reference,
          saleId,
          customerId,
          issueDate: new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          subtotalMinor,
          discountMinor,
          totalMinor,
          paidMinor,
          remainingMinor,
          status: "ISSUED",
          notes: dto.notes ? dto.notes.trim() : null,
          lines: {
            create: invoiceLinesData,
          },
        },
        include: {
          lines: true,
          customer: true,
          sale: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "invoice.create",
          resourceType: "invoice",
          resourceId: invoice.id,
          metadataJson: JSON.stringify({ reference, totalMinor }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "InvoiceCreated",
          aggregateType: "Invoice",
          aggregateId: invoice.id,
          payloadJson: JSON.stringify({ invoiceId: invoice.id, reference }),
        },
      });

      return invoice;
    });
  }

  /**
   * JAA-S1-06: Converts an accepted/valid Quote into a formal Commercial Invoice.
   */
  public async convertQuoteToInvoice(
    userContext: UserContext,
    quoteId: string,
    dueDate?: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      // Lock Organization Row for Concurrency-Safe Reference Generation
      await tx.$executeRaw`
        UPDATE "Organization"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${organizationId}
      `;

      const quote = await tx.quote.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: quoteId,
          },
        },
        include: {
          lines: true,
        },
      });

      if (!quote) {
        throw new NotFoundException("Devis introuvable.");
      }

      if (quote.status === "ACCEPTED") {
        throw new BadRequestException("Ce devis a déjà été accepté et converti.");
      }
      if (quote.status === "REJECTED" || quote.status === "EXPIRED") {
        throw new BadRequestException(`Impossible de convertir un devis ${quote.status.toLowerCase()}.`);
      }

      // Mark Quote ACCEPTED
      await tx.quote.update({
        where: {
          organizationId_id: {
            organizationId,
            id: quoteId,
          },
        },
        data: { status: "ACCEPTED" },
      });

      // Create Invoice
      const count = await tx.invoice.count({ where: { organizationId } });
      const reference = `FAC-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;

      const invoiceLinesData = quote.lines.map((l) => ({
        productId: l.productId,
        productNameSnapshot: l.productNameSnapshot,
        skuSnapshot: l.skuSnapshot,
        quantity: l.quantity,
        unitPriceMinor: l.unitPriceMinor,
        lineTotalMinor: l.lineTotalMinor,
      }));

      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          reference,
          customerId: quote.customerId,
          issueDate: new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotalMinor: quote.subtotalMinor,
          discountMinor: quote.discountMinor,
          totalMinor: quote.totalMinor,
          paidMinor: 0,
          remainingMinor: quote.totalMinor,
          status: "ISSUED",
          notes: `Facture générée depuis le devis ${quote.reference}`,
          lines: {
            create: invoiceLinesData,
          },
        },
        include: {
          lines: true,
          customer: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "quote.convert_to_invoice",
          resourceType: "invoice",
          resourceId: invoice.id,
          metadataJson: JSON.stringify({ quoteId, quoteReference: quote.reference, invoiceReference: reference }),
        },
      });

      return invoice;
    });
  }

  public async getInvoice(
    userContext: UserContext,
    invoiceId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const invoice = await prismaClient.invoice.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: invoiceId,
        },
      },
      include: {
        lines: true,
        customer: true,
        sale: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Facture introuvable.");
    }

    return invoice;
  }

  public async listInvoices(
    userContext: UserContext,
    query: ListInvoicesQuery = {},
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
    if (query.saleId) {
      where.saleId = query.saleId;
    }
    if (query.search && query.search.trim().length > 0) {
      where.reference = { contains: query.search.trim(), mode: "insensitive" };
    }

    const [invoices, total] = await Promise.all([
      prismaClient.invoice.findMany({
        where,
        include: {
          customer: true,
          sale: true,
          lines: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      total,
      page,
      limit,
    };
  }
}
