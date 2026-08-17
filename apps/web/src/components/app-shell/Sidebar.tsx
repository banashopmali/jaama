"use client";

import React from "react";
import { SidebarHeader } from "./SidebarHeader";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarNav } from "./SidebarNav";
import { SidebarCollapseButton } from "./SidebarCollapseButton";
import { useAppShell } from "./AppShellContext";

export const Sidebar: React.FC = () => {
  const { isCollapsed } = useAppShell();

  return (
    <aside
      aria-label="Menu principal"
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-surface-default border-r border-border-subtle z-30 transition-all duration-300 select-none ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <SidebarHeader />
      <WorkspaceSwitcher />
      <SidebarNav />
      <SidebarCollapseButton />
    </aside>
  );
};
