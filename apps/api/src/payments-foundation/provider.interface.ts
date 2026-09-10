// Authoritative Payment Provider Contract (JAA-S2-01)
export type {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentIntent,
  PaymentAttempt,
  ProviderTransaction,
  Settlement,
  ReconciliationRecord,
  WebhookEvent,
  PaymentProviderType,
  PaymentIntentStatus,
  PaymentAttemptStatus,
  SettlementStatus,
  WebhookEventStatus,
  PaymentReconciliationStatus,
  PaymentErrorCode,
  ProviderAttemptState,
  ProviderAttemptResult,
  WebhookParseResult,
} from "@jaama/types";

export {
  PaymentDomainError,
  assertSafeIntegerAmount,
  isValidPaymentIntentTransition,
  assertValidPaymentIntentTransition,
  isValidPaymentAttemptTransition,
  assertValidPaymentAttemptTransition,
  isValidSettlementTransition,
  assertValidSettlementTransition,
  validateProviderAttemptResult,
} from "@jaama/types";
