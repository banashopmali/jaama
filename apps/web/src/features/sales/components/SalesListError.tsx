import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, Button } from "@jaama/ui";

export interface SalesListErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryHref?: string;
}

export const SalesListError: React.FC<SalesListErrorProps> = ({
  title = "Erreur de chargement des ventes",
  message = "Impossible de charger la liste des ventes pour le moment. Veuillez réessayer.",
  onRetry,
  retryHref = "/ventes",
}) => {
  const renderAction = () => {
    if (onRetry) {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Réessayer
        </Button>
      );
    }

    return (
      <Link href={retryHref}>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Réessayer
        </Button>
      </Link>
    );
  };

  return (
    <div className="p-4 bg-surface-default border border-border-subtle rounded-xl shadow-xs">
      <Alert
        variant="danger"
        title={title}
        icon={<AlertCircle className="w-5 h-5 text-status-danger" />}
        action={renderAction()}
      >
        <p className="text-xs text-content-secondary leading-relaxed mt-1">
          {message}
        </p>
      </Alert>
    </div>
  );
};
