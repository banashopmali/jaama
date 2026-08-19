"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("@jaama/database");
const products_service_1 = require("../products/products.service");
(0, vitest_1.describe)("JAA-S1-01 — Product Catalog Core Integration Tests against PostgreSQL", () => {
    const productsService = new products_service_1.ProductsService();
    const adminContextOrgA = {
        actorId: "user-hamidou",
        organizationId: "org-diallo",
        membershipId: "org-diallo:user-hamidou",
        permissions: ["products.read", "products.manage"],
    };
    const adminContextOrgB = {
        actorId: "user-hamidou",
        organizationId: "org-b",
        membershipId: "org-b:user-hamidou",
        permissions: ["products.read", "products.manage"],
    };
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
        // Create Org B for tenant isolation testing
        await database_1.prisma.organization.upsert({
            where: { id: "org-b" },
            update: { status: "active" },
            create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
        });
    });
    (0, vitest_1.it)("enforces SKU uniqueness per organization", async () => {
        // 1st Create -> succeeds
        await productsService.createProduct(adminContextOrgA, {
            sku: "PROD-UNIQUE-101",
            name: "Produit Test Unique 1",
            category: "Test",
            unitPriceMinor: 1500,
        });
        // 2nd Create with SAME SKU in SAME Org -> fails
        await (0, vitest_1.expect)(productsService.createProduct(adminContextOrgA, {
            sku: "PROD-UNIQUE-101",
            name: "Produit Test Doublon",
            category: "Test",
            unitPriceMinor: 2000,
        })).rejects.toThrow("Un produit avec ce SKU existe déjà dans votre organisation.");
    });
    (0, vitest_1.it)("allows same SKU across different organizations", async () => {
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
        (0, vitest_1.expect)(pOrgA.organizationId).toBe("org-diallo");
        (0, vitest_1.expect)(pOrgB.organizationId).toBe("org-b");
        (0, vitest_1.expect)(pOrgA.id).not.toBe(pOrgB.id);
    });
    (0, vitest_1.it)("strictly prevents cross-tenant product retrieval and mutation", async () => {
        const pOrgA = await productsService.createProduct(adminContextOrgA, {
            sku: "SKU-ISOLATED-123",
            name: "Produit Org A Confidentiel",
            category: "Test",
            unitPriceMinor: 5000,
        });
        // Org B user attempts to get Org A Product -> fails with 404 NotFound
        await (0, vitest_1.expect)(productsService.getProduct(adminContextOrgB, pOrgA.id)).rejects.toThrow("Produit introuvable.");
        // Org B user attempts to update Org A Product -> fails with 404 NotFound
        await (0, vitest_1.expect)(productsService.updateProduct(adminContextOrgB, pOrgA.id, { name: "Hacked Name" })).rejects.toThrow("Produit introuvable.");
    });
    (0, vitest_1.it)("supports product updates without rewriting historical sale line snapshots", async () => {
        // 1. Create product
        const product = await productsService.createProduct(adminContextOrgA, {
            sku: "SKU-PRICE-CHANGE",
            name: "Savon Marseille",
            category: "Hygiène",
            unitPriceMinor: 500,
            initialStock: 20,
        });
        // 2. Perform a Sale using product at 500 FCFA
        const saleRow = await database_1.prisma.sale.create({
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
        await database_1.prisma.saleLine.create({
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
        (0, vitest_1.expect)(updated.unitPriceMinor).toBe(800);
        // 4. Verify historical SaleLine snapshot remains EXACTLY 500 FCFA
        const historicalLine = await database_1.prisma.saleLine.findUniqueOrThrow({
            where: { organizationId_id: { organizationId: "org-diallo", id: "line-hist-001" } },
        });
        (0, vitest_1.expect)(historicalLine.unitPriceMinor).toBe(500);
        (0, vitest_1.expect)(historicalLine.productNameSnapshot).toBe("Savon Marseille");
    });
    (0, vitest_1.it)("archives product soft-delete maintaining historical document references", async () => {
        const product = await productsService.createProduct(adminContextOrgA, {
            sku: "SKU-TO-ARCHIVE",
            name: "Produit Obsolète",
            category: "Test",
            unitPriceMinor: 300,
        });
        const archived = await productsService.archiveProduct(adminContextOrgA, product.id);
        (0, vitest_1.expect)(archived.status).toBe("archived");
        // Default list hidden archived
        const listRes = await productsService.listProducts(adminContextOrgA);
        const foundInActiveList = listRes.data.find((p) => p.id === product.id);
        (0, vitest_1.expect)(foundInActiveList).toBeUndefined();
        // Explicit query includes archived
        const archivedListRes = await productsService.listProducts(adminContextOrgA, { status: "archived" });
        const foundInArchivedList = archivedListRes.data.find((p) => p.id === product.id);
        (0, vitest_1.expect)(foundInArchivedList).toBeDefined();
    });
});
