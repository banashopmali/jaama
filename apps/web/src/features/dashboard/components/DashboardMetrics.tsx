"use client";

import React from "react";
import { DollarSign, ShoppingCart, Wallet, AlertTriangle } from "lucide-react";
import { DashboardSnapshot } from "../dashboard.types";
import { MetricCard } from "./MetricCard";

export interface DashboardMetricsProps {
  metrics: DashboardSnapshot["metrics"];
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  return (
    <section aria-label="Indicateurs clés de performance" className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VENTES AUJOURD'HUI */}
        <MetricCard
          metric={metrics.todaySales}
          icon={<DollarSign className="w-4 h-4 text-content-brand" />}
        />

        {/* KPI 2: NOMBRE DE VENTES */}
        <MetricCard
          metric={metrics.salesCount}
          icon={<ShoppingCart className="w-4 h-4 text-content-secondary" />}
        />

        {/* KPI 3: À ENCAISSER */}
        <MetricCard
          metric={metrics.toCollect}
          icon={<Wallet className="w-4 h-4 text-status-warning" />}
        />

        {/* KPI 4: STOCK À SURVEILLER */}
        <MetricCard
          metric={metrics.lowStock}
          icon={<AlertTriangle className="w-4 h-4 text-status-danger" />}
        />
      </div>
    </section>
  );
};
