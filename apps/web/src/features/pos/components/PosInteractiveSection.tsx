"use client";

import React, { useReducer, useTransition, useState, useEffect } from "react";
import { PaymentMethod } from "../../sales/sales.types";
import { posInitialState, posReducer } from "../pos.reducer";
import { mockPosProducts } from "../pos.mock";
import { PosCartLine, PosCustomer, PosPaymentAllocation, PosProduct, PosConfirmedSaleSummary } from "../pos.types";
import { PosHeader } from "./PosHeader";
import { ProductCatalog } from "./ProductCatalog";
import { CartPanel } from "./CartPanel";
import { CheckoutView } from "./CheckoutView";
import { SaleSuccess } from "./SaleSuccess";
import { PosApiContext, submitSaleToApi } from "../pos.api";
import { calculateSubtotal, calculateTotal, validatePosCheckout } from "../pos.utils";
import { useWorkspace } from "@/context/WorkspaceContext";

export interface PosInteractiveSectionProps {
  apiContext?: PosApiContext;
  initialProducts?: PosProduct[];
  apiAdapter?: (
    cart: PosCartLine[],
    discountAmount: number,
    paymentMethod: PaymentMethod | null,
    paidAmountInput: number,
    cashReceivedInput: number,
    allocations: PosPaymentAllocation[],
    idempotencyKey: string,
    customerId?: string | null
  ) => Promise<PosConfirmedSaleSummary>;
}

