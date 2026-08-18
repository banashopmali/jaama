import React from "react";
import { Search, RotateCcw, Filter } from "lucide-react";
import { Button, Input } from "@jaama/ui";
import { PaymentMethod, PaymentStatus, SalesFilterState } from "../sales.types";

export interface SalesFiltersProps {
  filters: SalesFilterState;
  onFilterChange: (newFilters: Partial<SalesFilterState>) => void;
  onReset: () => void;
  resultCount: number;
}

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  resultCount,
}) => {
  const isFiltered =
    filters.searchQuery.trim() !== "" ||
    filters.paymentStatus !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.saleStatus !== "all";

  return (
    <div className="space-y-3 bg-surface-default p-4 rounded-xl border border-border-subtle shadow-xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="flex-1 min-w-0">
          <Input
            type="text"
            size="sm"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Rechercher une vente, un client ou une référence…"
            leftSlot={<Search className="w-4 h-4 text-content-muted" />}
            aria-label="Rechercher une vente"
          />
        </div>

        {/* Dropdown Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Status Dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={filters.paymentStatus}
              onChange={(e) =>
                onFilterChange({
                  paymentStatus: e.target.value as PaymentStatus | "all",
                })
              }
              aria-label="Filtrer par statut de paiement"
              className="h-10 px-3 py-2 rounded-lg bg-surface-default border border-border-default hover:border-border-brand-subtle text-xs font-semibold text-content-primary shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <option value="all">Tous les statuts</option>
              <option value="Payée">Payée</option>
              <option value="Partiellement payée">Partiellement payée</option>
              <option value="À encaisser">À encaisser</option>
              <option value="Remboursée">Remboursée</option>
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={filters.paymentMethod}
              onChange={(e) =>
                onFilterChange({
                  paymentMethod: e.target.value as PaymentMethod | "all",
                })
              }
              aria-label="Filtrer par mode de paiement"
              className="h-10 px-3 py-2 rounded-lg bg-surface-default border border-border-default hover:border-border-brand-subtle text-xs font-semibold text-content-primary shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <option value="all">Tous les modes</option>
              <option value="cash">Espèces</option>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="bank_transfer">Virement</option>
              <option value="card">Carte</option>
              <option value="mixed">Mixte</option>
              <option value="credit">Crédit</option>
            </select>
          </div>

          {/* Reset Action */}
          {isFiltered && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Result Count Context */}
      <div className="flex items-center justify-between text-xs font-medium text-content-secondary pt-1 border-t border-border-subtle">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-content-muted" />
          <span>
            {resultCount === 1 ? "1 vente trouvée" : `${resultCount} ventes trouvées`}
          </span>
        </div>
        {isFiltered && (
          <span className="text-[11px] font-semibold text-content-brand">
            Filtres actifs
          </span>
        )}
      </div>
    </div>
  );
};
