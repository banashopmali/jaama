// Authoritative JAAMA Domain & Business Contracts (JAA-S0-07 / JAA-S1-01..20)

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
  | "sales.manage"
  | "products.read"
  | "products.manage"
  | "inventory.read"
  | "inventory.adjust"
  | "customers.read"
  | "customers.manage"
  | "payments.read"
  | "payments.record"
  | "quotes.read"
  | "quotes.manage"
  | "invoices.read"
  | "invoices.manage"
  | "expenses.read"
  | "expenses.manage"
  | "suppliers.read"
  | "suppliers.manage"
  | "purchases.read"
  | "purchases.manage"
  | "purchases.receive"
  | "organization.manage"
  | "members.read"
  | "members.manage"
  | "reports.read"
  | "imports.manage"
  | "exports.read";

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
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status: "active" | "archived";
  type: "walk_in" | "registered";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  unitPriceMinor: number;
  costMinor?: number | null;
  currencyCode: CurrencyCode;
  status: "active" | "inactive" | "archived";
  barcode?: string | null;
  lowStockThreshold?: number | null;
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

export type StockMovementType =
  | "OPENING"
  | "SALE_OUT"
  | "PURCHASE_IN"
  | "ADJUSTMENT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER"
  | "RETURN"
  | "RETURN_IN"
  | "RETURN_OUT";

export interface StockMovement {
  id: string;
  organizationId: string;
  productId: string;
  movementType: StockMovementType;
  quantityDelta: number;
  reference?: string | null;
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
  customerId: string | null;
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

// =====================================================================
// Sprint 2: African Commerce & Payments OS Foundation (JAA-S2-01)
// =====================================================================

export type PaymentIntentStatus =
  | "REQUIRES_PAYMENT"
  | "PROCESSING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentAttemptStatus =
  | "CREATED"
  | "PENDING_PROVIDER"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type SettlementStatus =
  | "PENDING"
  | "PARTIALLY_SETTLED"
  | "SETTLED"
  | "RECONCILIATION_REQUIRED"
  | "RECONCILED"
  | "FAILED";

export type WebhookEventStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "IGNORED";

export type PaymentReconciliationStatus =
  | "MATCHED"
  | "DISCREPANCY_AMOUNT"
  | "DISCREPANCY_STATUS"
  | "UNMATCHED_PROVIDER"
  | "UNMATCHED_INTERNAL";

export type PaymentProviderType =
  | "mock"
  | "wave"
  | "orange_money"
  | "moov_money"
  | "mtn_momo"
  | "bank_transfer";

export type PaymentErrorCode =
  | "INVALID_STATE_TRANSITION"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_SIGNATURE"
  | "IDEMPOTENCY_CONFLICT"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "PAYMENT_INTENT_EXPIRED"
  | "PAYMENT_INTENT_ALREADY_PAID"
  | "TENANT_MISMATCH"
  | "UNAUTHORIZED_PROVIDER_ACTION"
  | "PROVIDER_ERROR";

export class PaymentDomainError extends Error {
  public readonly code: PaymentErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: PaymentErrorCode, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = "PaymentDomainError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, PaymentDomainError.prototype);
  }
}

