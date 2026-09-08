import React from "react";
import { CheckCircle2, Printer, PlusCircle, ArrowLeft } from "lucide-react";
import { Button, Card } from "@jaama/ui";
import { CompletedSaleSummary } from "../pos.types";
import { formatMoney, getPaymentMethodLabel } from "../../sales/sales.utils";
import { PaymentStatusBadge } from "../../sales/components/PaymentStatusBadge";

export interface SaleSuccessProps {
  summary: CompletedSaleSummary & { changeDue?: number };
  onNewSale: () => void;
  onBackToList?: () => void;
}

export const SaleSuccess: React.FC<SaleSuccessProps> = ({
  summary,
  onNewSale,
  onBackToList = () => {},
}) => {
  const change = summary.changeAmount ?? summary.changeDue ?? 0;

  return (
    <Card variant="default" className="p-8 text-center max-w-lg mx-auto space-y-6">
      {/* Icon & Title */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-status-success-subtle text-status-success flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-content-primary font-sans">
          Vente enregistrée
        </h2>
        <p className="text-xs text-content-secondary font-mono">
          Référence : <strong className="text-content-brand font-bold">{summary.reference}</strong> · {summary.occurredAt}
        </p>

        {summary.isSimulated && (
          <div className="p-2 rounded-lg bg-status-warning-subtle text-status-warning text-xs font-bold border border-status-warning-border">
            SIMULATION FRONTEND — MOCK TEST ADAPTER
          </div>
        )}
      </div>

      {/* Sale Details Box */}
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-left space-y-3 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
          <span className="text-content-secondary font-medium">Client</span>
          <span className="font-bold text-content-primary">{summary.customer?.name || "Client"}</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
          <span className="text-content-secondary font-medium">Mode de règlement</span>
          <span className="font-bold text-content-primary">{getPaymentMethodLabel(summary.paymentMethod)}</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
          <span className="text-content-secondary font-medium">Statut de paiement</span>
          <PaymentStatusBadge status={summary.paymentStatus} />
        </div>

        <div className="flex justify-between items-center text-sm pt-1">
          <span className="text-content-primary font-bold">Montant Total</span>
          <span className="text-lg font-extrabold text-content-brand">{formatMoney(summary.totalAmount)}</span>
        </div>

        {change > 0 && (
          <div className="flex justify-between items-center p-2.5 rounded-lg bg-status-success-subtle text-status-success text-xs font-bold mt-2">
            <span>Monnaie rendue au client :</span>
            <span className="text-sm font-extrabold">{formatMoney(change)}</span>
          </div>
        )}
      </div>

      {/* Action CTA Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          variant="secondary"
          size="md"
          className="w-full justify-center gap-2"
          onClick={() => {
            alert(`Impression du reçu pour la vente ${summary.reference}`);
          }}
          leftIcon={<Printer className="w-4 h-4" />}
        >
          Imprimer le reçu
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            size="md"
            className="w-full justify-center gap-1.5"
            onClick={onNewSale}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Nouvelle vente
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full justify-center gap-1.5"
            onClick={onBackToList}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Voir les ventes
          </Button>
        </div>
      </div>
    </Card>
  );
};
