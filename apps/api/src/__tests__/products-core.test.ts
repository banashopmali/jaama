import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { ProductsService } from "../products/products.service";

describe("JAA-S1-01 — Product Catalog Core Integration Tests against PostgreSQL", () => {
  const productsService = new ProductsService();

  const adminContextOrgA: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["products.read", "products.manage"],
  };

  const adminContextOrgB: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-b",
    membershipId: "org-b:user-hamidou",
    permissions: ["products.read", "products.manage"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    // Create Org B for tenant isolation testing
    await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });
  });

  it("enforces SKU uniqueness per organization", async () => {
    // 1st Create -> succeeds
    await productsService.createProduct(adminContextOrgA, {
      sku: "PROD-UNIQUE-101",
      name: "Produit Test Unique 1",
      category: "Test",
      unitPriceMinor: 1500,
    });

    // 2nd Create with SAME SKU in SAME Org -> fails
    await expect(
      productsService.createProduct(adminContextOrgA, {
        sku: "PROD-UNIQUE-101",
        name: "Produit Test Doublon",
        category: "Test",
        unitPriceMinor: 2000,
      })
    ).rejects.toThrow("Un produit avec ce SKU existe déjà dans votre organisation.");
  });

  it("allows same SKU across different organizations", async () => {
    const pOrgA = await productsService.createProduct(adminContextOrgA, {
      sku: "SKU-SHARED-999",
      name: "Produit Org A",
      category: "Test",
      unitPriceMinor: 1000,
    });

    const pOrgB = await productsService.createProduct(adminContextOrgB, {
      sku: "SKU-SHARED-999", // Same SKU!
      name: "Produit Org B",
      category: "Test",
      unitPriceMinor: 1200,
    });

    expect(pOrgA.organizationId).toBe("org-diallo");
    expect(pOrgB.organizationId).toBe("org-b");
    expect(pOrgA.id).not.toBe(pOrgB.id);
  });

  it("strictly prevents cross-tenant product retrieval and mutation", async () => {
    const pOrgA = await productsService.createProduct(adminContextOrgA, {
      sku: "SKU-ISOLATED-123",
      name: "Produit Org A Confidentiel",
      category: "Test",
      unitPriceMinor: 5000,
    });

    // Org B user attempts to get Org A Product -> fails with 404 NotFound
    await expect(
      productsService.getProduct(adminContextOrgB, pOrgA.id)
    ).rejects.toThrow("Produit introuvable.");

    // Org B user attempts to update Org A Product -> fails with 404 NotFound
    await expect(
      productsService.updateProduct(adminContextOrgB, pOrgA.id, { name: "Hacked Name" })
    ).rejects.toThrow("Produit introuvable.");
  });

  it("supports product updates without rewriting historical sale line snapshots", async () => {
    // 1. Create product
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "SKU-PRICE-CHANGE",
      name: "Savon Marseille",
      category: "Hygiène",
      unitPriceMinor: 500,
      initialStock: 20,
    });

    // 2. Perform a Sale using product at 500 FCFA
    const saleRow = await prisma.sale.create({
      data: {
        id: "sale-hist-001",
        organizationId: "org-diallo",
        reference: "VTE-HIST-001",
        sellerUserId: "user-hamidou",
        subtotalMinor: 500,
        discountMinor: 0,
        totalMinor: 500,
        paidMinor: 500,
        remainingMinor: 0,
        saleStatus: "COMPLETED",
        paymentStatus: "PAID",
      },
    });

    await prisma.saleLine.create({
      data: {
        id: "line-hist-001",
        organizationId: "org-diallo",
        saleId: saleRow.id,
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        quantity: 1,
        unitPriceMinor: 500,
        lineTotalMinor: 500,
      },
    });

    // 3. Update Product price to 800 FCFA
    const updated = await productsService.updateProduct(adminContextOrgA, product.id, {
      unitPriceMinor: 800,
      name: "Savon Marseille 200g (Nouveau prix)",
    });

    expect(updated.unitPriceMinor).toBe(800);

    // 4. Verify historical SaleLine snapshot remains EXACTLY 500 FCFA
    const historicalLine = await prisma.saleLine.findUniqueOrThrow({
      where: { organizationId_id: { organizationId: "org-diallo", id: "line-hist-001" } },
    });

    expect(historicalLine.unitPriceMinor).toBe(500);
    expect(historicalLine.productNameSnapshot).toBe("Savon Marseille");
  });

  it("archives product soft-delete maintaining historical document references", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "SKU-TO-ARCHIVE",
      name: "Produit Obsolète",
      category: "Test",
      unitPriceMinor: 300,
    });

    const archived = await productsService.archiveProduct(adminContextOrgA, product.id);
    expect(archived.status).toBe("archived");

    // Default list hidden archived
    const listRes = await productsService.listProducts(adminContextOrgA);
    const foundInActiveList = listRes.data.find((p) => p.id === product.id);
    expect(foundInActiveList).toBeUndefined();

    // Explicit query includes archived
    const archivedListRes = await productsService.listProducts(adminContextOrgA, { status: "archived" });
    const foundInArchivedList = archivedListRes.data.find((p) => p.id === product.id);
    expect(foundInArchivedList).toBeDefined();
  });
});
