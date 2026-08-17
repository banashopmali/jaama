"use client";

import React from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import { shellMockData } from "@/config/shell-mock.data";
import { NotificationsButton } from "./NotificationsButton";
import { UserMenuTrigger } from "./UserMenuTrigger";

export const MobileHeader: React.FC = () => {
  const currentBusiness = shellMockData.currentBusiness;

  return (
    <header className="md:hidden h-14 bg-surface-default border-b border-border-subtle px-3 flex items-center justify-between sticky top-0 z-40 shrink-0 select-none">
      {/* Left: Logo & Compact Business Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-md"
          aria-label="Accueil JAAMA"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-primary text-content-inverse font-black text-lg flex items-center justify-center shadow-sm">
            J
          </div>
          <span className="font-extrabold text-base tracking-tight text-content-primary">
            JAAMA
          </span>
        </Link>

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
