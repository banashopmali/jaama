import React from "react";
import { Badge, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";

export interface ModulePlaceholderProps {
  title: string;
  moduleKey: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  moduleKey,
}) => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-content-muted mb-1 font-mono">
            <span>JAAMA</span>
            <span>/</span>
            <span className="text-content-brand">{title}</span>
          </div>
          <h2 className="text-2xl font-bold text-content-primary tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-content-secondary mt-0.5">
            Module de gestion {title}
          </p>
        </div>
        <Badge variant="brand" size="md">
          MODULE À VENIR
        </Badge>
      </div>

      {/* Neutral Content Canvas Card */}
      <Card variant="default" className="min-h-[360px] flex items-center justify-center border-dashed">
        <div className="text-center p-8 max-w-lg space-y-3">
          <div className="w-12 h-12 rounded-xl bg-surface-brand-subtle text-content-brand font-bold text-lg flex items-center justify-center mx-auto border border-border-brand-subtle font-mono">
            {moduleKey.slice(0, 2).toUpperCase()}
          </div>
          <h3 className="text-base font-bold text-content-primary">
            Espace du Module {title}
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Ce module sera implémenté dans un prochain ticket. Cette page permet de valider la navigation fluide, les états actifs du menu, la synchronisation du titre dans le Topbar et l&apos;héritage du Shell App.
          </p>
        </div>
      </Card>
    </div>
  );
};
