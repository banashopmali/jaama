import React from "react";
import Link from "next/link";
import { Package, PlusCircle } from "lucide-react";
import { Button, Card } from "@jaama/ui";

export const PosNoCatalogState: React.FC = () => {
  return (
    <Card variant="default" className="p-8 text-center border-dashed border-border-subtle">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-brand-subtle text-content-brand flex items-center justify-center border border-border-brand-subtle mx-auto">
          <Package className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-content-primary">
            Aucun produit disponible dans le catalogue
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Pour pouvoir enregistrer des ventes, commencez par ajouter des produits à votre inventaire.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/produits">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Gérer mes produits
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
