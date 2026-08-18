import React from "react";
import Link from "next/link";
import { CheckCircle, PlusCircle, ArrowLeft, Printer } from "lucide-react";
import { Button, Card, Badge } from "@jaama/ui";
import { PosConfirmedSaleSummary } from "../pos.types";
import { formatMoney, getPaymentMethodLabel } from "../../sales/sales.utils";
import { PaymentStatusBadge } from "../../sales/components/PaymentStatusBadge";

export interface SaleSuccessProps {
  summary: PosConfirmedSaleSummary;
  onNewSale: () => void;
}

export const SaleSuccess: React.FC<SaleSuccessProps> = ({ summary, onNewSale }) => {
  return (
    <Card variant="default" className="p-6 md:p-8 text-center max-w-xl mx-auto space-y-6 shadow-md border-border-brand-subtle">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-full bg-status-success-subtle text-status-success flex items-center justify-center border border-border-success-subtle mx-auto shadow-xs">
        <CheckCircle className="w-9 h-9" />
      </div>

      {/* Main Title & Reference */}
      <div className="space-y-1">
        <Badge variant={summary.isSimulated ? "warning" : "success"} size="sm" className="mb-2 uppercase tracking-wide">
          {summary.isSimulated ? "SIMULATION FRONTEND — MOCK TEST ADAPTER" : "VENTE PERSISTÉE — CONFIRMÉE PAR LE SERVEUR"}
        </Badge>
        <h2 className="text-2xl font-extrabold text-content-primary tracking-tight font-sans">
          Vente enregistrée
        </h2>
        <p className="text-xs text-content-secondary font-mono">
          Référence : <strong className="text-content-brand font-bold">{summary.reference}</strong> · {summary.occurredAt}
        </p>
      </div>

      {/* Sale Details Box */}
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-left space-y-3 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
          <span className="text-content-secondary font-medium">Client</span>
          <span className="font-bold text-content-primary">{summary.customer.name}</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
          <span className="text-content-secondary font-medium">Mode de règlement</span>
          <span className="font-bold text-content-primary">{getPaymentMethodLabel(summary.paymentMethod)}</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
          <span className="text-content-secondary font-medium">Statut de paiement</span>
          <PaymentStatusBadge status={summary.paymentStatus} />
        </div>

        <div className="flex justify-between items-center pt-1 font-extrabold text-sm font-sans text-content-primary">
          <span>Total de la vente</span>
          <span className="text-content-brand text-base">{formatMoney(summary.totalAmount)}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span>Montant perçu : <strong className="text-content-primary">{formatMoney(summary.paidAmount)}</strong></span>
          <span>Reste à encaisser : <strong className="text-status-warning">{formatMoney(summary.remainingAmount)}</strong></span>
        </div>

        {summary.changeDue !== undefined && summary.changeDue > 0 && (
          <div className="p-2 rounded bg-status-success-subtle text-status-success font-bold flex justify-between">
            <span>Monnaie rendue au client :</span>
            <span>{formatMoney(summary.changeDue)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={onNewSale}
          className="flex-1"
          leftIcon={<PlusCircle className="w-5 h-5" />}
        >
          Nouvelle vente
        </Button>

        <Link href="/ventes" className="flex-1">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            leftIcon={<ArrowLeft className="w-5 h-5" />}
          >
            Retour aux ventes
          </Button>
        </Link>
      </div>

      {/* Disabled Receipt Action */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          disabled
          title="Impression de reçu disponible prochainement"
          leftIcon={<Printer className="w-4 h-4 text-content-muted" />}
          className="text-content-muted cursor-not-allowed opacity-60"
        >
          Voir / Imprimer le reçu (Bientôt disponible)
        </Button>
      </div>
    </Card>
  );
};
