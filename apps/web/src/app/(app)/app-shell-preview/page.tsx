import React from "react";
import { Badge, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";

export default function AppShellPreviewPage() {
  return (
    <div className="space-y-6">
      {/* QA Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-content-muted mb-1 font-mono">
            <span>QA ROUTE</span>
            <span>/</span>
            <span className="text-content-brand">/app-shell-preview</span>
          </div>
          <h2 className="text-2xl font-bold text-content-primary tracking-tight">
            JAAMA App Shell V1 — Visual QA Preview
          </h2>
          <p className="text-sm text-content-secondary mt-0.5">
            Validation visuelle et interactive de la structure permanente du Shell App (JAA-S0-03)
          </p>
        </div>
        <Badge variant="brand" size="md">
          INTERNAL PREVIEW
        </Badge>
      </div>

      {/* QA Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="default">
          <CardHeader>
            <CardTitle>Points d&apos;inspection Desktop</CardTitle>
            <CardDescription>Largeurs 1024px et 1440px</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-content-secondary">
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Barre latérale desktop (256px étendue / 80px réduite) avec logo lisible.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Sélecteur d&apos;entreprise &quot;Diallo Commerce / Mali&quot; avec menu popover.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Bouton d&apos;action globale &quot;Nouveau&quot; et recherche (Ctrl+K).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Bouton de réduction avec persistance localStorage (<code className="font-mono bg-surface-subtle px-1 py-0.5 rounded">jaama.sidebar.collapsed</code>).</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Points d&apos;inspection Mobile &amp; Tablette</CardTitle>
            <CardDescription>Largeurs 390px et 768px</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-content-secondary">
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>En-tête mobile compact avec logo, entreprise active et profil.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Barre de navigation inférieure (5 destinations max: Accueil, Ventes, Produits, Clients, Plus).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Bouton central de création rapide tactile.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-content-brand">•</span>
              <span>Absence de défilement horizontal parasite.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
