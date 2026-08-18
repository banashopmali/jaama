import React from "react";
import { CheckCircle2, User, ShoppingBag, CreditCard } from "lucide-react";
import { PaymentMethod, PaymentStatus } from "../../sales/sales.types";
import { PosCartLine, PosCustomer } from "../pos.types";
import { formatMoney, getPaymentMethodLabel } from "../../sales/sales.utils";
import { PaymentStatusBadge } from "../../sales/components/PaymentStatusBadge";

export interface SaleReviewProps {
  customer: PosCustomer;
  cart: PosCartLine[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export const SaleReview: React.FC<SaleReviewProps> = ({
  customer,
  cart,
  subtotal,
  discountAmount,
  totalAmount,
  paidAmount,
  remainingAmount,
  paymentMethod,
  paymentStatus,
}) => {
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border-brand-subtle bg-surface-brand-subtle">
      <div className="flex items-center justify-between border-b border-border-brand-subtle pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-content-brand">
          <CheckCircle2 className="w-4 h-4" />
          <span>Récapitulatif avant confirmation</span>
        </div>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Customer Info */}
        <div className="space-y-0.5">
          <span className="text-content-secondary flex items-center gap-1">
            <User className="w-3 h-3 text-content-muted" />
            Client :
          </span>
          <span className="font-bold text-content-primary block truncate">
            {customer.name}
          </span>
        </div>

        {/* Items Summary */}
        <div className="space-y-0.5">
          <span className="text-content-secondary flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-content-muted" />
            Articles :
          </span>
          <span className="font-bold text-content-primary block">
            {itemCount === 1 ? "1 article" : `${itemCount} articles`}
          </span>
        </div>

        {/* Payment Method Info */}
        <div className="space-y-0.5">
          <span className="text-content-secondary flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-content-muted" />
            Règlement :
          </span>
          <span className="font-bold text-content-primary block">
            {getPaymentMethodLabel(paymentMethod)}
          </span>
        </div>
      </div>

      {/* Financial Totals */}
      <div className="pt-2 border-t border-border-brand-subtle space-y-1 text-xs">
        <div className="flex justify-between text-content-secondary">
          <span>Sous-total</span>
          <span>{formatMoney(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-status-warning font-semibold">
            <span>Remise appliquée</span>
            <span>-{formatMoney(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between font-extrabold text-sm text-content-primary pt-1 font-sans">
          <span>Total vente</span>
          <span className="text-content-brand">{formatMoney(totalAmount)}</span>
        </div>

        <div className="flex justify-between text-xs pt-1 border-t border-border-brand-subtle">
          <span>Montant perçu : <strong className="text-content-primary">{formatMoney(paidAmount)}</strong></span>
          <span>Reste : <strong className="text-status-warning">{formatMoney(remainingAmount)}</strong></span>
        </div>
      </div>
    </div>
  );
};
