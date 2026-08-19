"use client";

import React, { useState, useEffect } from "react";
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
import { useWorkspace } from "../../../context/WorkspaceContext";

export interface DashboardViewProps {
  stateMode?: DashboardStateMode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stateMode,
}) => {
  const { config, apiFetch } = useWorkspace();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(
    stateMode === "empty"
      ? mockEmptySnapshot
      : stateMode === "populated" || stateMode === "partial-error"
      ? mockPopulatedSnapshot
      : null
  );
  const [loading, setLoading] = useState<boolean>(!stateMode);
  const [fetchError, setFetchError] = useState<string | null>(
    stateMode === "partial-error" ? "Impossible de charger les données du tableau de bord." : null
  );

  const userFirstName = config?.user?.name ? config.user.name.split(" ")[0] : snapshot?.userFirstName || "Hamidou";
  const businessName = snapshot?.businessName || config?.organizationId || "Diallo Commerce";

  useEffect(() => {
    if (stateMode) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    async function loadDashboardData() {
      try {
        const res = await apiFetch("/api/v1/dashboard/summary");
        if (isMounted && res) {
          setSnapshot({
            userFirstName,
            businessName,
            periodLabel: res.periodLabel || "Aujourd'hui",
            hasBusinessActivity: !!(res.metrics?.salesCount?.rawValue > 0),
            metrics: res.metrics || mockEmptySnapshot.metrics,
            salesTrend: res.salesTrend || mockEmptySnapshot.salesTrend,
            attentionItems: res.attentionItems || [],
            recentSales: res.recentSales || [],
            quickActions: mockPopulatedSnapshot.quickActions,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err?.message || "Erreur de connexion au serveur d'entreprise.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [stateMode, config]);

  if (stateMode === "loading" || loading) {
    return <DashboardLoading />;
  }

  if (fetchError && !snapshot) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl space-y-4 text-center">
        <h3 className="text-lg font-bold text-red-900">Erreur du Tableau de Bord</h3>
        <p className="text-sm text-red-700">{fetchError}</p>
        <p className="text-xs text-red-500">Les données financières ne peuvent pas être affichées en mode hors-ligne sans connexion API authentifiée.</p>
      </div>
    );
  }

  const currentSnapshot: DashboardSnapshot = snapshot || {
    ...mockEmptySnapshot,
    userFirstName,
    businessName,
  };

  if (stateMode === "empty" || (!currentSnapshot.hasBusinessActivity && !stateMode && currentSnapshot.recentSales.length === 0)) {
    return (
      <DashboardEmptyState
        userFirstName={userFirstName}
        businessName={businessName}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Greeting & Period Header */}
      <DashboardHeader
        userFirstName={userFirstName}
        businessName={businessName}
        periodLabel={currentSnapshot.periodLabel}
      />

      {fetchError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
          <span>{fetchError} (Mode dégradé partiel)</span>
        </div>
      )}

      {/* 2. Primary KPI Row (4 Cards) */}
      <DashboardMetrics metrics={currentSnapshot.metrics} />

      {/* 3. Main Analytics & Attention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="order-1 lg:order-2 lg:col-span-1">
          <AttentionPanel items={currentSnapshot.attentionItems} />
        </div>

        <div className="order-2 lg:order-1 lg:col-span-2">
          <SalesTrendSection
            salesTrend={currentSnapshot.salesTrend}
            initialHasError={!!fetchError || stateMode === "partial-error"}
          />
        </div>
      </div>

      {/* 4. Recent Sales Table / Mobile List */}
      <RecentSales sales={currentSnapshot.recentSales} />

      {/* 5. Quick Actions Shortcuts */}
      <QuickActions actions={currentSnapshot.quickActions} />
    </div>
  );
};
