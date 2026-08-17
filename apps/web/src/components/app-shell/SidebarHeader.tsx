"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppShell } from "./AppShellContext";

export const SidebarHeader: React.FC = () => {
  const { isCollapsed } = useAppShell();

  return (
    <div className="h-16 flex items-center px-4 border-b border-border-subtle shrink-0">
      <Link
        href="/"
        className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-md p-1 transition-opacity hover:opacity-90"
        aria-label="Accueil JAAMA"
      >
        <div className="relative shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-brand-primary text-content-inverse font-black text-xl shadow-sm">
          <span>J</span>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-content-primary leading-none font-sans">
              JAAMA
            </span>
            <span className="text-[10px] font-semibold text-content-brand uppercase tracking-wider mt-0.5">
              Gestion SaaS
            </span>
          </div>
        )}
      </Link>
    </div>
  );
};
