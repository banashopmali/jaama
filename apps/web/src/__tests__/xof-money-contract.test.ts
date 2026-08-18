import { describe, it, expect } from "vitest";
import { buildCreateSaleApiPayload } from "../features/pos/pos.api";
import { PosCartLine } from "../features/pos/pos.types";

describe("JAAMA POS XOF Money Contract & Credit Sale Rules (JAA-S0-06 / P0)", () => {
  const sampleCart: PosCartLine[] = [
    {
      productId: "prod-004",
      sku: "RIZ-5K",
      name: "Riz Parfumé 5kg",
      unitPrice: 6500, // 6500 FCFA integer
      quantity: 10,
      maxAvailableStock: 20,
    },
  ];

  it("builds payload using exact integer FCFA values WITHOUT multiplying by 100", () => {
    const payload = buildCreateSaleApiPayload(
      sampleCart,
      5000, // 5000 FCFA discount input
      "wave",
      50000, // 50000 FCFA paid input
      50000,
      [],
      "test-xof-key-1",
      "cust-walk-in"
    );

    // 50000 UI -> amountMinor MUST BE 50000 (NOT 5000000!)
    expect(payload.discountMinor).toBe(5000);
    expect(payload.payments.length).toBe(1);
    expect(payload.payments[0].amountMinor).toBe(50000);
    expect(payload.payments[0].method).toBe("wave");
  });

  it("builds payload with empty payments array for credit sale (zero-payment invariant)", () => {
    const payload = buildCreateSaleApiPayload(
      sampleCart,
      0,
      "credit", // Credit sale!
      0,
      0,
      [],
      "test-credit-key-1",
      "cust-walk-in"
    );

    expect(payload.payments).toEqual([]);
  });
});
