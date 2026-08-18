import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { SaleApplicationService } from "../services/sale-application.service";

describe("JAAMA API & Application Service Contracts (JAA-S0-12)", () => {
  let db: InMemoryDatabase;
  let saleService: SaleApplicationService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    saleService = new SaleApplicationService();
  });

  it("executes createSale command successfully for valid payload", async () => {
    const payload = {
      lines: [{ productId: "prod-004", quantity: 2 }], // Riz Parfumé 5kg (6500 x 2 = 13000)
      payments: [{ method: "cash", amountMinor: 13000 }],
    };

    const sale = await saleService.createSale(db, payload, "org-diallo", "user-hamidou");

    expect(sale.id).toBeDefined();
    expect(sale.organizationId).toBe("org-diallo");
    expect(sale.totalMinor).toBe(13000);
    expect(sale.paidMinor).toBe(13000);
    expect(sale.remainingMinor).toBe(0);
    expect(sale.saleStatus).toBe("COMPLETED");
    expect(sale.paymentStatus).toBe("PAID");

    // Verify inventory decremented
    const balance = db.inventoryBalances.get("org-diallo:prod-004");
    expect(balance?.availableQuantity).toBe(10); // initial 12 - 2 = 10
  });

  it("rejects createSale if stock is insufficient", async () => {
    const payload = {
      lines: [{ productId: "prod-003", quantity: 10 }], // Lait Nido (available: 3)
      payments: [{ method: "cash", amountMinor: 45000 }],
    };

    await expect(
      saleService.createSale(db, payload, "org-diallo", "user-hamidou")
    ).rejects.toThrow("Stock insuffisant pour le produit : Lait Nido 400g");
  });

  it("ensures getSale respects tenant isolation", async () => {
    const payload = {
      lines: [{ productId: "prod-001", quantity: 1 }],
      payments: [{ method: "cash", amountMinor: 500 }],
    };
    const sale = await saleService.createSale(db, payload, "org-diallo", "user-hamidou");

    const fetched = await saleService.getSale(db, "org-diallo", sale.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(sale.id);

    const crossFetched = await saleService.getSale(db, "org-other-tenant", sale.id);
    expect(crossFetched).toBeNull();
  });
});
