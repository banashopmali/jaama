import { PaymentMethod, PaymentStatus, SaleStatus } from "../sales/sales.types";

export type PosStateMode = "ready" | "empty-catalog" | "loading" | "error";

export type PosStep = "catalog" | "cart" | "checkout" | "success";

export interface PosProductStock {
  available: number;
  status: "available" | "low" | "out";
}

export interface PosProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number; // Integer FCFA
  stock: PosProductStock;
  imageUrl?: string;
}

export interface PosCartLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxAvailableStock: number;
}

export interface PosCustomer {
  id?: string;
  name: string;
  type: "walk_in" | "registered";
}

export interface PosPaymentAllocation {
  id: string;
  method: Exclude<PaymentMethod, "mixed" | "credit">;
  amount: number; // Integer FCFA
}

export interface PosConfirmedSaleSummary {
  reference: string;
  occurredAt: string;
  customer?: PosCustomer;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  cashReceived?: number;
  changeDue?: number;
  changeAmount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
  isSimulated?: boolean;
}

export type CompletedSaleSummary = PosConfirmedSaleSummary;

export interface PosState {
  step: PosStep;
  cart: PosCartLine[];
  customer: PosCustomer;
  discountAmount: number;
  paymentMethod: PaymentMethod | null;
  paidAmountInput: number;
  cashReceivedInput: number;
  paymentAllocations: PosPaymentAllocation[];
  idempotencyKey: string | null;
  validationError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  confirmedSale: PosConfirmedSaleSummary | null;
  searchQuery: string;
  selectedCategory: string;
}

export type PosAction =
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_CATEGORY"; payload: string }
  | { type: "ADD_TO_CART"; payload: PosProduct }
  | { type: "INCREMENT_LINE"; payload: string }
  | { type: "DECREMENT_LINE"; payload: string }
  | { type: "REMOVE_LINE"; payload: string }
  | { type: "CLEAR_CART" }
  | { type: "SET_CUSTOMER"; payload: PosCustomer }
  | { type: "SET_DISCOUNT"; payload: number }
  | { type: "SET_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "SET_PAID_AMOUNT"; payload: number }
  | { type: "SET_CASH_RECEIVED"; payload: number }
  | { type: "ADD_ALLOCATION"; payload: PosPaymentAllocation }
  | { type: "REMOVE_ALLOCATION"; payload: string }
  | {
      type: "UPDATE_ALLOCATION_METHOD";
      payload: { id: string; method: Exclude<PaymentMethod, "mixed" | "credit"> };
    }
  | { type: "UPDATE_ALLOCATION_AMOUNT"; payload: { id: string; amount: number } }
  | { type: "GO_TO_STEP"; payload: PosStep }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; payload: PosConfirmedSaleSummary }
  | { type: "SUBMIT_ERROR"; payload: string }
  | { type: "RESET_POS" };
