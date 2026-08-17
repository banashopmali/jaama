"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardStateMode, DashboardSnapshot } from "../dashboard.types";
import { mockPopulatedSnapshot, mockEmptySnapshot } from "../dashboard.mock";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardMetrics } from "./DashboardMetrics";
import { SalesTrendCard } from "./SalesTrendCard";
import { AttentionPanel } from "./AttentionPanel";
import { RecentSales } from "./RecentSales";
import { QuickActions } from "./QuickActions";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardLoading } from "./DashboardLoading";
import { DashboardSectionError } from "./DashboardSectionError";

export interface DashboardViewProps {
  initialStateMode?: DashboardStateMode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  initialStateMode = "populated",
}) => {
  const searchParams = useSearchParams();
  const queryMode = searchParams?.get("dashboardState") as DashboardStateMode | null;
  const currentMode: DashboardStateMode = queryMode || initialStateMode;

  const [trendError, setTrendError] = useState<boolean>(currentMode === "partial-error");

  // Mode: Loading
  if (currentMode === "loading") {
    return <DashboardLoading />;
  }

  // Mode: Empty
  if (currentMode === "empty") {
    const snapshot: DashboardSnapshot = mockEmptySnapshot;
    return (
      <DashboardEmptyState
        userFirstName={snapshot.userFirstName}
        businessName={snapshot.businessName}
      />
    );
  }

  // Mode: Populated (or Partial-Error)
  const snapshot: DashboardSnapshot = mockPopulatedSnapshot;

  return (
    <div className="space-y-6">
      {/* 1. Greeting & Period Header */}
      <DashboardHeader
        userFirstName={snapshot.userFirstName}
        businessName={snapshot.businessName}
        periodLabel={snapshot.periodLabel}
      />

      {/* 2. Primary KPI Row (4 Cards) */}
      <DashboardMetrics metrics={snapshot.metrics} />

      {/* 3. Main Analytics & Attention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* On Mobile: Priority Order brings Attention Panel to the top */}
        <div className="order-1 lg:order-2 lg:col-span-1">
          <AttentionPanel items={snapshot.attentionItems} />
        </div>

        <div className="order-2 lg:order-1 lg:col-span-2">
          {trendError ? (
            <div className="h-full flex items-center justify-center p-4 bg-surface-default border border-border-subtle rounded-xl shadow-xs">
              <DashboardSectionError
                title="Évolution des ventes indisponible"
                message="Impossible de charger le graphique d'évolution pour le moment. Veuillez réessayer."
                onRetry={() => setTrendError(false)}
              />
            </div>
          ) : (
            <SalesTrendCard salesTrend={snapshot.salesTrend} />
          )}
        </div>
      </div>

      {/* 4. Recent Sales Table / Mobile List */}
      <RecentSales sales={snapshot.recentSales} />

      {/* 5. Quick Actions Shortcuts */}
      <QuickActions actions={snapshot.quickActions} />
    </div>
  );
};
