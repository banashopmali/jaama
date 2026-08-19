import { PaymentMethod } from "../sales/sales.types";
import { PosCartLine, PosConfirmedSaleSummary, PosCustomer, PosPaymentAllocation, PosProduct, PosState, PosStep } from "./pos.types";
import { mockPosCustomers, mockPosProducts } from "./pos.mock";

export type PosAction =
  | { type: "GO_TO_STEP"; payload: PosStep }
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
  | { type: "UPDATE_ALLOCATION_METHOD"; payload: { id: string; method: Exclude<PaymentMethod, "mixed" | "credit"> } }
  | { type: "UPDATE_ALLOCATION_AMOUNT"; payload: { id: string; amount: number } }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; payload: PosConfirmedSaleSummary }
  | { type: "SUBMIT_ERROR"; payload: string }
  | { type: "RESET_POS" };

function generateIdempotencyKey(): string {
  return `pos-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export const posInitialState: PosState = {
  step: "catalog",
  searchQuery: "",
  selectedCategory: "Tous",
  customer: mockPosCustomers[0],
  cart: [],
  discountAmount: 0,
  paymentMethod: null,
  paidAmountInput: 0,
  cashReceivedInput: 0,
  paymentAllocations: [],
  confirmedSale: null,
  validationError: null,
  idempotencyKey: generateIdempotencyKey(),
  isSubmitting: false,
};

export function posReducer(state: PosState, action: PosAction): PosState {
  switch (action.type) {
    case "GO_TO_STEP":
      return { ...state, step: action.payload, validationError: null };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };
    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.payload };
    case "SET_CUSTOMER":
      return { ...state, customer: action.payload };
    case "ADD_TO_CART": {
      const prod = action.payload;
      const existing = state.cart.find((l) => l.productId === prod.id);
      if (existing) {
        if (existing.quantity >= prod.stock.available) return state;
        return {
          ...state,
          cart: state.cart.map((l) =>
            l.productId === prod.id ? { ...l, quantity: l.quantity + 1 } : l
          ),
        };
      }
      if (prod.stock.available <= 0) return state;
      const newLine: PosCartLine = {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        unitPrice: prod.unitPrice,
        quantity: 1,
        maxAvailableStock: prod.stock.available,
      };
      return { ...state, cart: [...state.cart, newLine] };
    }
    case "INCREMENT_LINE": {
      return {
        ...state,
        cart: state.cart.map((l) =>
          l.productId === action.payload && l.quantity < l.maxAvailableStock
            ? { ...l, quantity: l.quantity + 1 }
            : l
        ),
      };
    }
    case "DECREMENT_LINE": {
      return {
        ...state,
        cart: state.cart
          .map((l) => (l.productId === action.payload ? { ...l, quantity: l.quantity - 1 } : l))
          .filter((l) => l.quantity > 0),
      };
    }
    case "REMOVE_LINE": {
      return { ...state, cart: state.cart.filter((l) => l.productId !== action.payload) };
    }
    case "CLEAR_CART":
      return { ...state, cart: [], discountAmount: 0, validationError: null };
    case "SET_DISCOUNT":
      return { ...state, discountAmount: Math.max(0, action.payload) };
    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.payload, validationError: null };
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
    case "UPDATE_ALLOCATION_METHOD":
      return {
        ...state,
        paymentAllocations: state.paymentAllocations.map((a) =>
          a.id === action.payload.id ? { ...a, method: action.payload.method } : a
        ),
      };
    case "UPDATE_ALLOCATION_AMOUNT":
      return {
        ...state,
        paymentAllocations: state.paymentAllocations.map((a) =>
          a.id === action.payload.id ? { ...a, amount: Math.max(0, action.payload.amount) } : a
        ),
      };
    case "SUBMIT_START":
      return { ...state, isSubmitting: true, validationError: null };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmitting: false,
        step: "success",
        confirmedSale: action.payload,
        cart: [],
      };
    case "SUBMIT_ERROR":
      return {
        ...state,
        isSubmitting: false,
        validationError: action.payload,
      };
    case "RESET_POS":
      return {
        ...posInitialState,
        idempotencyKey: generateIdempotencyKey(),
      };
    default:
      return state;
  }
}
