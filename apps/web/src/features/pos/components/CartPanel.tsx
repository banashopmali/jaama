import React from "react";
import { ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { Button, Card } from "@jaama/ui";
import { PosCartLine, PosCustomer } from "../pos.types";
import { calculateSubtotal, calculateTotal } from "../pos.utils";
import { formatMoney } from "../../sales/sales.utils";
import { CartLine } from "./CartLine";
import { CustomerSelector } from "./CustomerSelector";

export interface CartPanelProps {
  cart: PosCartLine[];
  customer: PosCustomer;
  discountAmount: number;
  onIncrementLine: (productId: string) => void;
  onDecrementLine: (productId: string) => void;
  onRemoveLine: (productId: string) => void;
  onSelectCustomer: (customer: PosCustomer) => void;
  onDiscountChange: (discount: number) => void;
  onProceedToCheckout: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  customer,
  discountAmount,
  onIncrementLine,
  onDecrementLine,
  onRemoveLine,
  onSelectCustomer,
  onDiscountChange,
  onProceedToCheckout,
}) => {
  const subtotal = calculateSubtotal(cart);
  const total = calculateTotal(subtotal, discountAmount);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const isCartEmpty = cart.length === 0;

  return (
    <Card
      variant="default"
      className="p-5 flex flex-col justify-between h-full space-y-4 border-border-subtle shadow-xs bg-surface-default"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-brand-subtle text-content-brand">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-content-primary">Panier</h3>
        </div>

        <span className="text-xs font-semibold text-content-secondary bg-surface-subtle px-2.5 py-1 rounded-full border border-border-subtle">
          {itemCount === 1 ? "1 article" : `${itemCount} articles`}
        </span>
      </div>

      {/* Customer Selection */}
      <CustomerSelector
        selectedCustomer={customer}
        onSelectCustomer={onSelectCustomer}
      />

      {/* Cart Items List or Empty State */}
      <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1 scrollbar-thin">
        {isCartEmpty ? (
          <div className="py-10 text-center space-y-2 border-2 border-dashed border-border-subtle rounded-xl bg-surface-subtle p-4">
            <div className="w-10 h-10 rounded-full bg-surface-default text-content-muted flex items-center justify-center mx-auto border border-border-subtle">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-content-primary">
              Votre panier est vide
            </h4>
            <p className="text-xs text-content-secondary">
              Sélectionnez un produit dans le catalogue pour commencer la vente.
            </p>
          </div>
        ) : (
          cart.map((line) => (
            <CartLine
              key={line.productId}
              line={line}
              onIncrement={onIncrementLine}
              onDecrement={onDecrementLine}
              onRemove={onRemoveLine}
            />
          ))
        )}
      </div>

      {/* Totals & Calculations */}
      <div className="space-y-3 pt-3 border-t border-border-subtle bg-surface-subtle p-4 rounded-xl">
        <div className="flex items-center justify-between text-xs text-content-secondary font-medium">
          <span>Sous-total</span>
          <span className="font-bold text-content-primary">{formatMoney(subtotal)}</span>
        </div>

        {/* Discount Line */}
        {!isCartEmpty && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <label
              htmlFor="pos-discount-input"
              className="text-content-secondary font-medium flex items-center gap-1 shrink-0"
            >
              <Tag className="w-3.5 h-3.5 text-content-brand" />
              <span>Remise (FCFA)</span>
            </label>

            <input
              id="pos-discount-input"
              type="number"
              min={0}
              max={subtotal}
              value={discountAmount || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onDiscountChange(isNaN(val) ? 0 : val);
              }}
              placeholder="0"
              aria-label="Remise en FCFA"
              className="w-24 h-8 text-right px-2 rounded bg-surface-default border border-border-default text-xs font-bold text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-base font-extrabold text-content-primary pt-2 border-t border-border-subtle font-sans">
          <span>Total à payer</span>
          <span className="text-lg text-content-brand">{formatMoney(total)}</span>
        </div>
      </div>

      {/* Checkout Transition CTA */}
      <Button
        variant="primary"
        size="lg"
        disabled={isCartEmpty}
        onClick={onProceedToCheckout}
        className="w-full justify-between"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        <span>Continuer vers le paiement</span>
        <span className="font-mono font-bold">{formatMoney(total)}</span>
      </Button>
    </Card>
  );
};
