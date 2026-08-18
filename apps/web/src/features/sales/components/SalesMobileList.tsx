import React from "react";
import { Eye } from "lucide-react";
import { IconButton } from "@jaama/ui";
import { SaleListItem } from "../sales.types";
import { formatMoney } from "../sales.utils";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { PaymentMethodLabel } from "./PaymentMethodLabel";

export interface SalesMobileListProps {
  sales: SaleListItem[];
}

export const SalesMobileList: React.FC<SalesMobileListProps> = ({ sales }) => {
  return (
    <div className="md:hidden space-y-3">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className="p-4 rounded-xl border border-border-subtle bg-surface-default shadow-xs space-y-3"
        >
          {/* Header Row: Reference & Date */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-content-brand">
              {sale.reference}
            </span>
            <span className="text-[11px] font-medium text-content-muted">
              {sale.occurredAt}
            </span>
          </div>

          {/* Customer & Total Amount */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-content-primary truncate">
                {sale.customer.name}
              </h4>
              <span className="text-xs text-content-secondary font-medium">
                {sale.itemCount === 1 ? "1 article" : `${sale.itemCount} articles`}
              </span>
            </div>

            <div className="text-right">
              <span className="text-base font-extrabold text-content-primary block">
                {formatMoney(sale.totalAmount)}
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <PaymentStatusBadge status={sale.paymentStatus} />
            <SaleStatusBadge status={sale.saleStatus} />
          </div>

          {/* Financial Breakdown for Partial / Outstanding */}
          {sale.paymentStatus === "Partiellement payée" && (
            <div className="p-2.5 rounded-lg bg-status-warning-subtle text-status-warning text-xs font-semibold flex items-center justify-between">
              <span>Encaissé : {formatMoney(sale.paidAmount)}</span>
              <span>Reste : {formatMoney(sale.remainingAmount)}</span>
            </div>
          )}

          {sale.paymentStatus === "À encaisser" && (
            <div className="p-2.5 rounded-lg bg-surface-subtle text-content-secondary text-xs font-medium flex items-center justify-between">
              <span>Reste à encaisser</span>
              <span className="font-bold text-content-primary">
                {formatMoney(sale.remainingAmount)}
              </span>
            </div>
          )}

          {/* Footer Row: Payment Method, Seller & Action */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
            <PaymentMethodLabel method={sale.paymentMethod} />

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-content-muted">
                {sale.seller.name}
              </span>
              <IconButton
                variant="ghost"
                size="sm"
                disabled
                title="Disponible prochainement"
                aria-label={`Détail de la vente ${sale.reference} bientôt disponible`}
                icon={<Eye className="w-3.5 h-3.5 text-content-muted" />}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
