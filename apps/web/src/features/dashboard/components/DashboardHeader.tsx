import React from "react";
import { Badge } from "@jaama/ui";
import { PeriodSelector } from "./PeriodSelector";

export interface DashboardHeaderProps {
  userFirstName: string;
  businessName: string;
  periodLabel?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userFirstName,
  businessName,
  periodLabel = "Aujourd’hui",
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-subtle pb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            TABLEAU DE BORD
          </Badge>
          <span className="text-xs text-content-muted font-medium">·</span>
          <span className="text-xs font-semibold text-content-secondary">
            {businessName}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-content-primary tracking-tight font-sans">
          Bonjour {userFirstName} <span className="inline-block animate-pulse">👋</span>
        </h1>
        
        <p className="text-sm text-content-secondary mt-1 leading-relaxed">
          Voici ce qui se passe aujourd’hui chez <span className="font-semibold text-content-primary">{businessName}</span>.
        </p>
      </div>

      {/* Client Island for Period Context Selector */}
      <PeriodSelector periodLabel={periodLabel} />
    </div>
  );
};
