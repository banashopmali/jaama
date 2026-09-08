import React from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button, Card, Alert } from "@jaama/ui";
import { PaymentMethod } from "../../sales/sales.types";
import { PosCartLine, PosCustomer, PosPaymentAllocation } from "../pos.types";
import {
  calculateAppliedPaidAmount,
  calculateRemaining,
  calculateSubtotal,
  calculateTotal,
  derivePaymentStatus,
} from "../pos.utils";
import { formatMoney } from "../../sales/sales.utils";
import { CustomerSelector } from "./CustomerSelector";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { PaymentAmountInput } from "./PaymentAmountInput";
import { MixedPaymentEditor } from "./MixedPaymentEditor";
import { SaleReview } from "./SaleReview";

export interface CheckoutViewProps {
  cart: PosCartLine[];
  customer: PosCustomer;
  discountAmount: number;
  paymentMethod: PaymentMethod | null;
  paidAmountInput: number;
  cashReceivedInput: number;
  paymentAllocations: PosPaymentAllocation[];
  validationError: string | null;
  submitError?: string | null;
  onSelectCustomer: (customer: PosCustomer) => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onPaidAmountChange: (amount: number) => void;
  onCashReceivedChange: (amount: number) => void;
  onAddAllocation: (allocation: PosPaymentAllocation) => void;
  onRemoveAllocation: (id: string) => void;
  onUpdateAllocationAmount: (id: string, amount: number) => void;
  onUpdateAllocationMethod: (id: string, method: Exclude<PaymentMethod, "mixed" | "credit">) => void;
  onBackToCart: () => void;
  onConfirmSale: () => void;
  isSubmitting?: boolean;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  customer,
  discountAmount,
  paymentMethod,
  paidAmountInput,
  cashReceivedInput,
  paymentAllocations,
  validationError,
  submitError,
  onSelectCustomer,
  onSelectPaymentMethod,
  onPaidAmountChange,
  onCashReceivedChange,
  onAddAllocation,
  onRemoveAllocation,
  onUpdateAllocationAmount,
  onUpdateAllocationMethod,
  onBackToCart,
  onConfirmSale,
  isSubmitting,
}) => {
  const subtotal = calculateSubtotal(cart);
  const totalAmount = calculateTotal(subtotal, discountAmount);
  const paidAmount = calculateAppliedPaidAmount(
    paymentMethod,
    paidAmountInput,
    cashReceivedInput,
    paymentAllocations,
    totalAmount
  );
  const remainingAmount = calculateRemaining(totalAmount, paidAmount);
  const paymentStatus = derivePaymentStatus(totalAmount, paidAmount);

  const activeError = validationError || submitError;
  const canConfirm = !validationError && paymentMethod !== null && !isSubmitting;

  return (
    <Card variant="default" className="p-5 space-y-6 shadow-xs">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToCart}
            aria-label="Retour au panier"
            className="p-1 h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4 text-content-secondary" />
          </Button>
          <h3 className="text-base font-bold text-content-primary font-sans">
            Règlement de la vente
          </h3>
        </div>

        <span className="text-sm font-extrabold text-content-brand font-sans">
          Total : {formatMoney(totalAmount)}
        </span>
      </div>

      {/* Validation or Network Error Alert */}
      {activeError && (
        <Alert variant="danger" title="Validation impossible">
          <p className="text-xs">{activeError}</p>
        </Alert>
      )}

      {/* Customer Selection */}
      <CustomerSelector
        selectedCustomer={customer}
        onSelectCustomer={onSelectCustomer}
      />

      {/* Payment Method Selector */}
      <PaymentMethodSelector
        selectedMethod={paymentMethod}
        onSelectMethod={onSelectPaymentMethod}
      />

      {/* Payment Amount / Allocation Editor */}
      {paymentMethod && (
        paymentMethod === "mixed" ? (
          <MixedPaymentEditor
            totalAmount={totalAmount}
            allocations={paymentAllocations}
            onAddAllocation={onAddAllocation}
            onRemoveAllocation={onRemoveAllocation}
            onUpdateAllocationAmount={onUpdateAllocationAmount}
            onUpdateAllocationMethod={onUpdateAllocationMethod}
          />
        ) : (
          <PaymentAmountInput
            totalAmount={totalAmount}
            paymentMethod={paymentMethod}
            paidAmountInput={paidAmountInput}
            cashReceivedInput={cashReceivedInput}
            onPaidAmountChange={onPaidAmountChange}
            onCashReceivedChange={onCashReceivedChange}
          />
        )
      )}

      {/* Pre-Confirmation Review */}
      {paymentMethod && (
        <SaleReview
          customer={customer}
          cart={cart}
          subtotal={subtotal}
          discountAmount={discountAmount}
          totalAmount={totalAmount}
          paidAmount={paidAmount}
          remainingAmount={remainingAmount}
          paymentMethod={paymentMethod}
          paymentStatus={paymentStatus}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={onBackToCart}
          className="sm:w-1/3"
        >
          Retour au panier
        </Button>

        <Button
          variant="primary"
          size="lg"
          disabled={!canConfirm}
          onClick={onConfirmSale}
          className="sm:w-2/3"
          leftIcon={<CheckCircle2 className="w-5 h-5" />}
        >
          {isSubmitting ? "Validation en cours..." : `Confirmer la vente (${formatMoney(totalAmount)})`}
        </Button>
      </div>
    </Card>
  );
};
