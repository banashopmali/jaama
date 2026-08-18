import React from "react";
import { Banknote, Smartphone, Building2, CreditCard, Layers, Clock } from "lucide-react";
import { PaymentMethod } from "../sales.types";
import { getPaymentMethodLabel } from "../sales.utils";

export interface PaymentMethodLabelProps {
  method: PaymentMethod;
}

export const PaymentMethodLabel: React.FC<PaymentMethodLabelProps> = ({ method }) => {
  const getIcon = () => {
    switch (method) {
      case "cash":
        return <Banknote className="w-3.5 h-3.5 text-status-success shrink-0" />;
      case "wave":
        return <Smartphone className="w-3.5 h-3.5 text-content-brand shrink-0" />;
      case "orange_money":
        return <Smartphone className="w-3.5 h-3.5 text-status-warning shrink-0" />;
      case "bank_transfer":
        return <Building2 className="w-3.5 h-3.5 text-content-secondary shrink-0" />;
      case "card":
        return <CreditCard className="w-3.5 h-3.5 text-content-brand shrink-0" />;
      case "mixed":
        return <Layers className="w-3.5 h-3.5 text-content-secondary shrink-0" />;
      case "credit":
        return <Clock className="w-3.5 h-3.5 text-status-warning shrink-0" />;
      default:
        return <Banknote className="w-3.5 h-3.5 text-content-secondary shrink-0" />;
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content-primary">
      {getIcon()}
      <span>{getPaymentMethodLabel(method)}</span>
    </span>
  );
};
