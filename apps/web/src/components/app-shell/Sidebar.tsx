"use client";

import React from "react";
import { bottomNavItems } from "@/config/navigation.config";
import { SidebarHeader } from "./SidebarHeader";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarNav } from "./SidebarNav";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarCollapseButton } from "./SidebarCollapseButton";
import { useAppShell } from "./AppShellContext";

export const Sidebar: React.FC = () => {
  const { isCollapsed } = useAppShell();

  return (
    <aside
      aria-label="Menu principal"
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-surface-default border-r border-border-subtle z-30 transition-all duration-300 select-none ${
        isCollapsed ? "w-20" : "w-20 lg:w-64"
      }`}
    >
      {/* Header Logo */}
      <SidebarHeader />

      {/* Workspace Selector */}
      <WorkspaceSwitcher />

      {/* Scrollable Module Navigation */}
      <SidebarNav />

      {/* Stable Bottom Utilities (Paramètres, Aide) */}
      <div className="p-3 border-t border-border-subtle space-y-1 shrink-0">
        {!isCollapsed && (
          <h3 className="hidden lg:block px-3 text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">
            CONFIGURATION
          </h3>
        )}
        {bottomNavItems.map((item) => (
          <SidebarNavItem key={item.id} item={item} />
        ))}
      </div>

      {/* Desktop-Only Collapse Control */}
      <SidebarCollapseButton />
    </aside>
  );
};
