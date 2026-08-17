"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export interface PeriodSelectorProps {
  periodLabel?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
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
  );
};
