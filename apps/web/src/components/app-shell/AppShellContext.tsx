"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AppShellContextValue {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  activePath: string;
  setActivePath: (path: string) => void;
}

const STORAGE_KEY = "jaama.sidebar.collapsed";

const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

export interface AppShellProviderProps {
  children: React.ReactNode;
  initialPath?: string;
}

export function AppShellProvider({ children, initialPath = "/" }: AppShellProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activePath, setActivePath] = useState<string>(initialPath);

  // Safe client-side hydration for localStorage collapse state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // Ignore localStorage errors (e.g. privacy mode)
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage write errors
      }
      return next;
    });
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore
    }
  };

  return (
    <AppShellContext.Provider
      value={{
        isCollapsed,
        toggleCollapse,
        setCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        activePath,
        setActivePath,
      }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShellProvider");
  }
  return context;
}
