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

export function WorkspaceProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig?: WorkspaceConfig;
}) {
  const [config, setConfig] = useState<WorkspaceConfig | null>(initialConfig || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionContext = async () => {
    setIsLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      // In production web app, fetch session & active organization workspace from /api/v1/auth/me
      const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Send first-party HttpOnly session cookie
      });

      if (res.ok) {
        const data = await res.json();
        setConfig({
          apiUrl,
          sessionToken: data.sessionToken,
          organizationId: data.organizationId,
          user: data.user,
          permissions: data.permissions || [],
        });
      } else {
        // FAIL CLOSED: No fake dev identity or fallback to Hamidou @ org-diallo
        setConfig(null);
        setError("Authentification requise. Aucune session active.");
      }
    } catch {
      // FAIL CLOSED: Network or API failure
      setConfig(null);
      setError("Impossible de contacter le serveur d'authentification.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialConfig) {
      fetchSessionContext();
    }
  }, [initialConfig]);

  const apiFetch = async <T = any,>(path: string, options?: RequestInit): Promise<T> => {
    if (!config) {
      throw new ApiClientError("Workspace non authentifié", 401);
    }
    return workspaceFetch<T>(path, config, options);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-500 text-sm">
        Chargement de l&apos;espace de travail sécurisé...
      </div>
    );
  }

  if (!config && error && !initialConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900">Accès Restreint</h2>
          <p className="text-sm text-gray-600">{error}</p>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-4">
              Veuillez vous connecter avec vos identifiants JAAMA pour accéder à votre entreprise.
            </p>
            <a
              href="/auth/login"
              className="inline-flex justify-center w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
            >
              Se connecter à JAAMA
            </a>
          </div>
        </div>
      </div>
    );
  }

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
    return {
      config: null,
      isLoading: false,
      error: "Workspace Provider indisponible",
      isAuthenticated: false,
      apiFetch: async <T = any,>(_path: string, _options?: RequestInit): Promise<T> => {
        throw new ApiClientError("Workspace Provider non fourni", 401);
      },
      refreshContext: async () => {},
    };
  }
  return context;
}