export interface PaymentProviderConfig {
  id: string;
  organizationId: string;
  provider: PaymentProviderType;
  isEnabled: boolean;
  isTestMode: boolean;
  webhookEndpointKey: string;
  apiKeyEncrypted?: string | null;
  apiSecretEncrypted?: string | null;
  webhookSecret?: string | null;
  merchantId?: string | null;
  metadataJson?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentIntent {
  id: string;
  organizationId: string;
  reference: string;
  amountMinor: number;
  currencyCode: CurrencyCode;
  status: PaymentIntentStatus;
  saleId?: string | null;
  orderId?: string | null;
  invoiceId?: string | null;
  customerId?: string | null;
  description?: string | null;
  metadataJson?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAttempt {
  id: string;
  organizationId: string;
  paymentIntentId: string;
  provider: PaymentProviderType;
  amountMinor: number;
  currencyCode: CurrencyCode;
  status: PaymentAttemptStatus;
  idempotencyKey: string;
  requestHash?: string | null;
  paymentId?: string | null;
  providerReference?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadataJson?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderTransaction {
  id: string;
  organizationId: string;
  paymentAttemptId: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  statusRaw: string;
  feeMinor: number;
  netMinor: number;
  rawPayloadJson: string;
  occurredAt: Date;
  createdAt: Date;
}

export interface Settlement {
  id: string;
  organizationId: string;
  provider: PaymentProviderType;
  reference: string;
  currencyCode: CurrencyCode;
  totalAmountMinor: number;
  settledAmountMinor: number;
  feeAmountMinor: number;
  status: SettlementStatus;
  settledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationRecord {
  id: string;
  organizationId: string;
  provider: PaymentProviderType;
  providerTransactionId?: string | null;
  paymentId?: string | null;
  settlementId?: string | null;
  status: PaymentReconciliationStatus;
  discrepancyType?: string | null;
  detailsJson?: string;
  createdAt: Date;
  resolvedAt?: Date | null;
}

export interface WebhookEvent {
  id: string;
  organizationId?: string | null;
  provider: PaymentProviderType;
  eventId: string;
  eventType: string;
  payloadJson: string;
  headersJson?: string;
  signatureVerified: boolean;
  status: WebhookEventStatus;
  processedAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
}

// Pure Financial Amount Validator
export function assertSafeIntegerAmount(
  value: unknown,
  fieldName: string,
  min: number = 0,
  max?: number
): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new PaymentDomainError(
      "AMOUNT_MISMATCH",
      `${fieldName} must be a safe integer, got ${value}`,
      { fieldName, value }
    );
  }
  if (value < min) {
    throw new PaymentDomainError(
      "AMOUNT_MISMATCH",
      `${fieldName} must be at least ${min}, got ${value}`,
      { fieldName, value, min }
    );
  }
  if (max !== undefined && value > max) {
    throw new PaymentDomainError(
      "AMOUNT_MISMATCH",
      `${fieldName} cannot exceed ${max}, got ${value}`,
      { fieldName, value, max }
    );
  }
}

// State Machine Transition Rules & Pure Validators

export const VALID_PAYMENT_INTENT_TRANSITIONS: Record<PaymentIntentStatus, ReadonlyArray<PaymentIntentStatus>> = {
  REQUIRES_PAYMENT: ["PROCESSING", "CANCELLED", "EXPIRED"],
  PROCESSING: ["PARTIALLY_PAID", "PAID", "REQUIRES_PAYMENT", "CANCELLED", "EXPIRED"],
  PARTIALLY_PAID: ["PROCESSING", "PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function isValidPaymentIntentTransition(
  from: PaymentIntentStatus,
  to: PaymentIntentStatus
): boolean {
  return VALID_PAYMENT_INTENT_TRANSITIONS[from].includes(to);
}

export function assertValidPaymentIntentTransition(
  from: PaymentIntentStatus,
  to: PaymentIntentStatus
): void {
  if (!isValidPaymentIntentTransition(from, to)) {
    throw new PaymentDomainError(
      "INVALID_STATE_TRANSITION",
      `Invalid PaymentIntent transition from ${from} to ${to}`,
      { from, to }
    );
  }
}

export const VALID_PAYMENT_ATTEMPT_TRANSITIONS: Record<PaymentAttemptStatus, ReadonlyArray<PaymentAttemptStatus>> = {
  CREATED: ["PENDING_PROVIDER", "FAILED", "CANCELLED"],
  PENDING_PROVIDER: ["PROCESSING", "SUCCEEDED", "FAILED", "EXPIRED"],
  PROCESSING: ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function isValidPaymentAttemptTransition(
  from: PaymentAttemptStatus,
  to: PaymentAttemptStatus
): boolean {
  return VALID_PAYMENT_ATTEMPT_TRANSITIONS[from].includes(to);
}

export function assertValidPaymentAttemptTransition(
  from: PaymentAttemptStatus,
  to: PaymentAttemptStatus
): void {
  if (!isValidPaymentAttemptTransition(from, to)) {
    throw new PaymentDomainError(
      "INVALID_STATE_TRANSITION",
      `Invalid PaymentAttempt transition from ${from} to ${to}`,
      { from, to }
    );
  }
}

export const VALID_SETTLEMENT_TRANSITIONS: Record<SettlementStatus, ReadonlyArray<SettlementStatus>> = {
  PENDING: ["PARTIALLY_SETTLED", "SETTLED", "RECONCILIATION_REQUIRED", "FAILED"],
  PARTIALLY_SETTLED: ["SETTLED", "RECONCILIATION_REQUIRED", "FAILED"],
  SETTLED: ["RECONCILIATION_REQUIRED"],
  RECONCILIATION_REQUIRED: ["RECONCILED", "FAILED"],
  RECONCILED: [],
  FAILED: [],
};

export function isValidSettlementTransition(
  from: SettlementStatus,
  to: SettlementStatus
): boolean {
  return VALID_SETTLEMENT_TRANSITIONS[from].includes(to);
}

export function assertValidSettlementTransition(
  from: SettlementStatus,
  to: SettlementStatus
): void {
  if (!isValidSettlementTransition(from, to)) {
    throw new PaymentDomainError(
      "INVALID_STATE_TRANSITION",
      `Invalid Settlement transition from ${from} to ${to}`,
      { from, to }
    );
  }
}

// Payment Provider Contract
export type ProviderAttemptState =
  | "PENDING_PROVIDER"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED";

export interface ProviderAttemptResult {
  state: ProviderAttemptState;
  providerReference: string;
  providerStatus: string;
  paymentUrl?: string;
  feeMinor?: number;
  netMinor?: number;
  rawResponse?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookParseResult {
  eventId: string;
  eventType: string;
  providerReference: string;
  status: PaymentAttemptStatus;
  amountMinor: number;
  currencyCode: CurrencyCode;
  feeMinor?: number;
  netMinor?: number;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly providerType: PaymentProviderType;

  createPaymentAttempt(
    config: PaymentProviderConfig,
    intent: PaymentIntent,
    attempt: PaymentAttempt
  ): Promise<ProviderAttemptResult>;

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Uint8Array,
    webhookSecret: string
  ): Promise<boolean>;

  parseWebhookEvent(payload: Record<string, unknown>): WebhookParseResult;

  checkTransactionStatus(
    config: PaymentProviderConfig,
    providerReference: string
  ): Promise<ProviderAttemptResult>;
}

