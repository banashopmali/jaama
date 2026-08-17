"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Badge } from "@jaama/ui";

export interface DashboardHeaderProps {
  userFirstName: string;
  businessName: string;
  periodLabel?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userFirstName,
  businessName,
  periodLabel = "Aujourd’hui",
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periodLabel);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const periodOptions = [
    "Aujourd’hui",
    "7 derniers jours",
    "30 derniers jours",
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-subtle pb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            TABLEAU DE BORD
          </Badge>
          <span className="text-xs text-content-muted font-medium">·</span>
          <span className="text-xs font-semibold text-content-secondary">
            {businessName}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-content-primary tracking-tight font-sans">
          Bonjour {userFirstName} <span className="inline-block animate-pulse">👋</span>
        </h1>
        
        <p className="text-sm text-content-secondary mt-1 leading-relaxed">
          Voici ce qui se passe aujourd’hui chez <span className="font-semibold text-content-primary">{businessName}</span>.
        </p>
      </div>

      {/* Period Context Selector */}
      <div className="relative self-start md:self-auto">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-label="Sélectionner la période d'analyse"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-default border border-border-default hover:bg-surface-hover hover:border-border-brand-subtle text-xs font-semibold text-content-primary shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <Calendar className="w-4 h-4 text-content-brand shrink-0" />
          <span>{selectedPeriod}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-content-muted transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {isDropdownOpen && (
          <div
            role="listbox"
            aria-label="Périodes disponibles"
            className="absolute right-0 mt-2 w-48 bg-surface-default border border-border-default rounded-xl shadow-elevated p-1 z-30 space-y-0.5"
          >
            {periodOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selectedPeriod === option}
                onClick={() => {
                  setSelectedPeriod(option);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  selectedPeriod === option
                    ? "bg-surface-brand-subtle text-content-brand font-semibold"
                    : "text-content-primary hover:bg-surface-hover"
                }`}
              >
                <span>{option}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
