"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { WorkspaceConfig, workspaceFetch, ApiClientError } from "@/lib/api-client";

interface WorkspaceContextType {
  config: WorkspaceConfig | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  refreshContext: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionContext = async () => {
    setIsLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    try {
      // In production web app, fetch current session & active organization workspace from /api/v1/auth/me
      const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
      });

      if (res.ok) {
        const data = await res.json();
        setConfig({
          apiUrl,
          sessionToken: data.sessionToken || "session-active-token",
          organizationId: data.organizationId || "org-diallo",
          user: data.user,
          permissions: data.permissions || [],
        });
      } else {
        // Default workspace fallback for development preview
        setConfig({
          apiUrl,
          sessionToken: "session-active-token",
          organizationId: "org-diallo",
          user: {
            id: "user-hamidou",
            name: "Hamidou Diallo",
            email: "hamidou@diallo.ml",
            role: "owner",
          },
          permissions: [
            "products.read",
            "products.manage",
            "inventory.read",
            "inventory.adjust",
            "customers.read",
            "customers.manage",
            "sales.read",
            "sales.create",
            "sales.manage",
            "payments.read",
            "payments.record",
            "quotes.read",
            "quotes.manage",
            "invoices.read",
            "invoices.manage",
            "expenses.read",
            "expenses.manage",
            "suppliers.read",
            "suppliers.manage",
            "purchases.read",
            "purchases.manage",
            "purchases.receive",
            "reports.read",
            "exports.read",
            "imports.manage",
            "members.read",
            "members.manage",
            "organization.manage",
          ],
        });
      }
    } catch {
      // Dev mode fallback
      setConfig({
        apiUrl,
        sessionToken: "session-active-token",
        organizationId: "org-diallo",
        user: {
          id: "user-hamidou",
          name: "Hamidou Diallo",
          email: "hamidou@diallo.ml",
          role: "owner",
        },
        permissions: [
          "products.read",
          "products.manage",
          "inventory.read",
          "inventory.adjust",
          "customers.read",
          "customers.manage",
          "sales.read",
          "sales.create",
          "sales.manage",
          "payments.read",
          "payments.record",
          "quotes.read",
          "quotes.manage",
          "invoices.read",
          "invoices.manage",
          "expenses.read",
          "expenses.manage",
          "suppliers.read",
          "suppliers.manage",
          "purchases.read",
          "purchases.manage",
          "purchases.receive",
          "reports.read",
          "exports.read",
          "imports.manage",
          "members.read",
          "members.manage",
          "organization.manage",
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionContext();
  }, []);

  const apiFetch = async <T = any,>(path: string, options?: RequestInit): Promise<T> => {
    if (!config) {
      throw new ApiClientError("Workspace Non Initialisé", 401);
    }
    return workspaceFetch<T>(path, config, options);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        config,
        isLoading,
        error,
        isAuthenticated: !!config,
        apiFetch,
        refreshContext: fetchSessionContext,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace doit être utilisé au sein d'un WorkspaceProvider");
  }
  return context;
}
