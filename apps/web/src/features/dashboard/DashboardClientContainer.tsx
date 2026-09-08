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

const STATIC_QUICK_ACTIONS = [
  { id: "new-sale", label: "Nouvelle vente", href: "/ventes/nouvelle", isPrimary: true },
  { id: "add-product", label: "Ajouter produit", href: "/produits", isPrimary: false },
  { id: "new-customer", label: "Nouveau client", href: "/clients", isPrimary: false },
  { id: "reports", label: "Voir rapports", href: "/rapports", isPrimary: false },
];

export function DashboardClientContainer() {
  const { apiFetch, config } = useWorkspace();
  const [liveData, setLiveData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/dashboard/summary?period=today");
      setLiveData(res);
    } catch (err: any) {
      setLiveData(null);
      setError(err?.message || "Impossible de charger les données du tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  if (error || !liveData) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h3 className="text-lg font-bold text-gray-900">Erreur de chargement du tableau de bord</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">{error || "Données serveur indisponibles."}</p>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const userFirstName = config?.user?.name ? config.user.name.split(" ")[0] : "Membre";
  const businessName = config?.user?.email ? `Entreprise (${config.organizationId})` : "Mon Entreprise";

  const metrics = {
    todaySales: {
      id: "today-sales",
      label: "Ventes du jour",
      formattedValue: `${(liveData.metrics?.totalSalesMinor || 0).toLocaleString("fr-FR")} FCFA`,
      rawValue: liveData.metrics?.totalSalesMinor || 0,
      currency: "FCFA",
      trend: {
        value: Math.abs(liveData.metrics?.growthPercent || 0),
        direction: (liveData.metrics?.growthPercent || 0) >= 0 ? ("up" as const) : ("down" as const),
        periodContext: "vs hier",
      },
      helperText: "Chiffre d'affaires réalisé aujourd'hui",
    },
    salesCount: {
      id: "sales-count",
      label: "Transactions",
      formattedValue: `${liveData.metrics?.salesCount || 0}`,
      rawValue: liveData.metrics?.salesCount || 0,
      helperText: "Nombre de ventes aujourd'hui",
    },
    toCollect: {
      id: "to-collect",
      label: "Créances à encaisser",
      formattedValue: `${(liveData.metrics?.totalOutstandingMinor || 0).toLocaleString("fr-FR")} FCFA`,
      rawValue: liveData.metrics?.totalOutstandingMinor || 0,
      currency: "FCFA",
      helperText: "Reste à recouvrer auprès des clients",
    },
    lowStock: {
      id: "low-stock",
      label: "Stock à surveiller",
      formattedValue: `${liveData.lowStockCount || 0} articles`,
      rawValue: liveData.lowStockCount || 0,
      helperText: "Articles proches ou en rupture",
    },
  };

  const recentSales = (liveData.recentSales || []).map((s: any) => ({
    id: s.id,
    reference: s.reference,
    customerName: s.customer?.name || "Client comptoir",
    totalAmount: s.totalMinor,
    paidAmount: s.paidMinor ?? (s.paymentStatus === "PAID" ? s.totalMinor : 0),
    remainingAmount: s.remainingMinor ?? (s.paymentStatus === "PAID" ? 0 : s.totalMinor),
    paymentStatus:
      s.paymentStatus === "PAID" ? "Payée" : s.paymentStatus === "PARTIALLY_PAID" ? "Partiellement payée" : "À encaisser",
    timestamp: new Date(s.occurredAt || s.createdAt || Date.now()).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const attentionItems = (liveData.attentionItems || []).map((item: any) => ({
    id: item.id || `att-${Math.random()}`,
    type: item.type || "warning",
    title: item.title,
    message: item.message,
    actionLabel: item.actionLabel || "Voir",
    actionHref: item.actionHref || "#",
  }));

  const salesTrend = liveData.salesTrend || {
    period: "today",
    totalAmount: liveData.metrics?.totalSalesMinor || 0,
    dataPoints: [],
  };

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
          <AttentionPanel items={attentionItems as any} />
        </div>
        <div className="order-2 lg:order-1 lg:col-span-2">
          <SalesTrendSection salesTrend={salesTrend as any} />
        </div>
      </div>
      <RecentSales sales={recentSales as any} />
      <QuickActions actions={STATIC_QUICK_ACTIONS as any} />
    </div>
  );
}
