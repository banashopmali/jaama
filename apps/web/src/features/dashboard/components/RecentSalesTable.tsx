import React from "react";
import { Badge } from "@jaama/ui";
import { RecentSaleItem } from "../dashboard.types";
import { formatMoney } from "../dashboard.utils";

export interface RecentSalesTableProps {
  sales: RecentSaleItem[];
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ sales }) => {
  const getBadgeVariant = (status: RecentSaleItem["paymentStatus"]) => {
    switch (status) {
      case "Payée":
        return "success";
      case "Partiellement payée":
        return "warning";
      case "À encaisser":
        return "neutral";
      case "Remboursée":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left text-xs select-none">
        <thead className="bg-surface-subtle text-content-muted uppercase tracking-wider font-bold border-b border-border-subtle">
          <tr>
            <th scope="col" className="py-3 px-4 rounded-tl-lg">
              Référence
            </th>
            <th scope="col" className="py-3 px-4">
              Client
            </th>
            <th scope="col" className="py-3 px-4">
              Montant
            </th>
            <th scope="col" className="py-3 px-4">
              Encaissé
            </th>
            <th scope="col" className="py-3 px-4">
              Statut paiement
            </th>
            <th scope="col" className="py-3 px-4 text-right rounded-tr-lg">
              Heure
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border-subtle text-content-primary">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-surface-hover transition-colors">
              <td className="py-3.5 px-4 font-mono font-bold text-content-brand">
                {sale.reference}
              </td>
              <td className="py-3.5 px-4 font-medium">
                {sale.customerName}
              </td>
              <td className="py-3.5 px-4 font-bold">
                {formatMoney(sale.totalAmount)}
              </td>
              <td className="py-3.5 px-4 font-bold">
                {formatMoney(sale.paidAmount)}
                {sale.remainingAmount > 0 && (
                  <span className="block text-[11px] font-semibold text-status-warning">
                    Reste : {formatMoney(sale.remainingAmount)}
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4">
                <Badge variant={getBadgeVariant(sale.paymentStatus)} size="sm">
                  {sale.paymentStatus}
                </Badge>
              </td>
              <td className="py-3.5 px-4 text-right font-medium text-content-secondary">
                {sale.timestamp}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
