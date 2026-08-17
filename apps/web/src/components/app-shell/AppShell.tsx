"use client";

import React from "react";
import { AppShellProvider } from "./AppShellContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { AppContent } from "./AppContent";

export interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  pageTitle,
}) => {
  return (
    <AppShellProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-surface-subtle font-sans text-content-primary antialiased">
        {/* Desktop / Tablet Sidebar */}
        <Sidebar />

        {/* Mobile Top Header */}
        <MobileHeader />

        {/* Main Content Area + Topbar */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Topbar title={pageTitle} />
          <AppContent>{children}</AppContent>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </AppShellProvider>
  );
};
