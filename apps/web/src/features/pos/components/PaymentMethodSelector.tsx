import React from "react";
import { Banknote, Smartphone, Building2, CreditCard, Clock, Layers, Check } from "lucide-react";
import { PaymentMethod } from "../../sales/sales.types";
import { cn } from "@jaama/ui";

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const paymentMethodOptions: PaymentMethodOption[] = [
  {
    id: "cash",
    label: "Espèces",
    description: "Règlement en billets / pièces",
    icon: <Banknote className="w-5 h-5 text-status-success" />,
  },
  {
    id: "wave",
    label: "Wave",
    description: "Paiement mobile Wave",
    icon: <Smartphone className="w-5 h-5 text-content-brand" />,
  },
  {
    id: "orange_money",
    label: "Orange Money",
    description: "Paiement mobile OM",
    icon: <Smartphone className="w-5 h-5 text-status-warning" />,
  },
  {
    id: "bank_transfer",
    label: "Virement",
    description: "Virement bancaire direct",
    icon: <Building2 className="w-5 h-5 text-content-secondary" />,
  },
  {
    id: "card",
    label: "Carte",
    description: "Carte bancaire TPE",
    icon: <CreditCard className="w-5 h-5 text-content-brand" />,
  },
  {
    id: "credit",
    label: "Crédit",
    description: "Vente à crédit (créance)",
    icon: <Clock className="w-5 h-5 text-status-warning" />,
  },
  {
    id: "mixed",
    label: "Mixte",
    description: "Combinaison de plusieurs modes",
    icon: <Layers className="w-5 h-5 text-content-secondary" />,
  },
];

export interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-content-primary block">
        Mode de règlement
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {paymentMethodOptions.map((opt) => {
          const isSelected = selectedMethod === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectMethod(opt.id)}
              className={cn(
                "p-3 rounded-xl border text-left flex items-start justify-between transition-all duration-150 relative select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                isSelected
                  ? "bg-surface-brand-subtle border-border-brand-subtle ring-2 ring-brand-primary/20 shadow-xs"
                  : "bg-surface-default border-border-subtle hover:border-border-default hover:bg-surface-hover"
              )}
              aria-pressed={isSelected}
              aria-label={`Sélectionner le mode de paiement ${opt.label}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span className="text-xs font-bold text-content-primary">
                    {opt.label}
                  </span>
                </div>
                <span className="text-[10px] text-content-secondary leading-tight block">
                  {opt.description}
                </span>
              </div>

              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-brand-primary text-content-inverse flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
