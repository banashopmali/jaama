import { PosCartLine, PosConfirmedSaleSummary, PosPaymentAllocation } from "./pos.types";
import { PaymentMethod } from "../sales/sales.types";
import {
  calculateSubtotal,
  calculateTotal,
  calculateAppliedPaidAmount,
  calculateRemaining,
  derivePaymentStatus,
} from "./pos.utils";
import { mapBackendPaymentStatus, mapBackendSaleStatus } from "../sales/sales.utils";

export interface PosApiContext {
  apiUrl: string;
  organizationId: string;
}

export interface CreateSaleApiPayload {
  customerId?: string | null;
  lines: { productId: string; quantity: number }[];
  discountMinor: number;
  payments: { method: string; amountMinor: number }[];
  idempotencyKey: string;
}

export function buildCreateSaleApiPayload(
  cart: PosCartLine[],
  discountAmount: number,
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  cashReceivedInput: number,
  allocations: PosPaymentAllocation[],
  idempotencyKey: string,
  customerId?: string | null
): CreateSaleApiPayload {
  const lines = cart.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));

  // XOF Canonical Contract: NO * 100 multiplication!
  const discountMinor = Math.max(0, Math.round(discountAmount));
  const payments: { method: string; amountMinor: number }[] = [];

  // Zero-payment / Credit sale contract: payments is [] if paymentMethod is 'credit' or null
  if (paymentMethod && paymentMethod !== "credit") {
    if (paymentMethod === "mixed") {
      for (const alloc of allocations) {
        if (alloc.amount > 0) {
          payments.push({
            method: alloc.method,
            amountMinor: Math.round(alloc.amount),
          });
        }
      }
    } else {
      // Overpayment integrity: if cash received exceeds total, ONLY applied amount is persisted
      const appliedAmount = Math.max(0, Math.round(paidAmountInput));
      if (appliedAmount > 0) {
        payments.push({
          method: paymentMethod,
          amountMinor: appliedAmount,
        });
      }
    }
  }

  return {
    customerId: customerId || null,
    lines,
    discountMinor,
    payments,
    idempotencyKey,
  };
}

/**
 * PRODUCTION AUTHORITATIVE API ADAPTER — FAILS CLOSED (P0 Contract)
 *
 * Must NEVER silently fall back to local simulated sales if network fails,
 * API URL is missing, or server returns error.
 */
export async function submitSaleToApi(
  cart: PosCartLine[],
  discountAmount: number,
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  cashReceivedInput: number,
  allocations: PosPaymentAllocation[],
  idempotencyKey: string,
  customerId: string | null | undefined,
  context: PosApiContext
): Promise<PosConfirmedSaleSummary> {
  if (!context || !context.apiUrl || !context.organizationId) {
    throw new Error(
      "Contexte d'authentification POS manquant (apiUrl, organizationId requis). Impossible de valider la vente sans session d'entreprise."
    );
  }

  const payload = buildCreateSaleApiPayload(
    cart,
    discountAmount,
    paymentMethod,
    paidAmountInput,
    cashReceivedInput,
    allocations,
    idempotencyKey,
    customerId
  );

  let response: Response;
  try {
    response = await fetch(`${context.apiUrl}/api/v1/sales`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Organization-ID": context.organizationId,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Impossible d'atteindre le serveur de caisse JAAMA. Vérifiez votre connexion réseau et réessayez."
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error?.message ||
      errorBody?.message ||
      `Erreur serveur (${response.status}) lors de l'enregistrement de la vente.`;
    throw new Error(message);
  }

  const data = await response.json();

  // Authoritative values derived strictly from backend response
  const totalAmount = data.totalMinor;
  const paidAmount = data.paidMinor;
  const remainingAmount = data.remainingMinor;
  const subtotal = data.subtotalMinor;
  const discount = data.discountMinor;
  const changeDue =
    paymentMethod === "cash" && cashReceivedInput > totalAmount
      ? cashReceivedInput - totalAmount
      : undefined;

  return {
    reference: data.reference,
    occurredAt: data.occurredAt || new Date().toISOString(),
    customer: { name: "Client", type: "walk_in" },
    itemCount: cart.reduce((acc, l) => acc + l.quantity, 0),
    subtotal,
    discountAmount: discount,
    totalAmount,
    paidAmount,
    remainingAmount,
    cashReceived: cashReceivedInput > 0 ? cashReceivedInput : undefined,
    changeDue,
    paymentMethod: paymentMethod || "cash",
    paymentStatus: mapBackendPaymentStatus(data.paymentStatus),
    saleStatus: mapBackendSaleStatus(data.saleStatus),
    isSimulated: false,
  };
}

/**
 * EXPLICIT TEST ADAPTER ONLY — Used in isolated frontend component tests
 */
export function mockSubmitSaleToApi(
  cart: PosCartLine[],
  discountAmount: number,
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  cashReceivedInput: number,
  allocations: PosPaymentAllocation[]
): PosConfirmedSaleSummary {
  const subtotal = calculateSubtotal(cart);
  const totalAmount = calculateTotal(subtotal, discountAmount);
  const appliedPaid = calculateAppliedPaidAmount(
    paymentMethod,
    paidAmountInput,
    cashReceivedInput,
    allocations,
    totalAmount
  );
  const remaining = calculateRemaining(totalAmount, appliedPaid);
  const paymentStatus = derivePaymentStatus(totalAmount, appliedPaid);
  const changeDue =
    paymentMethod === "cash" && cashReceivedInput > totalAmount
      ? cashReceivedInput - totalAmount
      : undefined;

  return {
    reference: "VTE-0025",
    occurredAt: new Date().toISOString(),
    customer: { name: "Client", type: "walk_in" },
    itemCount: cart.reduce((acc, l) => acc + l.quantity, 0),
    subtotal,
    discountAmount,
    totalAmount,
    paidAmount: appliedPaid,
    remainingAmount: remaining,
    cashReceived: cashReceivedInput > 0 ? cashReceivedInput : undefined,
    changeDue,
    paymentMethod: paymentMethod || "cash",
    paymentStatus,
    saleStatus: "Terminée",
    isSimulated: true,
  };
}
