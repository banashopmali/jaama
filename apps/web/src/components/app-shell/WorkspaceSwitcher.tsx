"use client";

import React, { useState, useRef, useEffect } from "react";
import { Store, ChevronDown, Check, Plus } from "lucide-react";
import { useAppShell } from "./AppShellContext";
import { shellMockData, BusinessAccount } from "@/config/shell-mock.data";

export const WorkspaceSwitcher: React.FC = () => {
  const { isCollapsed } = useAppShell();
  const [isOpen, setIsOpen] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState<BusinessAccount>(
    shellMockData.currentBusiness
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (biz: BusinessAccount) => {
    setCurrentBusiness(biz);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative px-3 py-3 border-b border-border-subtle shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Entreprise actuelle : ${currentBusiness.name}, ${currentBusiness.country}. Cliquer pour changer d'entreprise.`}
        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          isOpen
            ? "bg-surface-subtle border-border-default shadow-sm"
            : "bg-surface-default border-border-subtle hover:bg-surface-hover hover:border-border-default"
        }`}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-surface-brand-subtle text-content-brand shrink-0 border border-border-brand-subtle">
          <Store className="w-4.5 h-4.5" />
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-content-primary truncate">
              {currentBusiness.name}
            </div>
            <div className="text-[11px] font-medium text-content-secondary flex items-center gap-1.5 truncate">
              <span>{currentBusiness.country}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-status-success"></span>
              <span className="text-[10px] text-content-muted">Actif</span>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <ChevronDown
            className={`w-4 h-4 text-content-muted shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Workspace Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Liste de vos entreprises"
          className={`absolute z-50 mt-2 bg-surface-default border border-border-default rounded-xl shadow-elevated p-1.5 space-y-1 ${
            isCollapsed ? "left-14 w-60 top-2" : "left-3 right-3 w-[calc(100%-1.5rem)] top-full"
          }`}
        >
          <div className="px-2 py-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
            Vos entreprises
          </div>

          {shellMockData.businesses.map((biz) => {
            const isSelected = biz.id === currentBusiness.id;
            return (
              <button
                key={biz.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(biz)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  isSelected
                    ? "bg-surface-brand-subtle text-content-brand font-semibold"
                    : "text-content-primary hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-surface-subtle border border-border-subtle text-content-secondary shrink-0">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div>{biz.name}</div>
                    <div className="text-[10px] text-content-muted">{biz.country}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-content-brand shrink-0 ml-2" />}
              </button>
            );
          })}

          <div className="pt-1 mt-1 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-content-brand hover:bg-surface-brand-subtle transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une entreprise</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
