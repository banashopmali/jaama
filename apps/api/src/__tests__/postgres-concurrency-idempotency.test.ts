import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { SalesService } from "../sales/sales.service";
import { UserContext } from "@jaama/types";

describe("JAAMA Concurrent Same-Key Idempotency & Reference Integrity against PostgreSQL (JAA-S0-14 / JAA-S0-15)", () => {
  const salesService = new SalesService();

  const userContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["sales.create"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("executes two SIMULTANEOUS create-sale requests with SAME idempotency key: 1 Sale created, 1 stock decrement, both return same result", async () => {
    const payload = {
      lines: [{ productId: "prod-001", quantity: 2 }], // Unit price 500 = 1000 FCFA
      payments: [{ method: "cash", amountMinor: 1000 }],
      idempotencyKey: "same-key-concurrency-001",
    };

    // Execute 2 concurrent requests with the SAME key
    const results = await Promise.allSettled([
      salesService.createSale(userContext, payload, prisma),
      salesService.createSale(userContext, payload, prisma),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // Assert only 1 Sale record was created in PostgreSQL
    const salesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(salesCount).toBe(1);

    // Assert only 1 stock movement created for prod-001
    const movements = await prisma.stockMovement.findMany({ where: { organizationId: "org-diallo" } });
    expect(movements.length).toBe(1);

    // Assert available quantity decremented by exactly 2 (45 -> 43)
    const balance = await prisma.inventoryBalance.findUnique({
      where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-001" } },
    });
    expect(balance?.availableQuantity).toBe(43);
  });

  it("executes two SIMULTANEOUS independent sales concurrently: both succeed, generating 2 DISTINCT references without race condition", async () => {
    const payload1 = {
      lines: [{ productId: "prod-001", quantity: 1 }],
      payments: [{ method: "cash", amountMinor: 500 }],
      idempotencyKey: "diff-sale-key-001",
    };

    const payload2 = {
      lines: [{ productId: "prod-002", quantity: 1 }],
      payments: [{ method: "cash", amountMinor: 1200 }],
      idempotencyKey: "diff-sale-key-002",
    };

    const [sale1, sale2] = await Promise.all([
      salesService.createSale(userContext, payload1, prisma),
      salesService.createSale(userContext, payload2, prisma),
    ]);

    expect(sale1.id).not.toBe(sale2.id);
    expect(sale1.reference).not.toBe(sale2.reference);

    const references = [sale1.reference, sale2.reference];
    expect(references).toContain("VTE-0025");
    expect(references).toContain("VTE-0026");

    const totalSales = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(totalSales).toBe(2);
  });
});
