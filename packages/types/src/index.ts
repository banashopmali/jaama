// Authoritative JAAMA Domain & Business Contracts (JAA-S0-07)

export type CurrencyCode = "XOF" | "XAF" | "EUR" | "USD";

export interface Money {
  amountMinor: number; // Integer minor units (e.g. 75000 XOF)
  currencyCode: CurrencyCode;
}

export interface UserContext {
  actorId: string;
  organizationId: string;
  membershipId: string;
  permissions: Permission[];
}

export type Role = "owner" | "admin" | "employe" | "comptable" | "vendeur";

export type Permission =
  | "sales.read"
  | "sales.create"
  | "products.read"
  | "products.manage"
  | "inventory.read"
  | "inventory.adjust"
  | "payments.read"
  | "payments.record"
  | "organization.manage"
  | "members.manage"
  | "reports.read";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  createdAt: Date;
  updatedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  tokenHash?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt?: Date;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  type: "walk_in" | "registered";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  category: string;
  unitPriceMinor: number;
  status: "active" | "archived";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InventoryBalance {
  id: string;
  organizationId: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type StockMovementType = "SALE_OUT" | "PURCHASE_IN" | "ADJUSTMENT" | "TRANSFER" | "RETURN";

export interface StockMovement {
  id: string;
  organizationId: string;
  productId: string;
  movementType: StockMovementType;
  quantityDelta: number;
  reference?: string;
  recordedAt: Date;
}

export type SaleStatus = "COMPLETED" | "CANCELLED";

export type PaymentStatus = "TO_COLLECT" | "PARTIALLY_PAID" | "PAID";

export type PaymentMethodCode = "cash" | "wave" | "orange_money" | "bank_transfer" | "card";

export interface SaleLine {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface Sale {
  id: string;
  organizationId: string;
  reference: string;
  customerId: string | null; // null represents walk-in customer context
  sellerUserId: string;
  lines: SaleLine[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  saleStatus: SaleStatus;
  paymentStatus: PaymentStatus;
  occurredAt: Date;
  createdAt: Date;
}

export interface Payment {
  id: string;
  saleId: string;
  organizationId: string;
  method: PaymentMethodCode;
  amountMinor: number;
  status: "SUCCESS" | "FAILED" | "REVERSED";
  recordedAt: Date;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadataJson?: string;
  requestId?: string;
  createdAt: Date;
}

export interface OutboxEvent {
  id: string;
  organizationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payloadJson: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  createdAt: Date;
}

export interface IdempotencyRecord {
  id: string;
  organizationId: string;
  operation: string;
  idempotencyKey: string;
  requestHash: string;
  status: "PROCESSING" | "COMPLETED";
  responseJson?: string;
  createdAt: Date;
}

export interface CreateSaleCommand {
  organizationId: string;
  sellerUserId: string;
  customerId?: string | null;
  lines: Array<{
    productId: string;
    quantity: number;
  }>;
  discountMinor?: number;
  payments: Array<{
    method: PaymentMethodCode;
    amountMinor: number;
  }>;
  idempotencyKey?: string;
}

// Pure Domain Business Functions (No external/HTTP/Prisma dependencies)

export function createMoney(amountMinor: number, currencyCode: CurrencyCode = "XOF"): Money {
  return {
    amountMinor: Math.max(0, Math.round(amountMinor)),
    currencyCode,
  };
}

export function formatMoneyMinor(amountMinor: number, currencyCode: CurrencyCode = "XOF"): string {
  const rounded = Math.max(0, Math.round(amountMinor));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currencyCode === "XOF" ? `${formatted} FCFA` : `${formatted} ${currencyCode}`;
}

export function calculateLineTotalMinor(unitPriceMinor: number, quantity: number): number {
  if (unitPriceMinor < 0 || quantity < 0) return 0;
  return Math.round(unitPriceMinor * quantity);
}

export function calculateSubtotalMinor(lines: Array<{ lineTotalMinor: number }>): number {
  return lines.reduce((sum, line) => sum + Math.max(0, line.lineTotalMinor), 0);
}

export function calculateTotalMinor(subtotalMinor: number, discountMinor: number): number {
  const validSubtotal = Math.max(0, subtotalMinor);
  const validDiscount = Math.max(0, Math.min(discountMinor, validSubtotal));
  return validSubtotal - validDiscount;
}

export function calculateAppliedPaidMinor(
  payments: Array<{ amountMinor: number; status?: string }>,
  totalMinor: number
): number {
  if (totalMinor <= 0) return 0;
  const totalPaid = payments.reduce((sum, p) => {
    if (p.status && p.status !== "SUCCESS") return sum;
    return sum + Math.max(0, p.amountMinor);
  }, 0);
  return Math.min(totalPaid, totalMinor);
}

export function calculateRemainingMinor(totalMinor: number, paidMinor: number): number {
  return Math.max(0, totalMinor - paidMinor);
}

export function derivePaymentStatusFromMinor(totalMinor: number, paidMinor: number): PaymentStatus {
  if (totalMinor <= 0) return "PAID";
  if (paidMinor <= 0) return "TO_COLLECT";
  if (paidMinor < totalMinor) return "PARTIALLY_PAID";
  return "PAID";
}
