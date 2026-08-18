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
 * Calculates actual paid amount based on payment method and allocations.
 */
export function calculatePaidAmount(
  paymentMethod: PaymentMethod | null,
  paidAmountInput: number,
  allocations: PosPaymentAllocation[]
): number {
  if (!paymentMethod) return 0;

  if (paymentMethod === "mixed") {
    return allocations.reduce((sum, alloc) => sum + Math.max(0, alloc.amount), 0);
  }

  if (paymentMethod === "credit") {
    return 0; // Credit sale has 0 initial collected payment
  }

  return Math.max(0, paidAmountInput);
}

/**
 * Calculates remaining balance collectible on the sale.
 * Remaining amount can never be negative.
 */
export function calculateRemaining(totalAmount: number, paidAmount: number): number {
  return Math.max(0, totalAmount - paidAmount);
}

/**
 * Derives exact PaymentStatus from total and paid amounts.
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
