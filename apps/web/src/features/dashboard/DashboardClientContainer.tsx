"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { SalesTrendSection } from "./components/SalesTrendSection";
import { AttentionPanel } from "./components/AttentionPanel";
import { RecentSales } from "./components/RecentSales";
import { QuickActions } from "./components/QuickActions";
import { DashboardLoading } from "./components/DashboardLoading";
import { mockPopulatedSnapshot } from "./dashboard.mock";

export function DashboardClientContainer() {
  const { apiFetch, config } = useWorkspace();
  const [liveData, setLiveData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await apiFetch("/api/v1/dashboard/summary?period=today");
        setLiveData(res);
      } catch {
        setLiveData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  const snapshot = mockPopulatedSnapshot;
  const userFirstName = config?.user?.name ? config.user.name.split(" ")[0] : "Hamidou";
  const businessName = "Boutique Diallo & Frères";

  // Merge live API metrics when available
  const metrics = liveData?.metrics
    ? {
        todaySales: {
          amount: liveData.metrics.totalSalesMinor || 0,
          currency: "FCFA",
          trend: { value: `${liveData.metrics.growthPercent}%`, isPositive: liveData.metrics.growthPercent >= 0 },
          periodLabel: "Aujourd'hui",
        },
        itemsSold: {
          count: liveData.metrics.salesCount || 0,
          unitLabel: "ventes",
          periodLabel: "Aujourd'hui",
        },
        toCollect: {
          amount: liveData.metrics.totalOutstandingMinor || 0,
          currency: "FCFA",
          clientCount: 0,
        },
        netCashflow: {
          amount: liveData.metrics.netCashflowMinor || 0,
          currency: "FCFA",
          periodLabel: "Aujourd'hui",
        },
      }
    : snapshot.metrics;

  const recentSales = liveData?.recentSales && liveData.recentSales.length > 0
    ? liveData.recentSales.map((s: any) => ({
        id: s.id,
        reference: s.reference,
        customerName: s.customer?.name || "Client comptoir",
        itemCount: s.lines ? s.lines.reduce((acc: number, l: any) => acc + l.quantity, 0) : 1,
        totalAmount: s.totalMinor,
        paymentStatus: s.paymentStatus === "PAID" ? "PAYEE" : s.paymentStatus === "PARTIALLY_PAID" ? "PARTIELLE" : "IMPAYEE",
        paymentMethod: s.paymentMethod || "Espèces",
        formattedTime: new Date(s.occurredAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      }))
    : snapshot.recentSales;

  return (
    <div className="space-y-6">
      <DashboardHeader
        userFirstName={userFirstName}
        businessName={businessName}
        periodLabel="Aujourd'hui"
      />
      <DashboardMetrics metrics={metrics as any} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="order-1 lg:order-2 lg:col-span-1">
          <AttentionPanel items={snapshot.attentionItems} />
        </div>
        <div className="order-2 lg:order-1 lg:col-span-2">
          <SalesTrendSection salesTrend={snapshot.salesTrend} />
        </div>
      </div>
      <RecentSales sales={recentSales as any} />
      <QuickActions actions={snapshot.quickActions} />
    </div>
  );
}
