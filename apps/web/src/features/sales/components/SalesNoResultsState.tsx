import React from "react";
import { FilterX, RotateCcw } from "lucide-react";
import { Button, Card } from "@jaama/ui";

export interface SalesNoResultsStateProps {
  onReset: () => void;
}

export const SalesNoResultsState: React.FC<SalesNoResultsStateProps> = ({ onReset }) => {
  return (
    <Card variant="default" className="p-8 text-center border-dashed border-border-subtle">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-content-secondary flex items-center justify-center border border-border-subtle mx-auto">
          <FilterX className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-content-primary">
            Aucune vente ne correspond à vos filtres
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Essayez de modifier votre recherche ou de réinitialiser vos filtres de statut et mode de paiement.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      </div>
    </Card>
  );
};
