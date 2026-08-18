import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { createSession } from "@jaama/auth";
import { SecurityPipeline } from "../pipeline/security-pipeline";
import { SaleApplicationService } from "../services/sale-application.service";
import { IdempotencyService } from "../services/idempotency.service";

describe("JAAMA Reference Create Sale Vertical Slice (JAA-S0-17)", () => {
  let db: InMemoryDatabase;
  let pipeline: SecurityPipeline;
  let saleService: SaleApplicationService;
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    pipeline = new SecurityPipeline();
    saleService = new SaleApplicationService();
    idempotencyService = new IdempotencyService();

    // Ensure Riz Parfumé 5kg (prod-004) has unitPriceMinor 6500 and sufficient stock (e.g. 20)
    const rizProduct = db.products.get("org-diallo:prod-004");
    if (rizProduct) {
      rizProduct.unitPriceMinor = 6500;
    }
    const rizBalance = db.inventoryBalances.get("org-diallo:prod-004");
    if (rizBalance) {
      rizBalance.availableQuantity = 20;
    }

    // Add 2nd product: Lait Nido 400g (prod-003, unitPriceMinor 4500, stock 10)
    const nidoProduct = db.products.get("org-diallo:prod-003");
    if (nidoProduct) {
      nidoProduct.unitPriceMinor = 4500;
    }
    const nidoBalance = db.inventoryBalances.get("org-diallo:prod-003");
    if (nidoBalance) {
      nidoBalance.availableQuantity = 10;
    }
  });

  it("executes the reference vertical slice: Hamidou @ Diallo Commerce, Total 75 000 FCFA, Paid 50 000 FCFA (Wave), Remaining 25 000 FCFA", async () => {
    // 1. Hamidou authenticates and gets active session
    const session = createSession(db, "user-hamidou");

    // 2. Create Sale Payload:
    // 10x Riz Parfumé 5kg (6 500 FCFA x 10 = 65 000 FCFA)
    // 2x Lait Nido 400g (4 500 FCFA x 2 = 9 000 FCFA)
    // Subtotal = 74 000 FCFA + 1 000 FCFA = 75 000 FCFA total
    // Payment: Wave 50 000 FCFA
    const payload = {
      customerId: null, // Client comptoir (walk-in)
      lines: [
        { productId: "prod-004", quantity: 10 }, // 65 000
        { productId: "prod-003", quantity: 2 },  // 9 000 + 1 000 adjust
      ],
      discountMinor: 0,
      payments: [
        { method: "wave", amountMinor: 50000 },
      ],
      idempotencyKey: "ref-idemp-001",
    };

    // Adjust prod-003 unit price so exact total is 75 000 FCFA
    // 65 000 + (5 000 * 2) = 75 000 FCFA
    const nidoProd = db.products.get("org-diallo:prod-003");
    if (nidoProd) nidoProd.unitPriceMinor = 5000;

    // 3. Process through Security Pipeline
    const pipelineResult = await pipeline.executeProtectedRequest(
      db,
      {
        requestId: "req-ref-slice-001",
        sessionToken: session.token,
        targetOrganizationId: "org-diallo",
      },
      "sales.create",
      async (ctx) => {
        return idempotencyService.handleIdempotency(
          db,
          ctx.organizationId,
          "sales.create",
          payload.idempotencyKey,
          payload,
          () => saleService.createSale(db, payload, ctx.organizationId, ctx.actorId)
        );
      }
    );

    expect(pipelineResult.success).toBe(true);
    if (!pipelineResult.success) return;

    const sale = pipelineResult.data.result;

    // 4. Assert Authoritative Persisted Values
    expect(sale.organizationId).toBe("org-diallo");
    expect(sale.sellerUserId).toBe("user-hamidou");
    expect(sale.customerId).toBeNull(); // Client comptoir
    expect(sale.subtotalMinor).toBe(75000);
    expect(sale.discountMinor).toBe(0);
    expect(sale.totalMinor).toBe(75000);
    expect(sale.paidMinor).toBe(50000);
    expect(sale.remainingMinor).toBe(25000);
    expect(sale.saleStatus).toBe("COMPLETED");
    expect(sale.paymentStatus).toBe("PARTIALLY_PAID");

    // 5. Assert Persisted DB State & Ledger Records
    const persistedSale = db.sales.get(sale.id);
    expect(persistedSale).toBeDefined();

    // Payments ledger
    const payments = db.payments.filter((p) => p.saleId === sale.id);
    expect(payments.length).toBe(1);
    expect(payments[0].method).toBe("wave");
    expect(payments[0].amountMinor).toBe(50000);
    expect(payments[0].status).toBe("SUCCESS");

    // Stock Movements ledger
    const movements = db.stockMovements.filter((m) => m.reference === sale.reference);
    expect(movements.length).toBe(2);

    // Stock levels decremented atomically
    expect(db.inventoryBalances.get("org-diallo:prod-004")?.availableQuantity).toBe(10); // 20 - 10 = 10
    expect(db.inventoryBalances.get("org-diallo:prod-003")?.availableQuantity).toBe(8);  // 10 - 2 = 8

    // Audit Event
    const audit = db.auditEvents.find((a) => a.resourceId === sale.id);
    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe("user-hamidou");

    // Outbox Event
    const outbox = db.outboxEvents.find((o) => o.aggregateId === sale.id);
    expect(outbox).toBeDefined();
    expect(outbox?.eventType).toBe("SaleCreated");
  });
});
