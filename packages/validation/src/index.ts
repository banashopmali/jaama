// Authoritative Input Validation & Error Envelope Contracts (@jaama/validation)

import { CreateSaleCommand, PaymentMethodCode } from "@jaama/types";

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export function createApiErrorEnvelope(code: string, message: string, requestId?: string): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateCreateSaleCommand(input: unknown): { valid: true; data: CreateSaleCommand } | { valid: false; error: string } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Le corps de la requête doit être un objet JSON." };
  }

  const payload = input as Record<string, any>;

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return { valid: false, error: "La vente doit contenir au moins une ligne de produit." };
  }

  for (const line of payload.lines) {
    if (!line || typeof line !== "object" || !isNonEmptyString(line.productId)) {
      return { valid: false, error: "Chaque ligne doit spécifier un 'productId' valide." };
    }
    if (typeof line.quantity !== "number" || line.quantity <= 0 || !Number.isInteger(line.quantity)) {
      return { valid: false, error: "La quantité de chaque produit doit être un entier strictement positif." };
    }
  }

  // Payments array is optional or empty array for credit/unpaid sales
  const paymentsInput = Array.isArray(payload.payments) ? payload.payments : [];
  const validMethods: PaymentMethodCode[] = ["cash", "wave", "orange_money", "bank_transfer", "card"];
  const usedMethods = new Set<string>();

  for (const pay of paymentsInput) {
    if (!pay || typeof pay !== "object" || !validMethods.includes(pay.method)) {
      return { valid: false, error: "Mode de règlement invalide." };
    }
    if (usedMethods.has(pay.method)) {
      return { valid: false, error: "Un mode de règlement ne peut être utilisé qu’une seule fois." };
    }
    usedMethods.add(pay.method);

    if (typeof pay.amountMinor !== "number" || pay.amountMinor < 0 || !Number.isInteger(pay.amountMinor)) {
      return { valid: false, error: "Le montant de chaque règlement doit être un entier positif." };
    }
  }

  const discountMinor = typeof payload.discountMinor === "number" ? Math.max(0, payload.discountMinor) : 0;

  return {
    valid: true,
    data: {
      organizationId: payload.organizationId || "",
      sellerUserId: payload.sellerUserId || "",
      customerId: payload.customerId ?? null,
      lines: payload.lines.map((l: any) => ({
        productId: l.productId,
        quantity: l.quantity,
      })),
      discountMinor,
      payments: paymentsInput.map((p: any) => ({
        method: p.method as PaymentMethodCode,
        amountMinor: p.amountMinor,
      })),
      idempotencyKey: payload.idempotencyKey || undefined,
    },
  };
}
