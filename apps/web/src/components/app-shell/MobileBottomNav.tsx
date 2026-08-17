"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { mobileBottomNavDestinations } from "@/config/navigation.config";
import { useAppShell } from "./AppShellContext";

export const MobileBottomNav: React.FC = () => {
  const { activePath, setActivePath } = useAppShell();

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-default border-t border-border-subtle z-40 px-2 flex items-center justify-around select-none shadow-elevated"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {mobileBottomNavDestinations.map((item, index) => {
        const isActive = activePath === item.href || (item.href !== "/" && activePath.startsWith(item.href));
        const Icon = item.icon;

        // Insert global create action button in the center (index 2)
        if (index === 2) {
          return (
            <React.Fragment key="mobile-create-action-wrapper">
              <button
                type="button"
                aria-label="Créer une nouvelle vente ou document"
                className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-brand-primary text-content-inverse shadow-elevated hover:bg-brand-primary-hover active:bg-brand-primary-active transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 shrink-0"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>

              <Link
                href={item.href}
                onClick={() => setActivePath(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 flex flex-col items-center justify-center h-full py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg ${
                  isActive
                    ? "text-content-brand font-bold"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-content-brand" : ""}`} />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            </React.Fragment>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActivePath(item.href)}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg ${
              isActive
                ? "text-content-brand font-bold"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-content-brand" : ""}`} />
            <span className="truncate max-w-[64px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
