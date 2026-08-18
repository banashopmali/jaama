import React from "react";
import { Card } from "@jaama/ui";

export interface SalesSummaryCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const SalesSummaryCard: React.FC<SalesSummaryCardProps> = ({
  label,
  value,
  subtitle,
  icon,
}) => {
  return (
    <Card
      variant="default"
      className="p-5 flex flex-col justify-between hover:border-border-default transition-all duration-200 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold text-content-muted uppercase tracking-wider font-sans truncate">
          {label}
        </h3>
        {icon && (
          <div className="p-2 rounded-lg bg-surface-subtle text-content-secondary border border-border-subtle shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl lg:text-3xl font-extrabold text-content-primary tracking-tight font-sans">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs font-semibold text-content-secondary">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
};
