import React from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { PosCartLine } from "../pos.types";
import { calculateLineTotal } from "../pos.utils";
import { formatMoney } from "../../sales/sales.utils";

export interface CartLineProps {
  line: PosCartLine;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export const CartLine: React.FC<CartLineProps> = ({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  const lineTotal = calculateLineTotal(line.unitPrice, line.quantity);
  const isMaxStockReached = line.quantity >= line.maxAvailableStock;

  return (
    <div className="p-3 rounded-xl border border-border-subtle bg-surface-default hover:border-border-default transition-colors space-y-2">
      {/* Product Name & Remove Action */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-content-primary line-clamp-1">
            {line.name}
          </h4>
          <span className="text-[11px] font-semibold text-content-secondary">
            {formatMoney(line.unitPrice)} / unité
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(line.productId)}
          className="text-content-muted hover:text-status-danger transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger"
          aria-label={`Supprimer ${line.name} du panier`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quantity Controls & Line Total */}
      <div className="flex items-center justify-between pt-1">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-border-subtle">
          <button
            type="button"
            onClick={() => onDecrement(line.productId)}
            className="w-6 h-6 rounded flex items-center justify-center bg-surface-default border border-border-subtle text-content-primary hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label={`Diminuer la quantité de ${line.name}`}
          >
            <Minus className="w-3 h-3" />
          </button>

          <span className="w-8 text-center text-xs font-extrabold text-content-primary font-mono select-none">
            {line.quantity}
          </span>

          <button
            type="button"
            disabled={isMaxStockReached}
            onClick={() => onIncrement(line.productId)}
            className="w-6 h-6 rounded flex items-center justify-center bg-surface-default border border-border-subtle text-content-primary hover:bg-surface-hover disabled:bg-surface-disabled disabled:text-content-disabled disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label={`Augmenter la quantité de ${line.name}`}
            title={isMaxStockReached ? `Stock disponible : ${line.maxAvailableStock}` : undefined}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Line Total */}
        <div className="text-right">
          <span className="text-sm font-extrabold text-content-primary block font-sans">
            {formatMoney(lineTotal)}
          </span>
          {isMaxStockReached && (
            <span className="text-[10px] font-semibold text-status-warning block">
              Stock max ({line.maxAvailableStock})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
