"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Plus, CircleHelp } from "lucide-react";
import { Button, IconButton } from "@jaama/ui";
import { getPageTitle } from "@/config/navigation.config";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsButton } from "./NotificationsButton";
import { UserMenuTrigger } from "./UserMenuTrigger";

export interface TopbarProps {
  title?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const pathname = usePathname();
  const pageTitle = title || getPageTitle(pathname);

  return (
    <header className="hidden md:flex h-16 bg-surface-default border-b border-border-subtle px-4 md:px-6 items-center justify-between gap-4 sticky top-0 z-20 shrink-0 select-none">
      {/* Left: Page Context Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-content-primary tracking-tight font-sans">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Global Search */}
      <GlobalSearch />

      {/* Right Actions Group */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Create Button */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          className="hidden sm:inline-flex"
        >
          Nouveau
        </Button>

        {/* Help Button */}
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Aide et support JAAMA"
          icon={<CircleHelp className="w-5 h-5 text-content-secondary" />}
          className="hidden sm:inline-flex"
        />

        {/* Notifications */}
        <NotificationsButton />

        <div className="h-5 w-[1px] bg-border-default mx-1 hidden sm:block" />

        {/* User Profile Menu */}
        <UserMenuTrigger />
      </div>
    </header>
  );
};
