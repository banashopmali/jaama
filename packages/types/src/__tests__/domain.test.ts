import { describe, it, expect } from "vitest";
import {
  calculateAppliedPaidMinor,
  calculateLineTotalMinor,
  calculateRemainingMinor,
  calculateSubtotalMinor,
  calculateTotalMinor,
  createMoney,
  derivePaymentStatusFromMinor,
  formatMoneyMinor,
  Sale,
  SaleStatus,
  PaymentStatus,
} from "../index";

describe("JAAMA Domain & Business Contracts (JAA-S0-07)", () => {
  describe("Money & Minor Unit Contracts", () => {
    it("creates money objects with non-negative minor units", () => {
      const m1 = createMoney(75000, "XOF");
      expect(m1.amountMinor).toBe(75000);
      expect(m1.currencyCode).toBe("XOF");

      const m2 = createMoney(-500);
      expect(m2.amountMinor).toBe(0);
    });

    it("formats minor money correctly for XOF business locale", () => {
      expect(formatMoneyMinor(75000, "XOF")).toBe("75 000 FCFA");
      expect(formatMoneyMinor(500, "XOF")).toBe("500 FCFA");
      expect(formatMoneyMinor(1250000, "XOF")).toBe("1 250 000 FCFA");
    });
  });

  describe("Pure Domain Calculations", () => {
    it("calculates line total in minor units without floating point bugs", () => {
      expect(calculateLineTotalMinor(500, 3)).toBe(1500);
      expect(calculateLineTotalMinor(750, 2)).toBe(1500);
      expect(calculateLineTotalMinor(0, 5)).toBe(0);
      expect(calculateLineTotalMinor(-100, 2)).toBe(0);
    });

    it("calculates subtotal and total after discount in minor units", () => {
      const lines = [
        { lineTotalMinor: 50000 },
        { lineTotalMinor: 25000 },
      ];
      const subtotal = calculateSubtotalMinor(lines);
      expect(subtotal).toBe(75000);

      expect(calculateTotalMinor(subtotal, 10000)).toBe(65000);
      expect(calculateTotalMinor(subtotal, 0)).toBe(75000);
      expect(calculateTotalMinor(subtotal, 80000)).toBe(0);
    });

    it("derives payment status according to exact business rules", () => {
      expect(derivePaymentStatusFromMinor(75000, 75000)).toBe("PAID");
      expect(derivePaymentStatusFromMinor(75000, 80000)).toBe("PAID");
      expect(derivePaymentStatusFromMinor(75000, 50000)).toBe("PARTIALLY_PAID");
      expect(derivePaymentStatusFromMinor(75000, 0)).toBe("TO_COLLECT");
    });

    it("calculates remaining balance ensuring non-negative values", () => {
      expect(calculateRemainingMinor(75000, 50000)).toBe(25000);
      expect(calculateRemainingMinor(75000, 75000)).toBe(0);
      expect(calculateRemainingMinor(75000, 100000)).toBe(0);
    });

    it("calculates applied paid amount from multiple payments", () => {
      const payments = [
        { amountMinor: 30000, status: "SUCCESS" },
        { amountMinor: 20000, status: "SUCCESS" },
        { amountMinor: 10000, status: "FAILED" }, // ignored
      ];
      const applied = calculateAppliedPaidMinor(payments, 75000);
      expect(applied).toBe(50000);
      expect(calculateRemainingMinor(75000, applied)).toBe(25000);
      expect(derivePaymentStatusFromMinor(75000, applied)).toBe("PARTIALLY_PAID");
    });
  });

  describe("Sale Domain Invariants & Aggregate Boundaries", () => {
    it("allows walk-in customer context with customerId = null", () => {
      const sale: Sale = {
        id: "sale-001",
        organizationId: "org-diallo",
        reference: "VTE-0025",
        customerId: null, // Walk-in customer
        sellerUserId: "user-hamidou",
        lines: [
          {
            id: "line-1",
            productId: "prod-001",
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
        occurredAt: new Date("2026-08-18T17:30:00Z"),
        createdAt: new Date("2026-08-18T17:30:00Z"),
      };

      expect(sale.customerId).toBeNull();
      expect(sale.saleStatus).toBe<SaleStatus>("COMPLETED");
      expect(sale.paymentStatus).toBe<PaymentStatus>("PAID");
      expect(sale.lines[0].productNameSnapshot).toBe("Riz Parfumé 5kg");
    });

    it("ensures SaleStatus and PaymentStatus remain separate concepts", () => {
      const creditSale: Sale = {
        id: "sale-002",
        organizationId: "org-diallo",
        reference: "VTE-0026",
        customerId: "cust-awa",
        sellerUserId: "user-hamidou",
        lines: [],
        subtotalMinor: 75000,
        discountMinor: 0,
        totalMinor: 75000,
        paidMinor: 50000,
        remainingMinor: 25000,
        saleStatus: "COMPLETED",
        paymentStatus: "PARTIALLY_PAID",
        occurredAt: new Date(),
        createdAt: new Date(),
      };

      expect(creditSale.saleStatus).toBe("COMPLETED");
      expect(creditSale.paymentStatus).toBe("PARTIALLY_PAID");
      expect(creditSale.remainingMinor).toBe(25000);
    });
  });
});
