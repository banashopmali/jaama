"use client";

import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAppShell } from "./AppShellContext";

export const SidebarCollapseButton: React.FC = () => {
  const { isCollapsed, toggleCollapse } = useAppShell();
  const label = isCollapsed ? "Développer le menu" : "Réduire le menu";

  return (
    <div className="p-3 border-t border-border-subtle shrink-0">
      <button
        type="button"
        onClick={toggleCollapse}
        aria-label={label}
        title={label}
        className={`w-full flex items-center justify-center lg:justify-start h-10 px-3 rounded-xl text-xs font-semibold text-content-secondary hover:bg-surface-hover hover:text-content-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          isCollapsed ? "px-0" : "gap-3"
        }`}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="w-5 h-5 shrink-0 text-content-brand" />
        ) : (
          <PanelLeftClose className="w-5 h-5 shrink-0 text-content-secondary" />
        )}
        {!isCollapsed && <span className="hidden lg:inline truncate">{label}</span>}
      </button>
    </div>
  );
};
