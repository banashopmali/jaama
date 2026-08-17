import React from "react";
import { Badge, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-content-muted mb-1 font-mono">
            <span>JAAMA</span>
            <span>/</span>
            <span className="text-content-brand">Accueil</span>
          </div>
          <h2 className="text-2xl font-bold text-content-primary tracking-tight">
            Espace de Travail
          </h2>
          <p className="text-sm text-content-secondary mt-0.5">
            Présentation de la surface de travail de l&apos;application JAAMA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="md">
            SHELL ENGINE V1
          </Badge>
          <Badge variant="neutral" size="md">
            Mali (FCFA)
          </Badge>
        </div>
      </div>

      {/* Neutral Canvas Demonstration Blocks (No Dashboard Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="default">
          <CardHeader>
            <CardTitle>Surface Principale</CardTitle>
            <CardDescription>Zone disponible pour les modules métier</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-content-secondary leading-relaxed">
              Le Shell App JAAMA préserve l&apos;espace horizontal et vertical requis pour les tableaux de données, formulaires d&apos;encaissement et interfaces de gestion.
            </p>
          </CardContent>
        </Card>

        <Card variant="subtle">
          <CardHeader>
            <CardTitle>Navigation Réactive</CardTitle>
            <CardDescription>Adaptation multi-terminaux</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-content-secondary leading-relaxed">
              Passage fluide entre la barre latérale desktop (étendue 256px / réduite 80px) et la navigation mobile inférieure (5 destinations).
            </p>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle>Accessibilité Baseline</CardTitle>
            <CardDescription>Conformité P0 aux standards</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-content-secondary leading-relaxed">
              Support complet de la navigation clavier, attributs ARIA sémantiques, raccourci global Search (Ctrl+K) et indicateurs de focus visibles.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder Workspace Area */}
      <Card variant="default" className="min-h-[300px] flex items-center justify-center border-dashed">
        <div className="text-center p-8 max-w-md">
          <div className="w-12 h-12 rounded-xl bg-surface-brand-subtle text-content-brand font-bold text-xl flex items-center justify-center mx-auto mb-3 border border-border-brand-subtle">
            J
          </div>
          <h3 className="text-base font-bold text-content-primary mb-1">
            Zone de Contenu Métier
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Cet emplacement recevra les futurs écrans métier (Ventes, Stocks, Factures, Clients). Le Shell App reste indépendant des données métier.
          </p>
        </div>
      </Card>
    </div>
  );
}
