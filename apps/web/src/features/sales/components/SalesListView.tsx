"use client";

import React, { useState, useEffect } from "react";
import { SalesSummaryData, SaleListItem, SalesStateMode } from "../sales.types";
import { mockPopulatedSales, mockSummaryData } from "../sales.mock";
import { SalesHeader } from "./SalesHeader";
import { SalesSummary } from "./SalesSummary";
import { SalesListInteractiveSection } from "./SalesListInteractiveSection";
import { SalesEmptyState } from "./SalesEmptyState";
import { SalesLoading } from "./SalesLoading";
import { SalesListError } from "./SalesListError";
import { useWorkspace } from "../../../context/WorkspaceContext";

export interface SalesListViewProps {
  salesState?: SalesStateMode;
  overrideState?: SalesStateMode;
}

export const SalesListView: React.FC<SalesListViewProps> = ({
  salesState,
  overrideState,
}) => {
  const activeState = overrideState || salesState || "populated";
  const { apiFetch } = useWorkspace();

  const [sales, setSales] = useState<SaleListItem[]>(
    activeState === "empty" ? [] : mockPopulatedSales
  );
  const [summary, setSummary] = useState<SalesSummaryData>(
    activeState === "empty"
      ? { totalSalesCount: 0, totalSalesAmount: 0, totalCollectedAmount: 0, totalToCollectAmount: 0 }
      : mockSummaryData
  );
  const [loading, setLoading] = useState<boolean>(activeState === "loading");
  const [error, setError] = useState<string | null>(activeState === "error" ? "Erreur de chargement des ventes." : null);

  const loadSalesData = async () => {
    if (salesState || overrideState) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/sales");
      const rawSales = res.data || res.sales || [];
      if (Array.isArray(rawSales) && rawSales.length > 0) {
        const mapped: SaleListItem[] = rawSales.map((s: any) => ({
          id: s.id,
          reference: s.reference,
          occurredAt: s.occurredAt || s.createdAt || new Date().toISOString(),
          customer: {
            id: s.customer?.id || s.customerId || null,
            name: s.customer?.name || "Client comptoir",
          },
          itemCount: s.lines ? s.lines.reduce((acc: number, l: any) => acc + (l.quantity || 0), 0) : 1,
          totalAmount: s.totalMinor ?? s.totalAmount ?? 0,
          paidAmount: s.paidMinor ?? s.paidAmount ?? 0,
          remainingAmount: s.remainingMinor ?? s.remainingAmount ?? 0,
          paymentMethod: s.paymentMethod || "cash",
          paymentStatus:
            s.paymentStatus === "PAID" || s.paymentStatus === "Payée"
              ? "Payée"
              : s.paymentStatus === "PARTIALLY_PAID" || s.paymentStatus === "Partiellement payée"
              ? "Partiellement payée"
              : "À encaisser",
          saleStatus: s.status === "CANCELLED" || s.saleStatus === "Annulée" ? "Annulée" : "Terminée",
          seller: { id: s.seller?.id || "user-1", name: s.seller?.name || "Hamidou" },
        }));

        const summaryData: SalesSummaryData = {
          totalSalesCount: mapped.length,
          totalSalesAmount: mapped.reduce((acc, s) => acc + s.totalAmount, 0),
          totalCollectedAmount: mapped.reduce((acc, s) => acc + s.paidAmount, 0),
          totalToCollectAmount: mapped.reduce((acc, s) => acc + s.remainingAmount, 0),
        };

        setSales(mapped);
        setSummary(summaryData);
      }
    } catch {
      setSales(mockPopulatedSales);
      setSummary(mockSummaryData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [salesState, overrideState]);

  if (activeState === "loading" || loading) {
    return <SalesLoading />;
  }

  if (activeState === "error" || error) {
    return (
      <div className="space-y-6">
        <SalesHeader />
        <SalesListError retryHref="/ventes" />
      </div>
    );
  }

  if (activeState === "empty") {
    return (
      <div className="space-y-6">
        <SalesHeader />
        <SalesEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SalesHeader />
      <SalesSummary summary={summary} />
      <SalesListInteractiveSection initialSales={sales} />
    </div>
  );
};
