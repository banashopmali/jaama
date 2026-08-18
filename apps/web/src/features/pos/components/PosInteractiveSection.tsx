"use client";

import React, { useReducer } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@jaama/ui";
import { PaymentMethod } from "../../sales/sales.types";
import {
  PosCartLine,
  PosConfirmedSaleSummary,
  PosCustomer,
  PosPaymentAllocation,
  PosProduct,
  PosState,
  PosStep,
} from "../pos.types";
import { mockPosCustomers, mockPosProducts } from "../pos.mock";
import {
  calculatePaidAmount,
  calculateRemaining,
  calculateSubtotal,
  calculateTotal,
  derivePaymentStatus,
} from "../pos.utils";
import { formatMoney } from "../../sales/sales.utils";
import { PosHeader } from "./PosHeader";
import { ProductCatalog } from "./ProductCatalog";
import { CartPanel } from "./CartPanel";
import { CheckoutView } from "./CheckoutView";
import { SaleSuccess } from "./SaleSuccess";

export interface PosInteractiveSectionProps {
  initialProducts?: PosProduct[];
}

type PosAction =
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_CATEGORY"; payload: string }
  | { type: "SET_CUSTOMER"; payload: PosCustomer }
  | { type: "ADD_TO_CART"; payload: PosProduct }
  | { type: "INCREMENT_LINE"; payload: string }
  | { type: "DECREMENT_LINE"; payload: string }
  | { type: "REMOVE_LINE"; payload: string }
  | { type: "CLEAR_CART" }
  | { type: "SET_DISCOUNT"; payload: number }
  | { type: "SET_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "SET_PAID_AMOUNT"; payload: number }
  | { type: "SET_CASH_RECEIVED"; payload: number }
  | { type: "ADD_ALLOCATION"; payload: PosPaymentAllocation }
  | { type: "REMOVE_ALLOCATION"; payload: string }
  | { type: "UPDATE_ALLOCATION_AMOUNT"; payload: { id: string; amount: number } }
  | { type: "GO_TO_STEP"; payload: PosStep }
  | { type: "CONFIRM_MOCK_SALE" }
  | { type: "RESET_POS" };

const initialState: PosState = {
  step: "catalog",
  searchQuery: "",
  selectedCategory: "Tous",
  customer: mockPosCustomers[0], // Default: Client comptoir
  cart: [],
  discountAmount: 0,
  paymentMethod: null,
  paidAmountInput: 0,
  cashReceivedInput: 0,
  paymentAllocations: [],
  confirmedSale: null,
  validationError: null,
};

function posReducer(state: PosState, action: PosAction): PosState {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };

    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.payload };

    case "SET_CUSTOMER":
      return { ...state, customer: action.payload };

    case "ADD_TO_CART": {
      const product = action.payload;
      if (product.stock.status === "out" || product.stock.available === 0) {
        return state;
      }

      const existingIndex = state.cart.findIndex((l) => l.productId === product.id);
      let updatedCart: PosCartLine[];

      if (existingIndex >= 0) {
        const existingLine = state.cart[existingIndex];
        if (existingLine.quantity >= product.stock.available) {
          return state; // Stock limit reached
        }
        updatedCart = [...state.cart];
        updatedCart[existingIndex] = {
          ...existingLine,
          quantity: existingLine.quantity + 1,
        };
      } else {
        updatedCart = [
          ...state.cart,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: product.unitPrice,
            quantity: 1,
            maxAvailableStock: product.stock.available,
          },
        ];
      }

      const subtotal = calculateSubtotal(updatedCart);
      const total = calculateTotal(subtotal, state.discountAmount);

      return {
        ...state,
        cart: updatedCart,
        validationError: null,
        paidAmountInput: state.paymentMethod === "credit" ? 0 : total,
        cashReceivedInput: state.paymentMethod === "credit" ? 0 : total,
      };
    }

    case "INCREMENT_LINE": {
      const productId = action.payload;
      const updatedCart = state.cart.map((line) => {
        if (line.productId === productId) {
          if (line.quantity >= line.maxAvailableStock) return line;
          return { ...line, quantity: line.quantity + 1 };
        }
        return line;
      });

      const subtotal = calculateSubtotal(updatedCart);
      const total = calculateTotal(subtotal, state.discountAmount);

      return {
        ...state,
        cart: updatedCart,
        paidAmountInput: state.paymentMethod === "credit" ? 0 : total,
      };
    }

    case "DECREMENT_LINE": {
      const productId = action.payload;
      const updatedCart = state.cart
        .map((line) => {
          if (line.productId === productId) {
            return { ...line, quantity: line.quantity - 1 };
          }
          return line;
        })
        .filter((line) => line.quantity > 0);

      const subtotal = calculateSubtotal(updatedCart);
      const total = calculateTotal(subtotal, state.discountAmount);

      return {
        ...state,
        cart: updatedCart,
        paidAmountInput: state.paymentMethod === "credit" ? 0 : total,
      };
    }

    case "REMOVE_LINE": {
      const updatedCart = state.cart.filter((line) => line.productId !== action.payload);
      const subtotal = calculateSubtotal(updatedCart);
      const total = calculateTotal(subtotal, state.discountAmount);

      return {
        ...state,
        cart: updatedCart,
        paidAmountInput: state.paymentMethod === "credit" ? 0 : total,
      };
    }

    case "CLEAR_CART": {
      return {
        ...state,
        cart: [],
        discountAmount: 0,
        paidAmountInput: 0,
        cashReceivedInput: 0,
        paymentAllocations: [],
        validationError: null,
        step: "catalog",
      };
    }

    case "SET_DISCOUNT": {
      const discount = Math.max(0, action.payload);
      const subtotal = calculateSubtotal(state.cart);
      const total = calculateTotal(subtotal, discount);

      return {
        ...state,
        discountAmount: discount,
        paidAmountInput: state.paymentMethod === "credit" ? 0 : total,
      };
    }

    case "SET_PAYMENT_METHOD": {
      const method = action.payload;
      const subtotal = calculateSubtotal(state.cart);
      const total = calculateTotal(subtotal, state.discountAmount);

      let initialPaid = total;
      let initialAllocations: PosPaymentAllocation[] = [];

      if (method === "credit") {
        initialPaid = 0;
      } else if (method === "mixed") {
        initialAllocations = [
          { id: `alloc-cash-${Date.now()}`, method: "cash", amount: Math.round(total / 2) },
          { id: `alloc-wave-${Date.now()}`, method: "wave", amount: total - Math.round(total / 2) },
        ];
      }

      return {
        ...state,
        paymentMethod: method,
        paidAmountInput: initialPaid,
        cashReceivedInput: method === "cash" ? total : initialPaid,
        paymentAllocations: initialAllocations,
        validationError: null,
      };
    }

    case "SET_PAID_AMOUNT":
      return { ...state, paidAmountInput: Math.max(0, action.payload) };

    case "SET_CASH_RECEIVED":
      return { ...state, cashReceivedInput: Math.max(0, action.payload) };

    case "ADD_ALLOCATION":
      return {
        ...state,
        paymentAllocations: [...state.paymentAllocations, action.payload],
      };

    case "REMOVE_ALLOCATION":
      return {
        ...state,
        paymentAllocations: state.paymentAllocations.filter((a) => a.id !== action.payload),
      };

    case "UPDATE_ALLOCATION_AMOUNT": {
      const { id, amount } = action.payload;
      return {
        ...state,
        paymentAllocations: state.paymentAllocations.map((a) =>
          a.id === id ? { ...a, amount: Math.max(0, amount) } : a
        ),
      };
    }

    case "GO_TO_STEP":
      return { ...state, step: action.payload, validationError: null };

    case "CONFIRM_MOCK_SALE": {
      // Validations
      if (state.cart.length === 0) {
        return { ...state, validationError: "Votre panier est vide." };
      }
      if (!state.paymentMethod) {
        return { ...state, validationError: "Veuillez sélectionner un mode de règlement." };
      }

      const subtotal = calculateSubtotal(state.cart);
      const totalAmount = calculateTotal(subtotal, state.discountAmount);
      if (totalAmount <= 0) {
        return { ...state, validationError: "Le montant total de la vente doit être supérieur à 0 FCFA." };
      }

      const paidAmount = calculatePaidAmount(
        state.paymentMethod,
        state.paidAmountInput,
        state.paymentAllocations
      );
      const remainingAmount = calculateRemaining(totalAmount, paidAmount);
      const paymentStatus = derivePaymentStatus(totalAmount, paidAmount);

      const itemCount = state.cart.reduce((sum, line) => sum + line.quantity, 0);
      const now = new Date();
      const formattedDate = `${now.getDate().toString().padStart(2, "0")}/${(
        now.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${now.getFullYear()} ${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      const cashReceived = state.paymentMethod === "cash" ? state.cashReceivedInput : paidAmount;
      const changeDue = state.paymentMethod === "cash" && cashReceived > totalAmount ? cashReceived - totalAmount : 0;

      const confirmedSale: PosConfirmedSaleSummary = {
        reference: `VTE-00${Math.floor(25 + Math.random() * 90)}`,
        occurredAt: formattedDate,
        customer: state.customer,
        itemCount,
        subtotal,
        discountAmount: state.discountAmount,
        totalAmount,
        paidAmount,
        remainingAmount,
        cashReceived: state.paymentMethod === "cash" ? cashReceived : undefined,
        changeDue: state.paymentMethod === "cash" ? changeDue : undefined,
        paymentMethod: state.paymentMethod,
        paymentStatus,
        saleStatus: "Terminée",
      };

      return {
        ...state,
        confirmedSale,
        step: "success",
        validationError: null,
      };
    }

    case "RESET_POS":
      return initialState;

    default:
      return state;
  }
}

export const PosInteractiveSection: React.FC<PosInteractiveSectionProps> = ({
  initialProducts = mockPosProducts,
}) => {
  const [state, dispatch] = useReducer(posReducer, initialState);

  const subtotal = calculateSubtotal(state.cart);
  const totalAmount = calculateTotal(subtotal, state.discountAmount);
  const itemCount = state.cart.reduce((sum, line) => sum + line.quantity, 0);

  // If sale was confirmed, show Success View
  if (state.step === "success" && state.confirmedSale) {
    return (
      <div className="space-y-6">
        <PosHeader />
        <SaleSuccess
          summary={state.confirmedSale}
          onNewSale={() => dispatch({ type: "RESET_POS" })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PosHeader
        hasCartItems={state.cart.length > 0}
        onResetCart={() => dispatch({ type: "CLEAR_CART" })}
      />

      {/* Main Two-Panel Layout (Desktop) or Step Flow (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Catalog (Visible on Desktop always, or Mobile step 'catalog') */}
        <div
          className={
            state.step === "catalog" || state.step === "cart" || state.step === "checkout"
              ? "lg:col-span-7 xl:col-span-8 block"
              : "hidden lg:block lg:col-span-7 xl:col-span-8"
          }
        >
          <ProductCatalog
            products={initialProducts}
            cart={state.cart}
            searchQuery={state.searchQuery}
            selectedCategory={state.selectedCategory}
            onSearchChange={(query) => dispatch({ type: "SET_SEARCH", payload: query })}
            onSelectCategory={(cat) => dispatch({ type: "SET_CATEGORY", payload: cat })}
            onAddToCart={(prod) => dispatch({ type: "ADD_TO_CART", payload: prod })}
            onResetSearch={() => {
              dispatch({ type: "SET_SEARCH", payload: "" });
              dispatch({ type: "SET_CATEGORY", payload: "Tous" });
            }}
          />
        </div>

        {/* Right Column: Cart Panel or Checkout View */}
        <div className="lg:col-span-5 xl:col-span-4">
          {/* Desktop View: renders CartPanel or CheckoutView directly */}
          <div className="hidden lg:block sticky top-20">
            {state.step === "checkout" ? (
              <CheckoutView
                cart={state.cart}
                customer={state.customer}
                discountAmount={state.discountAmount}
                paymentMethod={state.paymentMethod}
                paidAmountInput={state.paidAmountInput}
                cashReceivedInput={state.cashReceivedInput}
                paymentAllocations={state.paymentAllocations}
                validationError={state.validationError}
                onSelectCustomer={(cust) => dispatch({ type: "SET_CUSTOMER", payload: cust })}
                onSelectPaymentMethod={(method) => dispatch({ type: "SET_PAYMENT_METHOD", payload: method })}
                onPaidAmountChange={(amt) => dispatch({ type: "SET_PAID_AMOUNT", payload: amt })}
                onCashReceivedChange={(amt) => dispatch({ type: "SET_CASH_RECEIVED", payload: amt })}
                onAddAllocation={(alloc) => dispatch({ type: "ADD_ALLOCATION", payload: alloc })}
                onRemoveAllocation={(id) => dispatch({ type: "REMOVE_ALLOCATION", payload: id })}
                onUpdateAllocationAmount={(id, amt) =>
                  dispatch({ type: "UPDATE_ALLOCATION_AMOUNT", payload: { id, amount: amt } })
                }
                onBackToCart={() => dispatch({ type: "GO_TO_STEP", payload: "catalog" })}
                onConfirmSale={() => dispatch({ type: "CONFIRM_MOCK_SALE" })}
              />
            ) : (
              <CartPanel
                cart={state.cart}
                customer={state.customer}
                discountAmount={state.discountAmount}
                onIncrementLine={(id) => dispatch({ type: "INCREMENT_LINE", payload: id })}
                onDecrementLine={(id) => dispatch({ type: "DECREMENT_LINE", payload: id })}
                onRemoveLine={(id) => dispatch({ type: "REMOVE_LINE", payload: id })}
                onSelectCustomer={(cust) => dispatch({ type: "SET_CUSTOMER", payload: cust })}
                onDiscountChange={(disc) => dispatch({ type: "SET_DISCOUNT", payload: disc })}
                onProceedToCheckout={() => dispatch({ type: "GO_TO_STEP", payload: "checkout" })}
              />
            )}
          </div>

          {/* Mobile View: Step-driven panels */}
          <div className="lg:hidden">
            {state.step === "cart" && (
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => dispatch({ type: "GO_TO_STEP", payload: "catalog" })}
                >
                  ← Retour au catalogue
                </Button>
                <CartPanel
                  cart={state.cart}
                  customer={state.customer}
                  discountAmount={state.discountAmount}
                  onIncrementLine={(id) => dispatch({ type: "INCREMENT_LINE", payload: id })}
                  onDecrementLine={(id) => dispatch({ type: "DECREMENT_LINE", payload: id })}
                  onRemoveLine={(id) => dispatch({ type: "REMOVE_LINE", payload: id })}
                  onSelectCustomer={(cust) => dispatch({ type: "SET_CUSTOMER", payload: cust })}
                  onDiscountChange={(disc) => dispatch({ type: "SET_DISCOUNT", payload: disc })}
                  onProceedToCheckout={() => dispatch({ type: "GO_TO_STEP", payload: "checkout" })}
                />
              </div>
            )}

            {state.step === "checkout" && (
              <CheckoutView
                cart={state.cart}
                customer={state.customer}
                discountAmount={state.discountAmount}
                paymentMethod={state.paymentMethod}
                paidAmountInput={state.paidAmountInput}
                cashReceivedInput={state.cashReceivedInput}
                paymentAllocations={state.paymentAllocations}
                validationError={state.validationError}
                onSelectCustomer={(cust) => dispatch({ type: "SET_CUSTOMER", payload: cust })}
                onSelectPaymentMethod={(method) => dispatch({ type: "SET_PAYMENT_METHOD", payload: method })}
                onPaidAmountChange={(amt) => dispatch({ type: "SET_PAID_AMOUNT", payload: amt })}
                onCashReceivedChange={(amt) => dispatch({ type: "SET_CASH_RECEIVED", payload: amt })}
                onAddAllocation={(alloc) => dispatch({ type: "ADD_ALLOCATION", payload: alloc })}
                onRemoveAllocation={(id) => dispatch({ type: "REMOVE_ALLOCATION", payload: id })}
                onUpdateAllocationAmount={(id, amt) =>
                  dispatch({ type: "UPDATE_ALLOCATION_AMOUNT", payload: { id, amount: amt } })
                }
                onBackToCart={() => dispatch({ type: "GO_TO_STEP", payload: "cart" })}
                onConfirmSale={() => dispatch({ type: "CONFIRM_MOCK_SALE" })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile (<1024px) when in catalog step */}
      {state.step === "catalog" && state.cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 bg-surface-default border-t border-border-default shadow-lg z-40">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-content-primary block">
                Panier ({itemCount} {itemCount === 1 ? "article" : "articles"})
              </span>
              <span className="text-base font-extrabold text-content-brand block font-sans">
                {formatMoney(totalAmount)}
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => dispatch({ type: "GO_TO_STEP", payload: "cart" })}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Voir le panier ({itemCount})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
