import { PosAction, PosState } from "./pos.types";
import { mockPosCustomers } from "./pos.mock";
import { calculateTotal, derivePaymentStatus, validatePosCheckout } from "./pos.utils";

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
  idempotencyKey: generateIdempotencyKey(),
  validationError: null,
  isSubmitting: false,
  submitError: null,
  confirmedSale: null,
};

export function posReducer(state: PosState, action: PosAction): PosState {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };

    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.payload };

    case "ADD_TO_CART": {
      const prod = action.payload;
      const existing = state.cart.find((line) => line.productId === prod.id);
      const stockAvail = prod.stock?.available ?? (prod as any).stockCount ?? 0;
      if (existing) {
        if (existing.quantity >= existing.maxAvailableStock) return state;
        return {
          ...state,
          cart: state.cart.map((line) =>
            line.productId === prod.id ? { ...line, quantity: line.quantity + 1 } : line
          ),
        };
      }
      if (stockAvail <= 0) return state;
      return {
        ...state,
        cart: [
          ...state.cart,
          {
            productId: prod.id,
            sku: prod.sku,
            name: prod.name,
            unitPrice: prod.unitPrice ?? (prod as any).priceAmount ?? 0,
            quantity: 1,
            maxAvailableStock: stockAvail,
          },
        ],
      };
    }

    case "INCREMENT_LINE": {
      const line = state.cart.find((l) => l.productId === action.payload);
      if (!line || line.quantity >= line.maxAvailableStock) return state;
      return {
        ...state,
        cart: state.cart.map((l) =>
          l.productId === action.payload ? { ...l, quantity: l.quantity + 1 } : l
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

    case "REMOVE_LINE":
      return {
        ...state,
        cart: state.cart.filter((l) => l.productId !== action.payload),
      };

    case "CLEAR_CART":
      return {
        ...state,
        cart: [],
        discountAmount: 0,
        paymentMethod: null,
        paidAmountInput: 0,
        cashReceivedInput: 0,
        paymentAllocations: [],
      };

    case "SET_CUSTOMER":
      return { ...state, customer: action.payload };

    case "SET_DISCOUNT":
      return { ...state, discountAmount: Math.max(0, action.payload) };

    case "SET_PAYMENT_METHOD":
      return {
        ...state,
        paymentMethod: action.payload,
        validationError: null,
      };

    case "SET_PAID_AMOUNT":
      return { ...state, paidAmountInput: Math.max(0, action.payload), validationError: null };

    case "SET_CASH_RECEIVED":
      return { ...state, cashReceivedInput: Math.max(0, action.payload), validationError: null };

    case "ADD_ALLOCATION":
      return {
        ...state,
        paymentAllocations: [...state.paymentAllocations, action.payload],
        validationError: null,
      };

    case "REMOVE_ALLOCATION":
      return {
        ...state,
        paymentAllocations: state.paymentAllocations.filter((a) => a.id !== action.payload),
        validationError: null,
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

    case "GO_TO_STEP":
      return { ...state, step: action.payload };

    case "SUBMIT_START":
      return { ...state, isSubmitting: true, submitError: null };

    case "SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmitting: false,
        step: "success",
        confirmedSale: action.payload,
      };

    case "SUBMIT_ERROR":
      return {
        ...state,
        isSubmitting: false,
        submitError: action.payload,
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
