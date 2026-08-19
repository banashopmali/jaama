import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

@Injectable()
export class SearchService {
  public async searchAll(
    userContext: UserContext,
    queryTerm: string,
    prismaClient = defaultPrisma
  ) {
    const organizationId = userContext.organizationId;
    const term = queryTerm ? queryTerm.trim() : "";

    if (!term || term.length < 2) {
      return { products: [], customers: [], sales: [], invoices: [], suppliers: [] };
    }

    const [products, customers, sales, invoices, suppliers] = await Promise.all([
      // Products search
      prismaClient.product.findMany({
        where: {
          organizationId,
          status: { in: ["active", "inactive"] },
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { sku: { contains: term, mode: "insensitive" } },
            { barcode: { contains: term, mode: "insensitive" } },
          ],
        },
        include: { inventoryBalances: true },
        take: 5,
      }),
      // Customers search
      prismaClient.customer.findMany({
        where: {
          organizationId,
          status: "active",
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { phone: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
        take: 5,
      }),
      // Sales search
      prismaClient.sale.findMany({
        where: {
          organizationId,
          OR: [
            { reference: { contains: term, mode: "insensitive" } },
            { customer: { name: { contains: term, mode: "insensitive" } } },
          ],
        },
        include: { customer: { select: { name: true } } },
        take: 5,
      }),
      // Invoices search
      prismaClient.invoice.findMany({
        where: {
          organizationId,
          OR: [
            { reference: { contains: term, mode: "insensitive" } },
            { customer: { name: { contains: term, mode: "insensitive" } } },
          ],
        },
        take: 5,
      }),
      // Suppliers search
      prismaClient.supplier.findMany({
        where: {
          organizationId,
          status: "active",
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { phone: { contains: term, mode: "insensitive" } },
          ],
        },
        take: 5,
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `SKU: ${p.sku} | ${p.unitPriceMinor} FCFA`,
        type: "product",
        availableStock: p.inventoryBalances[0]?.availableQuantity ?? 0,
      })),
      customers: customers.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.phone || c.email || "Client enregistré",
        type: "customer",
      })),
      sales: sales.map((s) => ({
        id: s.id,
        title: s.reference,
        subtitle: `${s.customer?.name || "Client comptoir"} — ${s.totalMinor} FCFA`,
        type: "sale",
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        title: i.reference,
        subtitle: `${i.totalMinor} FCFA (${i.status})`,
        type: "invoice",
      })),
      suppliers: suppliers.map((sup) => ({
        id: sup.id,
        title: sup.name,
        subtitle: sup.phone || "Fournisseur",
        type: "supplier",
      })),
    };
  }
}
