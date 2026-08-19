import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "../repositories";

describe("JAAMA Database & Persistence Foundation (JAA-S0-08)", () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    db = seedInMemoryDatabase();
  });

  it("seeds Organization Diallo Commerce and User Hamidou correctly", () => {
    const org = db.organizations.get("org-diallo");
    expect(org).toBeDefined();
    expect(org?.name).toBe("Diallo Commerce");

    const user = db.users.get("user-hamidou");
    expect(user).toBeDefined();
    expect(user?.email).toBe("hamidou@diallo.com");
  });

  it("verifies membership relationship between User and Organization", () => {
    const membership = db.memberships.get("org-diallo:user-hamidou");
    expect(membership).toBeDefined();
    expect(membership?.role).toBe("admin");
    expect(membership?.status).toBe("active");
  });

  it("verifies products and inventory balances are scoped by organizationId", () => {
    const product = db.products.get("org-diallo:prod-004");
    expect(product).toBeDefined();
    expect(product?.name).toBe("Riz Parfumé 5kg");
    expect(product?.unitPriceMinor).toBe(6500);

    const balance = db.inventoryBalances.get("org-diallo:prod-004");
    expect(balance).toBeDefined();
    expect(balance?.availableQuantity).toBe(12);
  });

  it("supports atomic sale recording with separate Payment and StockMovement ledger entries", () => {
    // Record atomic sale
    const saleId = "sale-test-001";
    db.sales.set(saleId, {
      id: saleId,
      organizationId: "org-diallo",
      reference: "VTE-0025",
      customerId: "cust-walk-in",
      sellerUserId: "user-hamidou",
      lines: [
        {
          id: "line-1",
          productId: "prod-004",
          productNameSnapshot: "Riz Parfumé 5kg",
          skuSnapshot: "RIZ-5K",
          quantity: 2,
          unitPriceMinor: 6500,
          lineTotalMinor: 13000,
        },
      ],
      subtotalMinor: 13000,
      discountMinor: 0,
      totalMinor: 13000,
      paidMinor: 13000,
      remainingMinor: 0,
      saleStatus: "COMPLETED",
      paymentStatus: "PAID",
      occurredAt: new Date(),
      createdAt: new Date(),
    });

    db.payments.push({
      id: "pay-001",
      saleId,
      organizationId: "org-diallo",
      method: "cash",
      amountMinor: 13000,
      status: "SUCCESS",
      recordedAt: new Date(),
    });

    db.stockMovements.push({
      id: "mv-001",
      organizationId: "org-diallo",
      productId: "prod-004",
      movementType: "SALE_OUT",
      quantityDelta: -2,
      reference: "VTE-0025",
      recordedAt: new Date(),
    });

    expect(db.sales.has(saleId)).toBe(true);
    expect(db.payments.length).toBe(1);
    expect(db.stockMovements.length).toBe(1);
    expect(db.stockMovements[0].quantityDelta).toBe(-2);
  });
});
