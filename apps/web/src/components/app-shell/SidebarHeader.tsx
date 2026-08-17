"use client";

import React from "react";
import { useAppShell } from "./AppShellContext";
import { JaamaLogo } from "./JaamaLogo";

export const SidebarHeader: React.FC = () => {
  const { isCollapsed } = useAppShell();

  return (
    <div className="h-16 flex items-center px-4 border-b border-border-subtle shrink-0">
      <JaamaLogo variant={isCollapsed ? "compact" : "full"} />
    </div>
  );
};
