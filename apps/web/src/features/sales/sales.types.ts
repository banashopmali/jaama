export type SalesStateMode = "populated" | "empty" | "loading" | "error";

export type PaymentStatus = "Payée" | "Partiellement payée" | "À encaisser" | "Remboursée";

export type SaleStatus = "Terminée" | "Annulée" | "Remboursée" | "Partiellement remboursée";

export type PaymentMethod =
  | "cash"
  | "wave"
  | "orange_money"
  | "bank_transfer"
  | "card"
  | "mixed"
  | "credit";

export interface SaleCustomer {
  id?: string;
  name: string;
}

export interface SaleSeller {
  id: string;
  name: string;
}

export interface SaleListItem {
  id: string;
  reference: string;
  occurredAt: string;
  customer: SaleCustomer;
  itemCount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
  seller: SaleSeller;
}

export interface SalesSummaryData {
  totalSalesCount: number;
  totalSalesAmount: number;
  totalCollectedAmount: number;
  totalToCollectAmount: number;
}

export interface SalesFilterState {
  searchQuery: string;
  paymentStatus: PaymentStatus | "all";
  paymentMethod: PaymentMethod | "all";
  saleStatus: SaleStatus | "all";
}
