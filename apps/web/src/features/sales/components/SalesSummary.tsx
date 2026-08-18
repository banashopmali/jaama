import React from "react";
import { ShoppingCart, DollarSign, WalletCards, Wallet } from "lucide-react";
import { SalesSummaryData } from "../sales.types";
import { formatMoney } from "../sales.utils";
import { SalesSummaryCard } from "./SalesSummaryCard";

export interface SalesSummaryProps {
  summary: SalesSummaryData;
}

export const SalesSummary: React.FC<SalesSummaryProps> = ({ summary }) => {
  return (
    <section aria-label="Synthèse des ventes et encaissement" className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: VENTES */}
        <SalesSummaryCard
          label="VENTES"
          value={`${summary.totalSalesCount} ventes`}
          subtitle="Total enregistrées"
          icon={<ShoppingCart className="w-4 h-4 text-content-brand" />}
        />

        {/* Metric 2: MONTANT DES VENTES */}
        <SalesSummaryCard
          label="MONTANT DES VENTES"
          value={formatMoney(summary.totalSalesAmount)}
          subtitle="Volume d'affaires total"
          icon={<DollarSign className="w-4 h-4 text-content-primary" />}
        />

        {/* Metric 3: ENCAISSÉ */}
        <SalesSummaryCard
          label="ENCAISSÉ"
          value={formatMoney(summary.totalCollectedAmount)}
          subtitle="Règlements perçus"
          icon={<WalletCards className="w-4 h-4 text-status-success" />}
        />

        {/* Metric 4: À ENCAISSER */}
        <SalesSummaryCard
          label="À ENCAISSER"
          value={formatMoney(summary.totalToCollectAmount)}
          subtitle="Créances à percevoir"
          icon={<Wallet className="w-4 h-4 text-status-warning" />}
        />
      </div>
    </section>
  );
};
