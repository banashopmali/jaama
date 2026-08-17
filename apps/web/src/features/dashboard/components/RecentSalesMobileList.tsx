"use client";

import React from "react";
import { Badge } from "@jaama/ui";
import { RecentSaleItem } from "../dashboard.types";
import { formatMoney } from "../dashboard.utils";

export interface RecentSalesMobileListProps {
  sales: RecentSaleItem[];
}

export const RecentSalesMobileList: React.FC<RecentSalesMobileListProps> = ({ sales }) => {
  const getBadgeVariant = (status: RecentSaleItem["paymentStatus"]) => {
    switch (status) {
      case "Payée":
        return "success";
      case "Partiellement payée":
        return "warning";
      case "À encaisser":
        return "neutral";
      case "Remboursée":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <div className="md:hidden space-y-3">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className="p-3.5 rounded-xl border border-border-subtle bg-surface-default shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-content-brand">
              {sale.reference}
            </span>
            <Badge variant={getBadgeVariant(sale.paymentStatus)} size="sm">
              {sale.paymentStatus}
            </Badge>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-content-primary truncate">
              {sale.customerName}
            </span>
            <span className="text-base font-extrabold text-content-primary">
              {formatMoney(sale.totalAmount)}
            </span>
          </div>

          {sale.paymentStatus === "Partiellement payée" && (
            <div className="p-2 rounded-lg bg-status-warning-subtle text-status-warning text-xs font-semibold flex items-center justify-between">
              <span>Encaissé : {formatMoney(sale.paidAmount)}</span>
              <span>Reste : {formatMoney(sale.remainingAmount)}</span>
            </div>
          )}

          {sale.paymentStatus === "À encaisser" && (
            <div className="p-2 rounded-lg bg-surface-subtle text-content-secondary text-xs font-medium flex items-center justify-between">
              <span>Reste à encaisser</span>
              <span className="font-bold text-content-primary">{formatMoney(sale.remainingAmount)}</span>
            </div>
          )}

          <div className="text-right text-[11px] font-medium text-content-muted">
            {sale.timestamp}
          </div>
        </div>
      ))}
    </div>
  );
};
