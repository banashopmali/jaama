import { PaymentMethod, PaymentStatus } from "../sales/sales.types";
import { PosCartLine, PosPaymentAllocation, PosProduct } from "./pos.types";

/**
 * Calculates line item total amount.
 */
export function calculateLineTotal(unitPrice: number, quantity: number): number {
  if (unitPrice < 0 || quantity < 0) return 0;
  return Math.round(unitPrice * quantity);
}

/**
 * Calculates subtotal of all items in cart.
 */
export function calculateSubtotal(cart: PosCartLine[]): number {
  return cart.reduce((sum, line) => sum + calculateLineTotal(line.unitPrice, line.quantity), 0);
}

/**
 * Calculates total after applying discount.
 * Discount cannot be negative or exceed subtotal.
 */
export function calculateTotal(subtotal: number, discountAmount: number): number {
  const validDiscount = Math.max(0, Math.min(discountAmount, subtotal));
  return Math.max(0, subtotal - validDiscount);
}

/**
 * SINGLE SOURCE OF TRUTH: Calculates the actual applied paid amount towards the sale.
 *
 * - Cash: Math.min(cashReceivedInput, totalAmount)
 * - Credit: 0 FCFA (unpaid balance)
 * - Mixed: Math.min(sum(allocations), totalAmount)
 * - Single Non-Cash (Wave, OM, Card, Transfer): Math.min(paidAmountInput, totalAmount)
 */
export function calculateAppliedPaidAmount(
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  cashReceivedInput: number,
  allocations: PosPaymentAllocation[],
  totalAmount: number
): number {
  if (!paymentMethod || totalAmount <= 0) return 0;

  if (paymentMethod === "credit") {
    return 0; // Credit sale has 0 initial collected payment
  }

  if (paymentMethod === "cash") {
    return Math.min(Math.max(0, cashReceivedInput), totalAmount);
  }

  if (paymentMethod === "mixed") {
    const totalAllocated = allocations.reduce((sum, a) => sum + Math.max(0, a.amount), 0);
    return Math.min(totalAllocated, totalAmount);
  }

  return Math.min(Math.max(0, paidAmountInput), totalAmount);
}

/**
 * Calculates remaining balance collectible on the sale.
 * Remaining amount can never be negative.
 */
export function calculateRemaining(totalAmount: number, paidAmount: number): number {
  return Math.max(0, totalAmount - paidAmount);
}

/**
 * Derives exact PaymentStatus from total and applied paid amounts.
 *
 * RULES:
 * - paid <= 0          -> "À encaisser"
 * - 0 < paid < total   -> "Partiellement payée"
 * - paid >= total      -> "Payée"
 */
export function derivePaymentStatus(totalAmount: number, paidAmount: number): PaymentStatus {
  if (totalAmount <= 0) return "Payée";
  if (paidAmount <= 0) return "À encaisser";
  if (paidAmount < totalAmount) return "Partiellement payée";
  return "Payée";
}

/**
 * Validates checkout parameters before sale confirmation.
 */
export function validatePosCheckout(
  cart: PosCartLine[],
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  cashReceivedInput: number,
  allocations: PosPaymentAllocation[],
  totalAmount: number
): string | null {
  if (cart.length === 0) {
    return "Votre panier est vide.";
  }
  if (!paymentMethod) {
    return "Veuillez sélectionner un mode de règlement.";
  }
  if (totalAmount <= 0) {
    return "Le montant total de la vente doit être supérieur à 0 FCFA.";
  }

  if (paymentMethod !== "cash" && paymentMethod !== "mixed" && paymentMethod !== "credit") {
    if (paidAmountInput > totalAmount) {
      return "Le montant encaissé ne peut pas dépasser le total de la vente.";
    }
  }

  if (paymentMethod === "mixed") {
    if (allocations.length === 0) {
      return "Veuillez ajouter au moins un mode de règlement.";
    }

    const uniqueMethods = new Set(allocations.map((a) => a.method));
    if (uniqueMethods.size < allocations.length) {
      return "Un mode de règlement ne peut être utilisé qu’une seule fois.";
    }

    const hasInvalidAllocation = allocations.some((a) => a.amount <= 0);
    if (hasInvalidAllocation) {
      return "Chaque mode de règlement doit avoir un montant supérieur à 0 FCFA.";
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalAllocated > totalAmount) {
      return "Le total des règlements ne peut pas dépasser le total de la vente.";
    }
  }

  return null;
}

/**
 * Filters catalog products against search query (name or SKU) and selected category.
 */
export function filterProducts(
  products: PosProduct[],
  searchQuery: string,
  category: string
): PosProduct[] {
  const query = searchQuery.trim().toLowerCase();

  return products.filter((product) => {
    // 1. Category Filter
    if (category !== "all" && category !== "Tous") {
      if (product.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }

    // 2. Search Query Filter (name or SKU)
    if (query) {
      const matchName = product.name.toLowerCase().includes(query);
      const matchSku = product.sku.toLowerCase().includes(query);
      if (!matchName && !matchSku) {
        return false;
      }
    }

    return true;
  });
}
