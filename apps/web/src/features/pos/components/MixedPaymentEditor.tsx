import React from "react";
import { Plus, Trash2, Layers } from "lucide-react";
import { PaymentMethod } from "../../sales/sales.types";
import { PosPaymentAllocation } from "../pos.types";
import { formatMoney, getPaymentMethodLabel } from "../../sales/sales.utils";
import { derivePaymentStatus } from "../pos.utils";
import { PaymentStatusBadge } from "../../sales/components/PaymentStatusBadge";

export interface MixedPaymentEditorProps {
  totalAmount: number;
  allocations: PosPaymentAllocation[];
  onAddAllocation: (allocation: PosPaymentAllocation) => void;
  onRemoveAllocation: (id: string) => void;
  onUpdateAllocationAmount: (id: string, amount: number) => void;
  onUpdateAllocationMethod: (id: string, method: Exclude<PaymentMethod, "mixed" | "credit">) => void;
}

const allowedMethods: Exclude<PaymentMethod, "mixed" | "credit">[] = [
  "cash",
  "wave",
  "orange_money",
  "bank_transfer",
  "card",
];

export const MixedPaymentEditor: React.FC<MixedPaymentEditorProps> = ({
  totalAmount,
  allocations,
  onAddAllocation,
  onRemoveAllocation,
  onUpdateAllocationAmount,
  onUpdateAllocationMethod,
}) => {
  const totalAllocated = allocations.reduce((sum, a) => sum + Math.max(0, a.amount), 0);
  const remaining = Math.max(0, totalAmount - totalAllocated);
  const paymentStatus = derivePaymentStatus(totalAmount, totalAllocated);

  const usedMethods = new Set(allocations.map((a) => a.method));
  const unusedMethods = allowedMethods.filter((m) => !usedMethods.has(m));

  const handleAdd = () => {
    if (unusedMethods.length === 0) return;

    const nextMethod = unusedMethods[0];
    const defaultAmount = remaining > 0 ? remaining : 5000;

    onAddAllocation({
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      method: nextMethod,
      amount: defaultAmount,
    });
  };

  return (
    <div className="space-y-3 bg-surface-subtle p-4 rounded-xl border border-border-subtle">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-content-primary">
          <Layers className="w-4 h-4 text-content-brand" />
          <span>Répartition du règlement mixte</span>
        </div>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      {/* Allocation Rows */}
      <div className="space-y-2">
        {allocations.map((alloc) => (
          <div
            key={alloc.id}
            className="flex items-center gap-2 bg-surface-default p-2.5 rounded-lg border border-border-subtle"
          >
            {/* IMMUTABLE METHOD SELECTOR */}
            <select
              value={alloc.method}
              onChange={(e) => {
                const updatedMethod = e.target.value as Exclude<PaymentMethod, "mixed" | "credit">;
                onUpdateAllocationMethod(alloc.id, updatedMethod);
              }}
              aria-label={`Mode de paiement pour l'allocation ${alloc.id}`}
              className="text-xs font-bold text-content-primary bg-transparent border border-border-default rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {allowedMethods.map((m) => {
                const isSelectedByOther = allocations.some((a) => a.id !== alloc.id && a.method === m);
                return (
                  <option key={m} value={m} disabled={isSelectedByOther}>
                    {getPaymentMethodLabel(m)} {isSelectedByOther ? "(Déjà utilisé)" : ""}
                  </option>
                );
              })}
            </select>

            <input
              type="number"
              min={0}
              value={alloc.amount || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateAllocationAmount(alloc.id, isNaN(val) ? 0 : val);
              }}
              aria-label={`Montant pour ${getPaymentMethodLabel(alloc.method)}`}
              className="flex-1 h-9 px-2 text-right text-xs font-bold text-content-primary bg-surface-default border border-border-default rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />

            <span className="text-[11px] font-semibold text-content-muted">FCFA</span>

            {allocations.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveAllocation(alloc.id)}
                className="text-content-muted hover:text-status-danger p-1 transition-colors"
                aria-label={`Supprimer l'allocation ${getPaymentMethodLabel(alloc.method)}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Allocation CTA (Visible ONLY if unused methods exist) */}
      {unusedMethods.length > 0 && (
        <button
          type="button"
          onClick={handleAdd}
          className="text-xs font-semibold text-content-brand hover:text-brand-primary-hover flex items-center gap-1 pt-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Ajouter un autre mode de paiement</span>
        </button>
      )}

      {/* Totals Summary */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border-subtle font-medium">
        <span>Total distribué : <strong className="text-content-primary">{formatMoney(totalAllocated)}</strong></span>
        <span>Reste : <strong className="text-status-warning">{formatMoney(remaining)}</strong></span>
      </div>
    </div>
  );
};
