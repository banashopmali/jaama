import React from "react";
import { Banknote, Calculator } from "lucide-react";
import { PaymentMethod } from "../../sales/sales.types";
import { formatMoney } from "../../sales/sales.utils";
import { derivePaymentStatus } from "../pos.utils";
import { PaymentStatusBadge } from "../../sales/components/PaymentStatusBadge";

export interface PaymentAmountInputProps {
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAmountInput: number;
  cashReceivedInput: number;
  onPaidAmountChange: (amount: number) => void;
  onCashReceivedChange: (amount: number) => void;
}

export const PaymentAmountInput: React.FC<PaymentAmountInputProps> = ({
  totalAmount,
  paymentMethod,
  paidAmountInput,
  cashReceivedInput,
  onPaidAmountChange,
  onCashReceivedChange,
}) => {
  const isCreditMode = paymentMethod === "credit";
  const isCashMode = paymentMethod === "cash";

  // Effective paid amount applied to the sale
  const effectivePaid = isCreditMode ? 0 : Math.min(paidAmountInput, totalAmount);
  const remainingAmount = Math.max(0, totalAmount - effectivePaid);
  const paymentStatus = derivePaymentStatus(totalAmount, effectivePaid);

  // Cash change calculation
  const cashReceived = isCashMode ? cashReceivedInput : paidAmountInput;
  const changeDue = isCashMode && cashReceived > totalAmount ? cashReceived - totalAmount : 0;

  const setExact = () => {
    onPaidAmountChange(totalAmount);
    if (isCashMode) onCashReceivedChange(totalAmount);
  };

  const setHalf = () => {
    const half = Math.round(totalAmount / 2);
    onPaidAmountChange(half);
    if (isCashMode) onCashReceivedChange(half);
  };

  const setCreditZero = () => {
    onPaidAmountChange(0);
    if (isCashMode) onCashReceivedChange(0);
  };

  return (
    <div className="space-y-3 bg-surface-subtle p-4 rounded-xl border border-border-subtle">
      <div className="flex items-center justify-between">
        <label
          htmlFor="pos-paid-amount-input"
          className="text-xs font-bold text-content-primary flex items-center gap-1.5"
        >
          <Calculator className="w-3.5 h-3.5 text-content-brand" />
          <span>Montant perçu par le vendeur</span>
        </label>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={setExact}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-default border border-border-default hover:bg-surface-hover text-content-primary transition-colors"
        >
          Exact ({formatMoney(totalAmount)})
        </button>
        <button
          type="button"
          onClick={setHalf}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-default border border-border-default hover:bg-surface-hover text-content-primary transition-colors"
        >
          Acompte 50% ({formatMoney(Math.round(totalAmount / 2))})
        </button>
        <button
          type="button"
          onClick={setCreditZero}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-default border border-border-default hover:bg-surface-hover text-content-primary transition-colors"
        >
          À crédit (0 FCFA)
        </button>
      </div>

      {/* Input Field */}
      <div className="space-y-1">
        <div className="relative flex items-center">
          <input
            id="pos-paid-amount-input"
            type="number"
            min={0}
            value={isCashMode ? cashReceivedInput || "" : paidAmountInput || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              const num = isNaN(val) ? 0 : Math.max(0, val);
              if (isCashMode) {
                onCashReceivedChange(num);
                onPaidAmountChange(Math.min(num, totalAmount));
              } else {
                onPaidAmountChange(num);
              }
            }}
            placeholder="0"
            aria-label="Montant perçu en FCFA"
            className="w-full h-11 pl-3 pr-16 text-base font-extrabold text-content-primary bg-surface-default border border-border-default rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
          <span className="absolute right-3 text-xs font-bold text-content-muted">
            FCFA
          </span>
        </div>
      </div>

      {/* Cash Change Due Indicator */}
      {isCashMode && changeDue > 0 && (
        <div className="p-2.5 rounded-lg bg-status-success-subtle border border-border-success-subtle text-status-success text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Banknote className="w-4 h-4" />
            Monnaie à rendre au client :
          </span>
          <span className="text-sm font-extrabold">{formatMoney(changeDue)}</span>
        </div>
      )}

      {/* Breakdown Display */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-subtle">
        <div>
          <span className="text-content-secondary block">Encaissé sur vente</span>
          <span className="font-bold text-content-primary">
            {formatMoney(effectivePaid)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-content-secondary block">Reste à percevoir</span>
          <span className="font-bold text-status-warning">
            {formatMoney(remainingAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
