import React from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Clock } from "lucide-react";
import { Button, Card, Badge } from "@jaama/ui";

export default function NouvelleVentePlaceholderPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 font-mono text-xs font-semibold text-content-muted">
            <Link
              href="/ventes"
              className="hover:text-content-brand transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ventes</span>
            </Link>
            <span>/</span>
            <span className="text-content-brand">Nouvelle Vente</span>
          </div>

          <h1 className="text-2xl font-bold text-content-primary tracking-tight">
            Nouvelle Vente / Point de Vente (POS)
          </h1>
          <p className="text-sm text-content-secondary mt-1">
            Interface de création de vente et de gestion du règlement
          </p>
        </div>

        <Badge variant="brand" size="md">
          MODULE SUIVANT (JAA-S0-06)
        </Badge>
      </div>

      {/* Guidance Card */}
      <Card variant="default" className="p-8 text-center border-dashed border-border-brand-subtle">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-brand-subtle text-content-brand flex items-center justify-center border border-border-brand-subtle mx-auto">
            <ShoppingCart className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-content-primary">
              Écran de Caisse &amp; POS en cours de planification
            </h2>
            <p className="text-xs text-content-secondary leading-relaxed">
              Le terminal de saisie de vente, le catalogue tactile et le moteur d&apos;encaissement seront implémentés lors de la prochaine étape produit (<strong className="font-semibold text-content-primary">JAA-S0-06</strong>).
            </p>
          </div>

          <div className="pt-3 flex justify-center gap-3">
            <Link href="/ventes">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Retour à la liste des ventes
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Feature Plan Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="subtle" className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-content-primary">
            <Clock className="w-4 h-4 text-content-brand" />
            <span>Sélection &amp; Panier Tactile</span>
          </div>
          <p className="text-xs text-content-secondary leading-relaxed">
            Recherche d&apos;articles rapide, sélection au toucher, ajustement des quantités et des remises.
          </p>
        </Card>

        <Card variant="subtle" className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-content-primary">
            <Clock className="w-4 h-4 text-content-brand" />
            <span>Modes de règlement</span>
          </div>
          <p className="text-xs text-content-secondary leading-relaxed">
            Saisie des règlements en espèces, Wave, Orange Money, carte et enregistrement des ventes à crédit.
          </p>
        </Card>
      </div>
    </div>
  );
};
