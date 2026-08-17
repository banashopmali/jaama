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
