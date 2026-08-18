import React from "react";
import Link from "next/link";
import { ArrowLeft, Store, RotateCcw } from "lucide-react";
import { Badge, Button } from "@jaama/ui";

export interface PosHeaderProps {
  businessName?: string;
  onResetCart?: () => void;
  hasCartItems?: boolean;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  businessName = "Diallo Commerce",
  onResetCart,
  hasCartItems = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/ventes"
            className="text-xs font-semibold text-content-secondary hover:text-content-brand transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ventes</span>
          </Link>
          <span className="text-xs text-content-muted">·</span>
          <div className="flex items-center gap-1 text-xs font-semibold text-content-secondary">
            <Store className="w-3.5 h-3.5 text-content-brand" />
            <span>{businessName}</span>
          </div>
          <span className="text-xs text-content-muted">·</span>
          <Badge variant="brand" size="sm">
            POINT DE VENTE (POS)
          </Badge>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-content-primary tracking-tight font-sans">
          Nouvelle vente
        </h1>
      </div>

      {hasCartItems && onResetCart && (
        <div className="self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetCart}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Vider le panier
          </Button>
        </div>
      )}
    </div>
  );
};
