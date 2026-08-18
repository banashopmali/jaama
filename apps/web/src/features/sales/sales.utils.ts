import {
  PaymentMethod,
  SaleListItem,
  SalesFilterState,
  SalesSummaryData,
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
 * Computes exact summary metrics over a dataset of sales.
 */
export function calculateSalesSummary(sales: SaleListItem[]): SalesSummaryData {
  let totalSalesAmount = 0;
  let totalCollectedAmount = 0;
  let totalToCollectAmount = 0;

  for (const sale of sales) {
    if (sale.saleStatus !== "Annulée") {
      totalSalesAmount += sale.totalAmount;
      totalCollectedAmount += sale.paidAmount;
      totalToCollectAmount += sale.remainingAmount;
    }
  }

  return {
    totalSalesCount: sales.length,
    totalSalesAmount,
    totalCollectedAmount,
    totalToCollectAmount,
  };
}
