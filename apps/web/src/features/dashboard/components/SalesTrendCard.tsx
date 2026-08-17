import React from "react";
import { TrendingUp, BarChart2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";
import { DashboardSnapshot } from "../dashboard.types";
import { formatMoney } from "../dashboard.utils";

export interface SalesTrendCardProps {
  salesTrend: DashboardSnapshot["salesTrend"];
}

export const SalesTrendCard: React.FC<SalesTrendCardProps> = ({ salesTrend }) => {
  const points = salesTrend.points;
  const maxAmount = points.length > 0 ? Math.max(...points.map((p) => p.amount)) : 1;

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-brand-subtle text-content-brand border border-border-brand-subtle">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-content-primary">
                Évolution des ventes
              </CardTitle>
              <CardDescription className="text-xs text-content-secondary">
                Activité des 7 derniers jours
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-success-subtle text-status-success text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{salesTrend.percentageChange} %</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-1 flex flex-col justify-between space-y-4">
        {/* Accessible Text Summary for Screen Readers */}
        <p className="sr-only">{salesTrend.summaryText}</p>

        {/* Lightweight SVG Bar/Line Chart */}
        {points.length > 0 ? (
          <div
            role="img"
            aria-label={salesTrend.summaryText}
            className="w-full h-48 sm:h-56 flex items-end justify-between gap-2 sm:gap-3 pt-6 pb-2 px-1 select-none"
          >
            {points.map((pt, idx) => {
              const heightPercent = Math.max(12, Math.round((pt.amount / maxAmount) * 100));
              const isToday = idx === points.length - 1;

              return (
                <div
                  key={pt.dayLabel}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity absolute -top-8 bg-content-primary text-content-inverse text-[10px] font-bold px-2 py-1 rounded-md shadow-elevated whitespace-nowrap pointer-events-none z-10">
                    {formatMoney(pt.amount)}
                  </div>

                  {/* Bar Element */}
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                      isToday
                        ? "bg-brand-primary shadow-sm"
                        : "bg-brand-primary/20 group-hover:bg-brand-primary/40"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Day Label */}
                  <span
                    className={`text-[11px] font-semibold mt-2.5 ${
                      isToday ? "text-content-brand font-bold" : "text-content-secondary"
                    }`}
                  >
                    {pt.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-content-secondary border border-dashed border-border-subtle rounded-xl">
            Aucune donnée de vente pour cette période.
          </div>
        )}

        {/* Text Summary Banner */}
        <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-content-secondary font-medium leading-relaxed">
          {salesTrend.summaryText}
        </div>
      </CardContent>
    </Card>
  );
};
