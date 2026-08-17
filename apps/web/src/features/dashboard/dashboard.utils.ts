import { DashboardMetricTrend } from "./dashboard.types";

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
 * Formats a semantic numeric trend into presentation string.
 * Example: { value: 12.5, direction: 'up', format: 'percentage' } -> "+12,5 %"
 * Example: { value: 3, direction: 'up', format: 'absolute' } -> "+3"
 */
export function formatTrend(trend: DashboardMetricTrend): string {
  const sign = trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
  const absValue = Math.abs(trend.value);

  if (trend.format === "percentage") {
    const formattedVal = absValue.toString().replace(".", ",");
    return `${sign}${formattedVal} %`;
  }

  return `${sign}${absValue}`;
}
