import React from "react";
import { DashboardStateMode, DashboardSnapshot } from "../dashboard.types";
import { mockPopulatedSnapshot, mockEmptySnapshot } from "../dashboard.mock";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardMetrics } from "./DashboardMetrics";
import { SalesTrendSection } from "./SalesTrendSection";
import { AttentionPanel } from "./AttentionPanel";
import { RecentSales } from "./RecentSales";
import { QuickActions } from "./QuickActions";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardLoading } from "./DashboardLoading";

export interface DashboardViewProps {
  stateMode?: DashboardStateMode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stateMode = "populated",
}) => {
  // Mode: Loading
  if (stateMode === "loading") {
    return <DashboardLoading />;
  }

  // Mode: Empty
  if (stateMode === "empty") {
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
  const isPartialError = stateMode === "partial-error";

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
          <SalesTrendSection
            salesTrend={snapshot.salesTrend}
            initialHasError={isPartialError}
          />
        </div>
      </div>

      {/* 4. Recent Sales Table / Mobile List */}
      <RecentSales sales={snapshot.recentSales} />

      {/* 5. Quick Actions Shortcuts */}
      <QuickActions actions={snapshot.quickActions} />
    </div>
  );
};
