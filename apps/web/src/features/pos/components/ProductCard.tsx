import React from "react";
import { Plus, AlertTriangle, PackageX } from "lucide-react";
import { Badge, Card, cn } from "@jaama/ui";
import { PosProduct } from "../pos.types";
import { formatMoney } from "../../sales/sales.utils";

export interface ProductCardProps {
  product: PosProduct;
  cartQuantity: number;
  onAddToCart: (product: PosProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity,
  onAddToCart,
}) => {
  const isOutOfStock = product.stock.status === "out" || product.stock.available === 0;
  const isLowStock = product.stock.status === "low" || product.stock.available <= 3;
  const isStockLimitReached = cartQuantity >= product.stock.available;
  const isDisabled = isOutOfStock || isStockLimitReached;

  return (
    <Card
      variant="default"
      className={cn(
        "p-4 flex flex-col justify-between transition-all duration-150 relative select-none",
        isDisabled ? "opacity-60 bg-surface-subtle border-border-subtle" : "hover:border-border-brand-subtle hover:shadow-sm"
      )}
    >
      {/* Top Meta: SKU & Stock Badge */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="font-mono text-[11px] font-semibold text-content-muted">
          {product.sku}
        </span>

        {isOutOfStock ? (
          <Badge variant="danger" size="sm" className="gap-1 text-[10px]">
            <PackageX className="w-3 h-3 shrink-0" />
            <span>Rupture de stock</span>
          </Badge>
        ) : isLowStock ? (
          <Badge variant="warning" size="sm" className="gap-1 text-[10px]">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Stock faible ({product.stock.available})</span>
          </Badge>
        ) : (
          <span className="text-[11px] font-medium text-content-secondary">
            Stock : {product.stock.available}
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="space-y-1 my-1">
        <h4 className="text-sm font-bold text-content-primary line-clamp-2 leading-tight">
          {product.name}
        </h4>
        <span className="text-xs font-semibold text-content-secondary block">
          {product.category}
        </span>
      </div>

      {/* Footer Price & Add CTA Button (Single Interactive Control) */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle mt-2">
        <div className="text-base font-extrabold text-content-primary tracking-tight">
          {formatMoney(product.unitPrice)}
        </div>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            if (!isDisabled) {
              onAddToCart(product);
            }
          }}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
            isDisabled
              ? "bg-surface-disabled text-content-disabled cursor-not-allowed"
              : "bg-surface-brand-subtle text-content-brand hover:bg-brand-primary hover:text-content-inverse cursor-pointer"
          )}
          aria-label={`Ajouter 1 ${product.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Quantity Pill Badge if present in cart */}
      {cartQuantity > 0 && (
        <div className="absolute -top-2 -right-2 bg-brand-primary text-content-inverse text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-surface-default">
          {cartQuantity}
        </div>
      )}
    </Card>
  );
};
