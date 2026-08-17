"use client";

import React, { useState } from "react";
import { DashboardSnapshot } from "../dashboard.types";
import { SalesTrendCard } from "./SalesTrendCard";
import { DashboardSectionError } from "./DashboardSectionError";

export interface SalesTrendSectionProps {
  salesTrend: DashboardSnapshot["salesTrend"];
  initialHasError?: boolean;
}

export const SalesTrendSection: React.FC<SalesTrendSectionProps> = ({
  salesTrend,
  initialHasError = false,
}) => {
  const [hasError, setHasError] = useState<boolean>(initialHasError);

  if (hasError) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-surface-default border border-border-subtle rounded-xl shadow-xs">
        <DashboardSectionError
          title="Évolution des ventes indisponible"
          message="Impossible de charger le graphique d'évolution pour le moment. Veuillez réessayer."
          onRetry={() => setHasError(false)}
        />
      </div>
    );
  }

  return <SalesTrendCard salesTrend={salesTrend} />;
};
