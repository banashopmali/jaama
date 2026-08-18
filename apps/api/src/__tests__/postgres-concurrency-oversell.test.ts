import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { SalesService } from "../sales/sales.service";
import { UserContext } from "@jaama/types";

describe("JAAMA Real PostgreSQL Stock Concurrency & Oversell Protection (JAA-S0-14 / P0)", () => {
  const salesService = new SalesService();

  const userContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["sales.create"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    // Set Lait Nido (prod-003) stock to EXACTLY 1 in PostgreSQL
    await prisma.inventoryBalance.update({
      where: {
        organizationId_productId: {
          organizationId: "org-diallo",
          productId: "prod-003",
        },
      },
      data: {
        availableQuantity: 1,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("executes two GENUINELY CONCURRENT sale attempts for stock=1: exactly 1 succeeds, 1 fails, final stock=0", async () => {
    const payload1 = {
      lines: [{ productId: "prod-003", quantity: 1 }], // Unit price 5000 FCFA
      payments: [{ method: "cash", amountMinor: 5000 }],
      idempotencyKey: "conc-sale-attempt-1",
    };

    const payload2 = {
      lines: [{ productId: "prod-003", quantity: 1 }],
      payments: [{ method: "cash", amountMinor: 5000 }],
      idempotencyKey: "conc-sale-attempt-2",
    };

    // Execute concurrently using Promise.allSettled
    const results = await Promise.allSettled([
      salesService.createSale(userContext, payload1, prisma),
      salesService.createSale(userContext, payload2, prisma),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // EXACTLY 1 SUCCEEDS AND 1 FAILS
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Assert final available stock in PostgreSQL is EXACTLY 0 (never negative)
    const finalBalance = await prisma.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId: "org-diallo",
          productId: "prod-003",
        },
      },
    });

    expect(finalBalance?.availableQuantity).toBe(0);

    // Assert exactly 1 Sale row was created in PostgreSQL for prod-003
    const salesCount = await prisma.sale.count({
      where: { organizationId: "org-diallo" },
    });
    expect(salesCount).toBe(1);

    // Assert exactly 1 SALE_OUT stock movement created
    const movements = await prisma.stockMovement.findMany({
      where: { organizationId: "org-diallo", productId: "prod-003" },
    });
    expect(movements.length).toBe(1);
    expect(movements[0].quantityDelta).toBe(-1);
  });
});