export const PosInteractiveSection: React.FC<PosInteractiveSectionProps> = ({
  apiContext,
  initialProducts,
  apiAdapter,
}) => {
  const { apiFetch, config } = useWorkspace();
  const [state, dispatch] = useReducer(posReducer, posInitialState);
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState<PosProduct[]>(
    initialProducts || (config || apiContext ? [] : mockPosProducts)
  );
  const [loadingProducts, setLoadingProducts] = useState<boolean>(
    !initialProducts && Boolean(config || apiContext)
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProducts) return;

    async function loadCatalog() {
      setLoadingProducts(true);
      setCatalogError(null);
      try {
        const res = await apiFetch("/api/v1/products");
        const list = res.data || [];
        const mapped: PosProduct[] = list.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          priceAmount: p.unitPriceMinor,
          currency: "FCFA",
          stockCount: p.inventoryBalance ? p.inventoryBalance.availableQuantity : 0,
        }));
        setProducts(mapped);
      } catch (err: any) {
        setCatalogError(err?.message || "Impossible de charger le catalogue de la caisse.");
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }

    if (config || apiContext) {
      loadCatalog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, apiContext, initialProducts]);

  const handleConfirmSaleApi = () => {
    const subtotal = calculateSubtotal(state.cart);
    const totalAmount = calculateTotal(subtotal, state.discountAmount);
    const clientValidationErr = validatePosCheckout(
      state.cart,
      state.paymentMethod,
      state.paidAmountInput,
      state.cashReceivedInput,
      state.paymentAllocations,
      totalAmount
    );

    if (clientValidationErr) {
      dispatch({ type: "SUBMIT_ERROR", payload: clientValidationErr });
      return;
    }

    dispatch({ type: "SUBMIT_START" });
    startTransition(async () => {
      try {
        let confirmedSale: PosConfirmedSaleSummary;
        if (apiAdapter) {
          confirmedSale = await apiAdapter(
            state.cart,
            state.discountAmount,
            state.paymentMethod,
            state.paidAmountInput,
            state.cashReceivedInput,
            state.paymentAllocations,
            state.idempotencyKey || "",
            state.customer.id
          );
        } else if (apiContext || config) {
          const effectiveApiContext = apiContext || {
            apiUrl: config!.apiUrl,
            organizationId: config!.organizationId,
          };

          confirmedSale = await submitSaleToApi(
            state.cart,
            state.discountAmount,
            state.paymentMethod,
            state.paidAmountInput,
            state.cashReceivedInput,
            state.paymentAllocations,
            state.idempotencyKey || "",
            state.customer.id,
            effectiveApiContext
          );
        } else {
          throw new Error("Session d’entreprise indisponible. Impossible d’enregistrer cette vente.");
        }
        dispatch({ type: "SUBMIT_SUCCESS", payload: confirmedSale });
      } catch (err: any) {
        const errorMsg = err?.message || "Erreur lors de la validation de la vente sur le serveur.";
        dispatch({ type: "SUBMIT_ERROR", payload: errorMsg });
      }
    });
  };

  // Success Step View (Full Screen)
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
      <PosHeader
        onResetCart={() => dispatch({ type: "CLEAR_CART" })}
        hasCartItems={state.cart.length > 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CATALOG PANEL */}
        <div
          className={`lg:col-span-7 space-y-6 ${
            state.step === "catalog" ? "block" : "hidden lg:block"
          }`}
        >
          {loadingProducts ? (
            <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
              Chargement des produits de la caisse...
            </div>
          ) : catalogError ? (
            <div className="p-8 text-center text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
              {catalogError}
            </div>
          ) : (
            <ProductCatalog
              products={products}
              searchQuery={state.searchQuery}
              selectedCategory={state.selectedCategory}
              cart={state.cart}
              onSearchChange={(q) => dispatch({ type: "SET_SEARCH", payload: q })}
              onSelectCategory={(cat: string) => dispatch({ type: "SET_CATEGORY", payload: cat })}
              onAddToCart={(prod: PosProduct) => dispatch({ type: "ADD_TO_CART", payload: prod })}
              onResetSearch={() => dispatch({ type: "SET_SEARCH", payload: "" })}
            />
          )}
        </div>

        {/* CART & CHECKOUT PANEL */}
        <div
          className={`lg:col-span-5 space-y-6 ${
            state.step === "catalog" ? "hidden lg:block" : "block"
          }`}
        >
          {state.step === "catalog" || state.step === "cart" ? (
            <CartPanel
              cart={state.cart}
              customer={state.customer}
              discountAmount={state.discountAmount}
              onSelectCustomer={(c: PosCustomer) => dispatch({ type: "SET_CUSTOMER", payload: c })}
              onIncrementLine={(id: string) => dispatch({ type: "INCREMENT_LINE", payload: id })}
              onDecrementLine={(id: string) => dispatch({ type: "DECREMENT_LINE", payload: id })}
              onRemoveLine={(id: string) => dispatch({ type: "REMOVE_LINE", payload: id })}
              onDiscountChange={(val: number) => dispatch({ type: "SET_DISCOUNT", payload: val })}
              onProceedToCheckout={() => dispatch({ type: "GO_TO_STEP", payload: "checkout" })}
            />
          ) : (
            <CheckoutView
              cart={state.cart}
              customer={state.customer}
              discountAmount={state.discountAmount}
              paymentMethod={state.paymentMethod}
              paidAmountInput={state.paidAmountInput}
              cashReceivedInput={state.cashReceivedInput}
              paymentAllocations={state.paymentAllocations}
              validationError={state.validationError}
              submitError={state.submitError}
              onBackToCart={() => dispatch({ type: "GO_TO_STEP", payload: "cart" })}
              onSelectPaymentMethod={(m: PaymentMethod) => dispatch({ type: "SET_PAYMENT_METHOD", payload: m })}
              onPaidAmountChange={(val: number) => dispatch({ type: "SET_PAID_AMOUNT", payload: val })}
              onCashReceivedChange={(val: number) => dispatch({ type: "SET_CASH_RECEIVED", payload: val })}
              onAddAllocation={(alloc: PosPaymentAllocation) => dispatch({ type: "ADD_ALLOCATION", payload: alloc })}
              onRemoveAllocation={(id: string) => dispatch({ type: "REMOVE_ALLOCATION", payload: id })}
              onUpdateAllocationMethod={(id: string, method: Exclude<PaymentMethod, "mixed" | "credit">) =>
                dispatch({ type: "UPDATE_ALLOCATION_METHOD", payload: { id, method } })
              }
              onUpdateAllocationAmount={(id: string, amount: number) =>
                dispatch({ type: "UPDATE_ALLOCATION_AMOUNT", payload: { id, amount } })
              }
              onSelectCustomer={(c: PosCustomer) => dispatch({ type: "SET_CUSTOMER", payload: c })}
              onConfirmSale={handleConfirmSaleApi}
              isSubmitting={isPending || state.isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
};
