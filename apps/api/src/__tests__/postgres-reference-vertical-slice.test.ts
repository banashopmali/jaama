import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, seedPostgresDatabase, PrismaSessionRepository } from "@jaama/database";
import { SalesService } from "../sales/sales.service";
import { UserContext } from "@jaama/types";

describe("JAAMA Reference Create Sale Vertical Slice against PostgreSQL (JAA-S0-17 / CERTIFICATION PROOF)", () => {
  const salesService = new SalesService();
  const sessionRepo = new PrismaSessionRepository(prisma);

  let userContext: UserContext;

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    // Ensure Lait Nido (prod-003) unitPriceMinor is 5000 FCFA
    await prisma.product.update({
      where: { organizationId_id: { organizationId: "org-diallo", id: "prod-003" } },
      data: { unitPriceMinor: 5000 },
    });

    await sessionRepo.createSession("user-hamidou", "token-slice-123", new Date(Date.now() + 3600000));

    userContext = {
      actorId: "user-hamidou",
      organizationId: "org-diallo",
      membershipId: "org-diallo:user-hamidou",
      permissions: ["sales.create"],
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("executes authoritative vertical slice against real PostgreSQL: Hamidou @ Diallo Commerce, Total 75 000 FCFA, Paid 50 000 FCFA (Wave), Remaining 25 000 FCFA", async () => {
    // Payload: 10x Riz Parfumé 5kg (65 000) + 2x Lait Nido 400g (10 000) = 75 000 FCFA
    // Payment: Wave 50 000 FCFA
    const payload = {
      customerId: null, // Client comptoir
      lines: [
        { productId: "prod-004", quantity: 10 },
        { productId: "prod-003", quantity: 2 },
      ],
      discountMinor: 0,
      payments: [{ method: "wave", amountMinor: 50000 }],
      idempotencyKey: "ref-postgres-slice-001",
    };

    // 1. Execute Sale Transaction
    const sale = await salesService.createSale(userContext, payload, prisma);

    // 2. Assert Returned Entity Values
    expect(sale.id).toBeDefined();
    expect(sale.organizationId).toBe("org-diallo");
    expect(sale.sellerUserId).toBe("user-hamidou");
    expect(sale.customerId).toBeNull();
    expect(sale.subtotalMinor).toBe(75000);
    expect(sale.discountMinor).toBe(0);
    expect(sale.totalMinor).toBe(75000);
    expect(sale.paidMinor).toBe(50000);
    expect(sale.remainingMinor).toBe(25000);
    expect(sale.saleStatus).toBe("COMPLETED");
    expect(sale.paymentStatus).toBe("PARTIALLY_PAID");

    // 3. Assert Real PostgreSQL Database Ledger Persistence
    const dbSale = await prisma.sale.findUnique({
      where: { organizationId_id: { organizationId: "org-diallo", id: sale.id } },
      include: { lines: true, payments: true },
    });

    expect(dbSale).not.toBeNull();
    expect(dbSale?.reference).toBe(sale.reference);
    expect(dbSale?.lines.length).toBe(2);

    // Payments in PostgreSQL
    const dbPayments = await prisma.payment.findMany({
      where: { organizationId: "org-diallo", saleId: sale.id },
    });
    expect(dbPayments.length).toBe(1);
    expect(dbPayments[0].method).toBe("wave");
    expect(dbPayments[0].amountMinor).toBe(50000);
    expect(dbPayments[0].status).toBe("SUCCESS");

    // Stock Level Decrement in PostgreSQL (Riz initial 20 -> 10, Nido initial 10 -> 8)
    const rizBalance = await prisma.inventoryBalance.findUnique({
      where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-004" } },
    });
    expect(rizBalance?.availableQuantity).toBe(10);

    const nidoBalance = await prisma.inventoryBalance.findUnique({
      where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-003" } },
    });
    expect(nidoBalance?.availableQuantity).toBe(8);

    // Stock Movements in PostgreSQL
    const movements = await prisma.stockMovement.findMany({
      where: { organizationId: "org-diallo", reference: sale.reference },
    });
    expect(movements.length).toBe(2);

    // Audit Event in PostgreSQL
    const audit = await prisma.auditEvent.findFirst({
      where: { organizationId: "org-diallo", resourceId: sale.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe("user-hamidou");

    // Outbox Event in PostgreSQL
    const outbox = await prisma.outboxEvent.findFirst({
      where: { organizationId: "org-diallo", aggregateId: sale.id },
    });
    expect(outbox).not.toBeNull();
    expect(outbox?.eventType).toBe("SaleCreated");

    // Idempotency Record in PostgreSQL
    const idempRecord = await prisma.idempotencyRecord.findUnique({
      where: {
        organizationId_operation_idempotencyKey: {
          organizationId: "org-diallo",
          operation: "sales.create",
          idempotencyKey: "ref-postgres-slice-001",
        },
      },
    });
    expect(idempRecord).not.toBeNull();
    expect(idempRecord?.status).toBe("COMPLETED");

    // 4. Assert Idempotent Replay on Duplicate Request
    const replayedSale = await salesService.createSale(userContext, payload, prisma);
    expect(replayedSale.id).toBe(sale.id);

    // Verify DB count did not duplicate
    const finalSalesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(finalSalesCount).toBe(1);
  });
});
