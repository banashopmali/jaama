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
  customer: PosCustomer;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  cashReceived?: number;
  changeDue?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
}

export interface PosState {
  step: PosStep;
  searchQuery: string;
  selectedCategory: string;
  customer: PosCustomer;
  cart: PosCartLine[];
  discountAmount: number;
  paymentMethod: PaymentMethod | null;
  paidAmountInput: number; // Paid amount for single payment method
  cashReceivedInput: number; // Cash handed by customer for cash change calculation
  paymentAllocations: PosPaymentAllocation[]; // For mixed payments
  confirmedSale: PosConfirmedSaleSummary | null;
  validationError: string | null;
  idempotencyKey: string; // Transient idempotency key per sale attempt
  isSubmitting?: boolean;
}
