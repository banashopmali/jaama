"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@jaama/ui";
import { DashboardMetric } from "../dashboard.types";
import { formatTrend } from "../dashboard.utils";

export interface MetricCardProps {
  metric: DashboardMetric;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric, icon }) => {
  const trend = metric.trend;
  const formattedTrendString = trend ? formatTrend(trend) : "";

  return (
    <Card
      variant="default"
      className="p-5 flex flex-col justify-between hover:border-border-default transition-all duration-200 shadow-xs"
    >
      {/* Top Row: Label & Subtle Icon */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold text-content-muted uppercase tracking-wider font-sans truncate">
          {metric.label}
        </h3>
        {icon && (
          <div className="p-2 rounded-lg bg-surface-subtle text-content-secondary border border-border-subtle shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="space-y-1 my-1">
        <div className="text-2xl lg:text-3xl font-extrabold text-content-primary tracking-tight font-sans">
          {metric.formattedValue}
        </div>

        {metric.subtitle && (
          <p className="text-xs font-semibold text-content-brand">
            {metric.subtitle}
          </p>
        )}
      </div>

      {/* Footer Context / Trend */}
      <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs min-h-[24px]">
        {trend ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[11px] ${
                trend.direction === "up"
                  ? "bg-status-success-subtle text-status-success"
                  : trend.direction === "down"
                  ? "bg-status-danger-subtle text-status-danger"
                  : "bg-surface-subtle text-content-secondary"
              }`}
            >
              {trend.direction === "up" && <TrendingUp className="w-3 h-3 stroke-[2.5]" />}
              {trend.direction === "down" && <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
              {trend.direction === "neutral" && <Minus className="w-3 h-3 stroke-[2.5]" />}
              <span>{formattedTrendString}</span>
            </span>
            <span className="text-content-secondary text-[11px]">
              {trend.periodContext}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-medium text-content-secondary truncate">
            {metric.helperText || "Valeur actuelle"}
          </span>
        )}
      </div>
    </Card>
  );
};
