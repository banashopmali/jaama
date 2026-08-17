"use client";

import React from "react";

export interface AppContentProps {
  children: React.ReactNode;
}

export const AppContent: React.FC<AppContentProps> = ({ children }) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-subtle min-h-screen">
      {/* Keyboard Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-brand-primary focus:text-content-inverse focus:font-bold focus:rounded-xl focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
      >
        Passer au contenu principal
      </a>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 max-w-full outline-none"
      >
        {children}
      </main>
    </div>
  );
};
