import React from "react";
import { Badge } from "@jaama/ui";
import { SaleStatus } from "../sales.types";

export interface SaleStatusBadgeProps {
  status: SaleStatus;
}

export const SaleStatusBadge: React.FC<SaleStatusBadgeProps> = ({ status }) => {
  if (status === "Terminée") {
    return null; // Keep main view focused on payment status; secondary label for exceptions
  }

  const getBadgeVariant = () => {
    switch (status) {
      case "Annulée":
        return "danger";
      case "Remboursée":
      case "Partiellement remboursée":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <Badge variant={getBadgeVariant()} size="sm">
      {status}
    </Badge>
  );
};
