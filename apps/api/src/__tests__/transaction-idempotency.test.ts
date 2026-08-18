import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { SaleApplicationService } from "../services/sale-application.service";
import { IdempotencyService } from "../services/idempotency.service";

describe("JAAMA Transactions, Idempotency & Stock Concurrency (JAA-S0-14)", () => {
  let db: InMemoryDatabase;
  let saleService: SaleApplicationService;
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    saleService = new SaleApplicationService();
    idempotencyService = new IdempotencyService();
  });

  describe("Idempotency Replay & Conflict Prevention", () => {
    it("returns exact cached Sale result on duplicate Idempotency-Key submission without creating duplicate DB sales or stock decrements", async () => {
      const payload = {
        lines: [{ productId: "prod-004", quantity: 1 }], // Riz Parfumé 5kg (stock: 12)
        payments: [{ method: "cash", amountMinor: 6500 }],
        idempotencyKey: "key-sale-001",
      };

      const run1 = await idempotencyService.handleIdempotency(
        db,
        "org-diallo",
        "sales.create",
        payload.idempotencyKey,
        payload,
        () => saleService.createSale(db, payload, "org-diallo", "user-hamidou")
      );

      expect(run1.cached).toBe(false);
      expect(run1.result.reference).toBeDefined();

      const initialSalesCount = db.sales.size;
      const initialStock = db.inventoryBalances.get("org-diallo:prod-004")?.availableQuantity;

      // Duplicate submission
      const run2 = await idempotencyService.handleIdempotency(
        db,
        "org-diallo",
        "sales.create",
        payload.idempotencyKey,
        payload,
        () => saleService.createSale(db, payload, "org-diallo", "user-hamidou")
      );

      expect(run2.cached).toBe(true);
      expect(run2.result.id).toBe(run1.result.id);
      expect(run2.result.reference).toBe(run1.result.reference);

      // Verify NO duplicate DB sale or double stock decrement
      expect(db.sales.size).toBe(initialSalesCount);
      expect(db.inventoryBalances.get("org-diallo:prod-004")?.availableQuantity).toBe(initialStock);
    });

    it("rejects altered payload submitted with pre-existing Idempotency-Key", async () => {
      const payload1 = {
        lines: [{ productId: "prod-001", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 500 }],
        idempotencyKey: "key-sale-conflict",
      };

      await idempotencyService.handleIdempotency(
        db,
        "org-diallo",
        "sales.create",
        payload1.idempotencyKey,
        payload1,
        () => saleService.createSale(db, payload1, "org-diallo", "user-hamidou")
      );

      const payload2 = {
        lines: [{ productId: "prod-001", quantity: 5 }], // Altered quantity
        payments: [{ method: "cash", amountMinor: 2500 }],
        idempotencyKey: "key-sale-conflict",
      };

      await expect(
        idempotencyService.handleIdempotency(
          db,
          "org-diallo",
          "sales.create",
          payload2.idempotencyKey,
          payload2,
          () => saleService.createSale(db, payload2, "org-diallo", "user-hamidou")
        )
      ).rejects.toThrow("Conflit d'idempotence : La même clé a été soumise avec une charge différente.");
    });
  });

  describe("Atomic Stock & Transaction Integrity", () => {
    it("prevents stock overselling when available inventory is depleted", async () => {
      // Prod 3 (Lait Nido) has stock 3
      const payload1 = {
        lines: [{ productId: "prod-003", quantity: 2 }],
        payments: [{ method: "cash", amountMinor: 9000 }],
      };
      await saleService.createSale(db, payload1, "org-diallo", "user-hamidou");

      const balanceAfter1 = db.inventoryBalances.get("org-diallo:prod-003")?.availableQuantity;
      expect(balanceAfter1).toBe(1); // 3 - 2 = 1

      // Second sale attempting quantity 2 (only 1 remaining)
      const payload2 = {
        lines: [{ productId: "prod-003", quantity: 2 }],
        payments: [{ method: "cash", amountMinor: 9000 }],
      };

      await expect(
        saleService.createSale(db, payload2, "org-diallo", "user-hamidou")
      ).rejects.toThrow("Stock insuffisant pour le produit : Lait Nido 400g");

      // Verify stock did not become negative
      const balanceAfter2 = db.inventoryBalances.get("org-diallo:prod-003")?.availableQuantity;
      expect(balanceAfter2).toBe(1);
    });
  });
});
