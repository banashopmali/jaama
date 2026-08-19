import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { ReportsService } from "../reports/reports.service";
import { DataExchangeService } from "../data-exchange/data-exchange.service";
import { ProductsService } from "../products/products.service";
import { InventoryService } from "../inventory/inventory.service";
import { SalesService } from "../sales/sales.service";

describe("JAA-S1-17..19 — Reports & Data Exchange Core Integration Tests against PostgreSQL", () => {
  const reportsService = new ReportsService();
  const dataExchangeService = new DataExchangeService();
  const productsService = new ProductsService();
  const inventoryService = new InventoryService();
  const salesService = new SalesService();

  const adminContextOrgA: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: [
      "reports.read",
      "exports.read",
      "imports.manage",
      "sales.read",
      "sales.create",
      "products.manage",
      "inventory.adjust",
    ],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  it("generates sales analytics report with top selling products ranking", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "REP-PROD-01",
      name: "Riz Mémé 25kg",
      category: "Alimentation",
      unitPriceMinor: 17500,
    });

    await inventoryService.recordAdjustment(adminContextOrgA, {
      productId: product.id,
      movementType: "OPENING",
      quantityDelta: 20,
    });

    await salesService.createSale(adminContextOrgA, {
      idempotencyKey: "rep-sale-01",
      lines: [{ productId: product.id, quantity: 3 }],
      payments: [{ method: "cash", amountMinor: 52500 }],
    });

    const report = await reportsService.getSalesReport(adminContextOrgA);
    expect(report.totalSalesCount).toBe(1);
    expect(report.netRevenueMinor).toBe(52500);
    expect(report.topSellingProducts.length).toBe(1);
    expect(report.topSellingProducts[0].productName).toBe("Riz Mémé 25kg");
    expect(report.topSellingProducts[0].totalQuantity).toBe(3);
  });

  it("exports products to CSV format and imports bulk product items cleanly", async () => {
    // 1. Export CSV
    const csvOutput = await dataExchangeService.exportProductsCsv(adminContextOrgA);
    expect(csvOutput).toContain("SKU;Nom;Catégorie");

    // 2. Import Bulk Items
    const importRes = await dataExchangeService.importProductsBulk(adminContextOrgA, [
      {
        sku: "IMP-PROD-01",
        name: "Lait Bonnet Rouge 1L",
        category: "Épicerie",
        unitPriceMinor: 1100,
      },
      {
        sku: "IMP-PROD-02",
        name: "Savon Fanico",
        category: "Hygiène",
        unitPriceMinor: 350,
      },
    ]);

    expect(importRes.importedCount).toBe(2);

    const importedProd = await prisma.product.findUnique({
      where: {
        organizationId_sku: {
          organizationId: adminContextOrgA.organizationId,
          sku: "IMP-PROD-01",
        },
      },
    });
    expect(importedProd?.name).toBe("Lait Bonnet Rouge 1L");
  });
});
