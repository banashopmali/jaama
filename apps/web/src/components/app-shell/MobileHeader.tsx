"use client";

import React from "react";
import { Store } from "lucide-react";
import { shellMockData } from "@/config/shell-mock.data";
import { NotificationsButton } from "./NotificationsButton";
import { UserMenuTrigger } from "./UserMenuTrigger";
import { JaamaLogo } from "./JaamaLogo";

export const MobileHeader: React.FC = () => {
  const currentBusiness = shellMockData.currentBusiness;

  return (
    <header className="md:hidden h-14 bg-surface-default border-b border-border-subtle px-3 flex items-center justify-between sticky top-0 z-40 shrink-0 select-none">
      {/* Left: Logo & Compact Business Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        <JaamaLogo variant="mobile" />

        <div className="h-4 w-[1px] bg-border-subtle shrink-0" />

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-subtle border border-border-subtle text-xs font-semibold text-content-primary truncate">
          <Store className="w-3.5 h-3.5 text-content-brand shrink-0" />
          <span className="truncate max-w-[110px]">{currentBusiness.name}</span>
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-1 shrink-0">
        <NotificationsButton />
        <UserMenuTrigger />
      </div>
    </header>
  );
};
