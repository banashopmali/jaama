import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ConflictException } from "@nestjs/common";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { SalesService } from "../sales/sales.service";
import { UserContext } from "@jaama/types";

describe("JAAMA Concurrent Same-Key Idempotency & Reference Integrity against PostgreSQL (JAA-S0-14 / JAA-S0-15 / Option B)", () => {
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

  it("executes two SIMULTANEOUS create-sale requests with SAME key (OPTION B): 1 succeeds (201), 1 receives deterministic 409 Conflict, exactly 1 Sale persisted, and sequential replay returns cached Sale", async () => {
    const payload = {
      lines: [{ productId: "prod-001", quantity: 2 }], // Unit price 500 = 1000 FCFA
      payments: [{ method: "cash", amountMinor: 1000 }],
      idempotencyKey: "same-key-concurrency-option-b-001",
    };

    // Execute 2 concurrent requests with the SAME key
    const results = await Promise.allSettled([
      salesService.createSale(userContext, payload, prisma),
      salesService.createSale(userContext, payload, prisma),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    // Exactly 1 request fulfilled, 1 rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Rejected request must be ConflictException (409), not unhandled P2002
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect((rejected[0].reason as ConflictException).getStatus()).toBe(409);

    const firstSale = fulfilled[0].value;
    expect(firstSale.reference).toBe("VTE-0025");

    // Exact ledger integrity counts in PostgreSQL
    const salesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(salesCount).toBe(1);

    const paymentsCount = await prisma.payment.count({ where: { organizationId: "org-diallo" } });
    expect(paymentsCount).toBe(1);

    const movements = await prisma.stockMovement.findMany({ where: { organizationId: "org-diallo" } });
    expect(movements.length).toBe(1);

    const audits = await prisma.auditEvent.count({ where: { organizationId: "org-diallo" } });
    expect(audits).toBe(1);

    const outbox = await prisma.outboxEvent.count({ where: { organizationId: "org-diallo" } });
    expect(outbox).toBe(1);

    // Balance decremented by exactly 2 (45 -> 43)
    const balance = await prisma.inventoryBalance.findUnique({
      where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-001" } },
    });
    expect(balance?.availableQuantity).toBe(43);

    // Sequential replay with same key returns exact cached Sale response
    const replayedSale = await salesService.createSale(userContext, payload, prisma);
    expect(replayedSale.id).toBe(firstSale.id);
    expect(replayedSale.reference).toBe(firstSale.reference);

    // Database counts remain unchanged after replay
    const replayedSalesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(replayedSalesCount).toBe(1);
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
