"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import {
  getMobileBottomNavDestinations,
  isRouteActive,
} from "@/config/navigation.config";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const destinations = getMobileBottomNavDestinations();

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-default border-t border-border-subtle z-40 select-none shadow-elevated pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="h-16 px-2 flex items-center justify-around">
        {destinations.map((item, index) => {
          const isActive = isRouteActive(pathname, item.href);
          const Icon = item.icon;

          // Insert central global create action button before item 3 (index 2)
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
      </div>
    </nav>
  );
};
