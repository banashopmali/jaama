import React from "react";
import { Badge } from "@jaama/ui";
import { PaymentStatus } from "../sales.types";

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const getBadgeVariant = () => {
    switch (status) {
      case "Payée":
        return "success";
      case "Partiellement payée":
        return "warning";
      case "À encaisser":
        return "neutral";
      case "Remboursée":
        return "danger";
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
