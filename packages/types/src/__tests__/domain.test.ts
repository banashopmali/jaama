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
  isValidPaymentIntentTransition,
  assertValidPaymentIntentTransition,
  isValidPaymentAttemptTransition,
  assertValidPaymentAttemptTransition,
  isValidSettlementTransition,
  assertValidSettlementTransition,
  PaymentDomainError,
  assertSafeIntegerAmount,
  validateProviderAttemptResult,
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

  describe("Sprint 2 Payment Abstraction State Machines (JAA-S2-01)", () => {
    it("validates PaymentIntent state machine transitions", () => {
      // Valid transitions
      expect(isValidPaymentIntentTransition("REQUIRES_PAYMENT", "PROCESSING")).toBe(true);
      expect(isValidPaymentIntentTransition("PROCESSING", "PAID")).toBe(true);
      expect(isValidPaymentIntentTransition("PROCESSING", "PARTIALLY_PAID")).toBe(true);
      expect(isValidPaymentIntentTransition("PARTIALLY_PAID", "PAID")).toBe(true);
      expect(isValidPaymentIntentTransition("REQUIRES_PAYMENT", "CANCELLED")).toBe(true);
      expect(isValidPaymentIntentTransition("REQUIRES_PAYMENT", "EXPIRED")).toBe(true);

      // Invalid transitions
      expect(isValidPaymentIntentTransition("PAID", "PROCESSING")).toBe(false);
      expect(isValidPaymentIntentTransition("CANCELLED", "PAID")).toBe(false);
      expect(isValidPaymentIntentTransition("EXPIRED", "REQUIRES_PAYMENT")).toBe(false);

      expect(() => {
        assertValidPaymentIntentTransition("PAID", "PROCESSING");
      }).toThrow(PaymentDomainError);
    });

    it("validates PaymentAttempt state machine transitions", () => {
      // Valid transitions
      expect(isValidPaymentAttemptTransition("CREATED", "PENDING_PROVIDER")).toBe(true);
      expect(isValidPaymentAttemptTransition("PENDING_PROVIDER", "PROCESSING")).toBe(true);
      expect(isValidPaymentAttemptTransition("PROCESSING", "SUCCEEDED")).toBe(true);
      expect(isValidPaymentAttemptTransition("PROCESSING", "FAILED")).toBe(true);

      // Terminal states
      expect(isValidPaymentAttemptTransition("SUCCEEDED", "FAILED")).toBe(false);
      expect(isValidPaymentAttemptTransition("FAILED", "PROCESSING")).toBe(false);

      expect(() => {
        assertValidPaymentAttemptTransition("SUCCEEDED", "CREATED");
      }).toThrow(PaymentDomainError);
    });

    it("validates Settlement state machine transitions", () => {
      // Valid transitions
      expect(isValidSettlementTransition("PENDING", "SETTLED")).toBe(true);
      expect(isValidSettlementTransition("PENDING", "PARTIALLY_SETTLED")).toBe(true);
      expect(isValidSettlementTransition("SETTLED", "RECONCILIATION_REQUIRED")).toBe(true);
      expect(isValidSettlementTransition("RECONCILIATION_REQUIRED", "RECONCILED")).toBe(true);

      // Terminal states
      expect(isValidSettlementTransition("RECONCILED", "PENDING")).toBe(false);
      expect(isValidSettlementTransition("FAILED", "SETTLED")).toBe(false);

      expect(() => {
        assertValidSettlementTransition("RECONCILED", "PENDING");
      }).toThrow(PaymentDomainError);
    });

    it("creates PaymentDomainError with code and structured details", () => {
      const err = new PaymentDomainError("AMOUNT_MISMATCH", "Amounts do not match", {
        expected: 5000,
        actual: 4000,
      });

      expect(err.name).toBe("PaymentDomainError");
      expect(err.code).toBe("AMOUNT_MISMATCH");
      expect(err.details).toEqual({ expected: 5000, actual: 4000 });
      expect(err.message).toContain("[AMOUNT_MISMATCH]");
    });

    it("validates safe integer money inputs with assertSafeIntegerAmount", () => {
      expect(() => assertSafeIntegerAmount(5000, "amount")).not.toThrow();
      expect(() => assertSafeIntegerAmount(0, "amount", 0)).not.toThrow();
      expect(() => assertSafeIntegerAmount(100.5, "amount")).toThrow(PaymentDomainError);
      expect(() => assertSafeIntegerAmount(-10, "amount", 0)).toThrow(PaymentDomainError);
      expect(() => assertSafeIntegerAmount(1500, "amount", 0, 1000)).toThrow(PaymentDomainError);
      expect(() => assertSafeIntegerAmount("5000", "amount")).toThrow(PaymentDomainError);
    });

    it("validates provider attempt financial result integrity with validateProviderAttemptResult", () => {
      const validAttempt = { amountMinor: 10000 };

      // Valid results
      expect(() =>
        validateProviderAttemptResult(
          { state: "SUCCEEDED", providerReference: "ref1", providerStatus: "DONE", feeMinor: 100, netMinor: 9900 },
          validAttempt
        )
      ).not.toThrow();

      expect(() =>
        validateProviderAttemptResult(
          { state: "PENDING_PROVIDER", providerReference: "ref2", providerStatus: "WAIT" },
          validAttempt
        )
      ).not.toThrow();

      // Reject non-object or null
      expect(() => validateProviderAttemptResult(null, validAttempt)).toThrow(PaymentDomainError);
      expect(() => validateProviderAttemptResult("not an object", validAttempt)).toThrow(PaymentDomainError);

      // Reject invalid state
      expect(() =>
        validateProviderAttemptResult(
          { state: "UNKNOWN_STATE", providerReference: "ref" },
          validAttempt
        )
      ).toThrow(PaymentDomainError);

      // Reject fee + net != amountMinor
      expect(() =>
        validateProviderAttemptResult(
          { state: "SUCCEEDED", feeMinor: 200, netMinor: 9000 },
          validAttempt
        )
      ).toThrow("feeMinor (200) + netMinor (9000) != attempt.amountMinor (10000)");

      // Reject negative fee
      expect(() =>
        validateProviderAttemptResult(
          { state: "SUCCEEDED", feeMinor: -50, netMinor: 10050 },
          validAttempt
        )
      ).toThrow(PaymentDomainError);

      // Reject fractional fee
      expect(() =>
        validateProviderAttemptResult(
          { state: "SUCCEEDED", feeMinor: 10.5, netMinor: 9989.5 },
          validAttempt
        )
      ).toThrow(PaymentDomainError);
    });
  });
});

