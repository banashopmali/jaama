import {
  PaymentMethod,
  PaymentStatus,
  SaleListItem,
  SalesFilterState,
  SalesSummaryData,
  SaleStatus,
} from "./sales.types";

/**
 * Formats a monetary integer amount into clean FCFA currency representation.
 * Example: 425000 -> "425 000 FCFA"
 */
export function formatMoney(amount: number, currency = "XOF"): string {
  if (isNaN(amount)) return "0 FCFA";
  const formattedNumber = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  if (currency === "XOF" || currency === "FCFA") {
    return `${formattedNumber} FCFA`;
  }
  return `${formattedNumber} ${currency}`;
}

/**
 * Translates backend SaleStatus enum into user-facing presentation string.
 */
export function mapBackendSaleStatus(status: string): SaleStatus {
  switch (status) {
    case "COMPLETED":
      return "Terminée";
    case "CANCELLED":
      return "Annulée";
    case "REFUNDED":
      return "Remboursée";
    default:
      return "Terminée";
  }
}

/**
 * Translates backend PaymentStatus enum into user-facing presentation string.
 */
export function mapBackendPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case "PAID":
      return "Payée";
    case "PARTIALLY_PAID":
      return "Partiellement payée";
    case "TO_COLLECT":
      return "À encaisser";
    case "REFUNDED":
      return "Remboursée";
    default:
      return "À encaisser";
  }
}

/**
 * Translates semantic PaymentMethod union into user-facing presentation string.
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "Espèces";
    case "wave":
      return "Wave";
    case "orange_money":
      return "Orange Money";
    case "bank_transfer":
      return "Virement";
    case "card":
      return "Carte";
    case "mixed":
      return "Mixte";
    case "credit":
      return "Crédit";
    default:
      return method;
  }
}

/**
 * Filters sales against search query and active status/method dropdowns.
 */
export function filterSales(
  sales: SaleListItem[],
  filters: SalesFilterState
): SaleListItem[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return sales.filter((sale) => {
    // 1. Search Query (reference or customer name)
    if (query) {
      const matchRef = sale.reference.toLowerCase().includes(query);
      const matchCustomer = sale.customer.name.toLowerCase().includes(query);
      if (!matchRef && !matchCustomer) {
        return false;
      }
    }

    // 2. Payment Status Filter
    if (filters.paymentStatus !== "all") {
      if (sale.paymentStatus !== filters.paymentStatus) {
        return false;
      }
    }

    // 3. Payment Method Filter
    if (filters.paymentMethod !== "all") {
      if (sale.paymentMethod !== filters.paymentMethod) {
        return false;
      }
    }

    // 4. Sale Status Filter
    if (filters.saleStatus !== "all") {
      if (sale.saleStatus !== filters.saleStatus) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes summary metrics over a dataset of sales.
 *
 * COUNT SEMANTICS:
 * - Cancelled sales (`saleStatus === "Annulée"`) are voided business events.
 *   They do NOT contribute to `totalSalesCount`, `totalSalesAmount`,
 *   `totalCollectedAmount`, or `totalToCollectAmount`.
 * - Refunded sales (`saleStatus === "Remboursée"`) maintain audit visibility
 *   where total amount and paid/collected amounts balance out to net 0 collected.
 */
export function calculateSalesSummary(sales: SaleListItem[]): SalesSummaryData {
  let totalSalesCount = 0;
  let totalSalesAmount = 0;
  let totalCollectedAmount = 0;
  let totalToCollectAmount = 0;

  for (const sale of sales) {
    if (sale.saleStatus === "Annulée") {
      continue; // Voided transactions are excluded from active sales counts & financial totals
    }

    totalSalesCount += 1;
    totalSalesAmount += sale.totalAmount;
    totalCollectedAmount += sale.paidAmount;
    totalToCollectAmount += sale.remainingAmount;
  }

  return {
    totalSalesCount,
    totalSalesAmount,
    totalCollectedAmount,
    totalToCollectAmount,
  };
}
