import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, Button } from "@jaama/ui";

export interface PosErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryHref?: string;
}

export const PosErrorState: React.FC<PosErrorStateProps> = ({
  title = "Erreur de chargement du point de vente",
  message = "Impossible de charger le point de vente pour le moment. Veuillez réessayer.",
  onRetry,
  retryHref = "/ventes/nouvelle",
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
