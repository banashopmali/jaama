import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { seedPostgresDatabase } from "../seed";

describe("JAAMA Database-Level Multi-Tenant Isolation Constraints (JAA-S0-08 / P0)", () => {
  const prisma = new PrismaClient();

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    // Create 2nd Organization: Org B (Mali Tech)
    await prisma.organization.create({
      data: {
        id: "org-mali-tech",
        name: "Mali Tech",
        slug: "mali-tech",
        status: "active",
      },
    });

    // Create Product in Org B
    await prisma.product.create({
      data: {
        id: "prod-org-b",
        organizationId: "org-mali-tech",
        sku: "PROD-B-1",
        name: "Produit Org B",
        category: "Test",
        unitPriceMinor: 1000,
      },
    });

    // Create Customer in Org B
    await prisma.customer.create({
      data: {
        id: "cust-org-b",
        organizationId: "org-mali-tech",
        name: "Client Org B",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("REJECTS Org A Sale referencing Org B Customer at database Foreign Key constraint level", async () => {
    // Org A = org-diallo, Customer = cust-org-b (belongs to org-mali-tech)
    await expect(
      prisma.sale.create({
        data: {
          id: "sale-cross-tenant-cust",
          organizationId: "org-diallo",
          reference: "VTE-CROSS-1",
          customerId: "cust-org-b", // Cross tenant!
          sellerUserId: "user-hamidou",
          subtotalMinor: 500,
          totalMinor: 500,
          remainingMinor: 500,
        },
      })
    ).rejects.toThrow();
  });

  it("REJECTS Org A SaleLine referencing Org B Product at database Foreign Key constraint level", async () => {
    // Create valid Sale in Org A
    const saleA = await prisma.sale.create({
      data: {
        id: "sale-org-a",
        organizationId: "org-diallo",
        reference: "VTE-ORG-A-1",
        sellerUserId: "user-hamidou",
        subtotalMinor: 500,
        totalMinor: 500,
        remainingMinor: 500,
      },
    });

    // Attempt inserting SaleLine in Org A pointing to prod-org-b
    await expect(
      prisma.saleLine.create({
        data: {
          id: "line-cross-tenant-prod",
          organizationId: "org-diallo",
          saleId: saleA.id,
          productId: "prod-org-b", // Cross tenant product!
          productNameSnapshot: "Produit Org B",
          skuSnapshot: "PROD-B-1",
          quantity: 1,
          unitPriceMinor: 1000,
          lineTotalMinor: 1000,
        },
      })
    ).rejects.toThrow();
  });

  it("REJECTS Org A Payment referencing Org B Sale at database Foreign Key constraint level", async () => {
    // Create Sale in Org B
    const saleB = await prisma.sale.create({
      data: {
        id: "sale-org-b",
        organizationId: "org-mali-tech",
        reference: "VTE-ORG-B-1",
        sellerUserId: "user-hamidou",
        subtotalMinor: 1000,
        totalMinor: 1000,
        remainingMinor: 1000,
      },
    });

    // Attempt inserting Payment in Org A referencing sale-org-b
    await expect(
      prisma.payment.create({
        data: {
          id: "pay-cross-tenant-sale",
          organizationId: "org-diallo", // Org A
          saleId: saleB.id,             // Org B Sale!
          method: "cash",
          amountMinor: 1000,
        },
      })
    ).rejects.toThrow();
  });

  it("REJECTS Org A StockMovement referencing Org B Product at database Foreign Key constraint level", async () => {
    await expect(
      prisma.stockMovement.create({
        data: {
          id: "mv-cross-tenant-prod",
          organizationId: "org-diallo",
          productId: "prod-org-b", // Org B Product!
          movementType: "SALE_OUT",
          quantityDelta: -1,
        },
      })
    ).rejects.toThrow();
  });
});
