import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { QuotesService } from "../quotes/quotes.service";
import { InvoicesService } from "../invoices/invoices.service";
import { ProductsService } from "../products/products.service";

describe("JAA-S1-04..06 — Quotes & Commercial Invoicing Core Integration Tests against PostgreSQL", () => {
  const quotesService = new QuotesService();
  const invoicesService = new InvoicesService();
  const productsService = new ProductsService();

  const adminContextOrgA: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["quotes.read", "quotes.manage", "invoices.read", "invoices.manage", "products.manage"],
  };

  const adminContextOrgB: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-b",
    membershipId: "org-b:user-hamidou",
    permissions: ["quotes.read", "quotes.manage", "invoices.read", "invoices.manage"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });
  });

  it("creates quote record with line item snapshots and reference generation", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "QUOTE-PROD-01",
      name: "Ordinateur Portable Dell",
      category: "Informatique",
      unitPriceMinor: 350000,
    });

    const quote = await quotesService.createQuote(adminContextOrgA, {
      lines: [{ productId: product.id, quantity: 2 }],
      discountMinor: 50000,
      notes: "Devis valable 15 jours",
    });

    expect(quote.id).toBeDefined();
    expect(quote.reference).toContain("DEV-");
    expect(quote.subtotalMinor).toBe(700000);
    expect(quote.discountMinor).toBe(50000);
    expect(quote.totalMinor).toBe(650000);
    expect(quote.status).toBe("DRAFT");
    expect(quote.lines.length).toBe(1);
    expect(quote.lines[0].productNameSnapshot).toBe("Ordinateur Portable Dell");
  });

  it("transforms valid quote into commercial invoice and updates quote status to ACCEPTED", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "CONV-PROD-01",
      name: "Imprimante HP LaserJet",
      category: "Informatique",
      unitPriceMinor: 120000,
    });

    const quote = await quotesService.createQuote(adminContextOrgA, {
      lines: [{ productId: product.id, quantity: 1 }],
    });

    // Convert Quote to Invoice
    const invoice = await invoicesService.convertQuoteToInvoice(adminContextOrgA, quote.id);

    expect(invoice.id).toBeDefined();
    expect(invoice.reference).toContain("FAC-");
    expect(invoice.totalMinor).toBe(120000);
    expect(invoice.status).toBe("ISSUED");
    expect(invoice.lines[0].productNameSnapshot).toBe("Imprimante HP LaserJet");

    // Verify Quote status updated to ACCEPTED
    const updatedQuote = await quotesService.getQuote(adminContextOrgA, quote.id);
    expect(updatedQuote.status).toBe("ACCEPTED");
  });

  it("strictly rejects double-conversion of an already accepted quote", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "DBL-CONV-01",
      name: "Écran Samsung 24 pouce",
      category: "Informatique",
      unitPriceMinor: 85000,
    });

    const quote = await quotesService.createQuote(adminContextOrgA, {
      lines: [{ productId: product.id, quantity: 1 }],
    });

    // 1st conversion -> succeeds
    await invoicesService.convertQuoteToInvoice(adminContextOrgA, quote.id);

    // 2nd conversion attempt -> throws BadRequestException
    await expect(
      invoicesService.convertQuoteToInvoice(adminContextOrgA, quote.id)
    ).rejects.toThrow("Ce devis a déjà été accepté et converti.");
  });

  it("enforces tenant isolation across quotes and invoices", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "TENANT-QUOTE-01",
      name: "Chaise de Bureau Ergonomique",
      category: "Mobilier",
      unitPriceMinor: 45000,
    });

    const quote = await quotesService.createQuote(adminContextOrgA, {
      lines: [{ productId: product.id, quantity: 1 }],
    });

    // Org B attempts to retrieve Org A quote -> 404
    await expect(
      quotesService.getQuote(adminContextOrgB, quote.id)
    ).rejects.toThrow("Devis introuvable.");

    // Org B attempts to convert Org A quote -> 404
    await expect(
      invoicesService.convertQuoteToInvoice(adminContextOrgB, quote.id)
    ).rejects.toThrow("Devis introuvable.");
  });
});
