"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, Button } from "@jaama/ui";

export interface DashboardSectionErrorProps {
  title: string;
  message?: string;
  onRetry?: () => void;
}

export const DashboardSectionError: React.FC<DashboardSectionErrorProps> = ({
  title,
  message = "Impossible de charger les données de cette section.",
  onRetry,
}) => {
  return (
    <Alert
      variant="danger"
      title={title}
      icon={<AlertCircle className="w-5 h-5 text-status-danger" />}
      action={
        onRetry ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Réessayer
          </Button>
        ) : undefined
      }
    >
      <p className="text-xs text-content-secondary leading-relaxed mt-1">
        {message}
      </p>
    </Alert>
  );
};
