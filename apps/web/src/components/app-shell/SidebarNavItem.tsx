"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItemConfig, isRouteActive } from "@/config/navigation.config";
import { useAppShell } from "./AppShellContext";

export interface SidebarNavItemProps {
  item: NavItemConfig;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ item }) => {
  const { isCollapsed } = useAppShell();
  const pathname = usePathname();
  const isActive = isRouteActive(pathname, item.href);
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (!item.enabled) {
      e.preventDefault();
    }
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={!item.enabled}
      title={item.label}
      className={`group relative flex items-center h-11 px-3 rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary select-none ${
        !item.enabled
          ? "opacity-50 cursor-not-allowed text-content-disabled"
          : isActive
          ? "bg-surface-brand-subtle text-content-brand font-bold shadow-sm"
          : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
      } ${isCollapsed ? "justify-center px-0" : "justify-center lg:justify-start px-0 lg:px-3"}`}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <span
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-primary"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <Icon
        className={`w-5 h-5 shrink-0 transition-colors ${
          isActive
            ? "text-content-brand"
            : "text-content-secondary group-hover:text-content-primary"
        }`}
      />

      {/* Label */}
      {!isCollapsed && (
        <span className="hidden lg:inline ml-3 truncate flex-1">{item.label}</span>
      )}

      {/* Optional Badge */}
      {!isCollapsed && item.badge && (
        <span className="hidden lg:inline-block ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-surface-brand-subtle text-content-brand border border-border-brand-subtle">
          {item.badge}
        </span>
      )}

      {/* Tooltip on collapsed / tablet hover */}
      <div
        role="tooltip"
        className={`absolute left-full ml-3 px-2.5 py-1.5 bg-content-primary text-content-inverse text-xs font-semibold rounded-md shadow-elevated opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${
          !isCollapsed ? "lg:hidden" : ""
        }`}
      >
        {item.label}
      </div>
    </Link>
  );
};
