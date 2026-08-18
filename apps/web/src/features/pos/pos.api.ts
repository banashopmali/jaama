import { PosCartLine, PosPaymentAllocation } from "./pos.types";
import { PaymentMethod } from "../sales/sales.types";

export interface CreateSaleApiPayload {
  customerId?: string | null;
  lines: { productId: string; quantity: number }[];
  discountMinor: number;
  payments: { method: string; amountMinor: number }[];
  idempotencyKey?: string;
}

export async function submitSaleToApi(
  apiUrl: string,
  sessionToken: string,
  organizationId: string,
  cart: PosCartLine[],
  discountAmount: number,
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  cashReceivedInput: number,
  allocations: PosPaymentAllocation[],
  customerId?: string | null
) {
  const lines = cart.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));

  const discountMinor = Math.round(discountAmount * 100);
  const payments: { method: string; amountMinor: number }[] = [];

  if (paymentMethod === "cash") {
    payments.push({ method: "cash", amountMinor: Math.round(paidAmountInput * 100) });
  } else if (paymentMethod === "wave") {
    payments.push({ method: "wave", amountMinor: Math.round(paidAmountInput * 100) });
  } else if (paymentMethod === "orange_money") {
    payments.push({ method: "orange_money", amountMinor: Math.round(paidAmountInput * 100) });
  } else if (paymentMethod === "card") {
    payments.push({ method: "card", amountMinor: Math.round(paidAmountInput * 100) });
  } else if (paymentMethod === "bank_transfer") {
    payments.push({ method: "bank_transfer", amountMinor: Math.round(paidAmountInput * 100) });
  } else if (paymentMethod === "mixed") {
    for (const alloc of allocations) {
      payments.push({ method: alloc.method, amountMinor: Math.round(alloc.amount * 100) });
    }
  }

  const payload: CreateSaleApiPayload = {
    customerId: customerId || null,
    lines,
    discountMinor,
    payments,
    idempotencyKey: `pos-web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  const response = await fetch(`${apiUrl}/api/v1/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sessionToken}`,
      "X-Organization-ID": organizationId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || "Échec de l'enregistrement de la vente.");
  }

  return response.json();
}
