import React from "react";
import { Eye } from "lucide-react";
import { IconButton } from "@jaama/ui";
import { SaleListItem } from "../sales.types";
import { formatMoney } from "../sales.utils";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { PaymentMethodLabel } from "./PaymentMethodLabel";

export interface SalesTableProps {
  sales: SaleListItem[];
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales }) => {
  return (
    <div className="hidden md:block overflow-x-auto rounded-xl border border-border-subtle bg-surface-default shadow-xs">
      <table className="w-full text-left text-xs select-none">
        <thead className="bg-surface-subtle text-content-muted uppercase tracking-wider font-bold border-b border-border-subtle">
          <tr>
            <th scope="col" className="py-3.5 px-4 rounded-tl-xl">
              Référence
            </th>
            <th scope="col" className="py-3.5 px-4">
              Date / heure
            </th>
            <th scope="col" className="py-3.5 px-4">
              Client
            </th>
            <th scope="col" className="py-3.5 px-4">
              Articles
            </th>
            <th scope="col" className="py-3.5 px-4">
              Montant
            </th>
            <th scope="col" className="py-3.5 px-4">
              Encaissé
            </th>
            <th scope="col" className="py-3.5 px-4">
              Mode de paiement
            </th>
            <th scope="col" className="py-3.5 px-4">
              Statut paiement
            </th>
            <th scope="col" className="py-3.5 px-4">
              Vendeur
            </th>
            <th scope="col" className="py-3.5 px-4 text-right rounded-tr-xl">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border-subtle text-content-primary">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-surface-hover transition-colors">
              {/* 1. Référence */}
              <td className="py-3.5 px-4 font-mono font-bold text-content-brand whitespace-nowrap">
                {sale.reference}
              </td>

              {/* 2. Date / heure */}
              <td className="py-3.5 px-4 font-medium text-content-secondary whitespace-nowrap">
                {sale.occurredAt}
              </td>

              {/* 3. Client */}
              <td className="py-3.5 px-4 font-semibold text-content-primary">
                {sale.customer.name}
              </td>

              {/* 4. Articles */}
              <td className="py-3.5 px-4 text-content-secondary font-medium">
                {sale.itemCount === 1 ? "1 article" : `${sale.itemCount} articles`}
              </td>

              {/* 5. Montant */}
              <td className="py-3.5 px-4 font-extrabold text-content-primary whitespace-nowrap">
                {formatMoney(sale.totalAmount)}
              </td>

              {/* 6. Encaissé */}
              <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                {formatMoney(sale.paidAmount)}
                {sale.remainingAmount > 0 && (
                  <span className="block text-[11px] font-semibold text-status-warning">
                    Reste : {formatMoney(sale.remainingAmount)}
                  </span>
                )}
              </td>

              {/* 7. Mode de paiement */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                <PaymentMethodLabel method={sale.paymentMethod} />
              </td>

              {/* 8. Statut paiement */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                <div className="flex flex-col gap-1 items-start">
                  <PaymentStatusBadge status={sale.paymentStatus} />
                  <SaleStatusBadge status={sale.saleStatus} />
                </div>
              </td>

              {/* 9. Vendeur */}
              <td className="py-3.5 px-4 text-content-secondary font-medium whitespace-nowrap">
                {sale.seller.name}
              </td>

              {/* 10. Actions (Désactivé jusqu'à JAA-S0-06+) */}
              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                <IconButton
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Disponible prochainement"
                  aria-label={`Détail de la vente ${sale.reference} bientôt disponible`}
                  icon={<Eye className="w-4 h-4 text-content-muted" />}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
