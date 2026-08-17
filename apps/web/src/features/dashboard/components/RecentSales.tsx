"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";
import { RecentSaleItem } from "../dashboard.types";
import { RecentSalesTable } from "./RecentSalesTable";
import { RecentSalesMobileList } from "./RecentSalesMobileList";

export interface RecentSalesProps {
  sales: RecentSaleItem[];
}

export const RecentSales: React.FC<RecentSalesProps> = ({ sales }) => {
  return (
    <Card variant="default" className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-brand-subtle text-content-brand border border-border-brand-subtle">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-content-primary">
                Ventes récentes
              </CardTitle>
              <CardDescription className="text-xs text-content-secondary">
                Dernières transactions enregistrées
              </CardDescription>
            </div>
          </div>

          <Link
            href="/ventes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-content-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-md px-1 py-0.5 self-start sm:self-auto"
          >
            <span>Voir toutes les ventes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {sales.length > 0 ? (
          <>
            <RecentSalesTable sales={sales} />
            <RecentSalesMobileList sales={sales} />
          </>
        ) : (
          <div className="p-8 text-center text-xs text-content-secondary border border-dashed border-border-subtle rounded-xl">
            Aucune vente récente à afficher.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
