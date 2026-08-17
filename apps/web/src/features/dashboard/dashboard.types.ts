export type DashboardStateMode = "populated" | "empty" | "loading" | "partial-error";

export type TrendDirection = "up" | "down" | "neutral";

export type PaymentStatus = "Payée" | "Partiellement payée" | "À encaisser" | "Remboursée";

export type SaleStatus = "Terminée" | "Annulée" | "Remboursée" | "Partiellement remboursée";

export interface DashboardMetric {
  id: string;
  label: string;
  formattedValue: string;
  rawValue: number;
  unit?: string;
  trend?: {
    value: string;
    direction: TrendDirection;
    periodContext: string;
  };
  subtitle?: string;
  helperText?: string;
}

export interface SalesTrendPoint {
  dayLabel: string;
  dateStr: string;
  amount: number;
}

export interface AttentionItemData {
  id: string;
  category: "payment" | "inventory" | "invoice";
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export interface RecentSaleItem {
  id: string;
  reference: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
  timestamp: string;
}

export interface QuickActionItem {
  id: string;
  label: string;
  href: string;
  iconName: "plus-circle" | "package-plus" | "file-text" | "wallet-cards";
  description: string;
}

export interface DashboardSnapshot {
  userFirstName: string;
  businessName: string;
  periodLabel: string;
  hasBusinessActivity: boolean;
  metrics: {
    todaySales: DashboardMetric;
    salesCount: DashboardMetric;
    toCollect: DashboardMetric;
    lowStock: DashboardMetric;
  };
  salesTrend: {
    points: SalesTrendPoint[];
    summaryText: string;
    percentageChange: number;
  };
  attentionItems: AttentionItemData[];
  recentSales: RecentSaleItem[];
  quickActions: QuickActionItem[];
}
