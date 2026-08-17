"use client";

import React from "react";
import { navigationConfig, bottomNavItems } from "@/config/navigation.config";
import { SidebarNavItem } from "./SidebarNavItem";
import { useAppShell } from "./AppShellContext";

export const SidebarNav: React.FC = () => {
  const { isCollapsed } = useAppShell();

  return (
    <nav
      aria-label="Navigation principale"
      className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin"
    >
      {navigationConfig.map((group) => (
        <div key={group.id} className="space-y-1">
          {!isCollapsed && (
            <h3 className="px-3 text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">
              {group.label}
            </h3>
          )}
          {group.items.map((item) => (
            <SidebarNavItem key={item.id} item={item} />
          ))}
        </div>
      ))}

      {/* Bottom Nav Items (Paramètres & Aide) */}
      <div className="pt-4 border-t border-border-subtle space-y-1">
        {!isCollapsed && (
          <h3 className="px-3 text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">
            CONFIGURATION
          </h3>
        )}
        {bottomNavItems.map((item) => (
          <SidebarNavItem key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
};
