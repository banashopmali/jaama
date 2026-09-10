import * as crypto from "crypto";
import {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentIntent,
  PaymentAttempt,
  ProviderAttemptResult,
  WebhookParseResult,
  PaymentProviderType,
  PaymentDomainError,
  PaymentAttemptStatus,
  assertSafeIntegerAmount,
} from "../provider.interface";

export class MockPaymentProvider implements PaymentProvider {
  public readonly providerType: PaymentProviderType = "mock";

  public async createPaymentAttempt(
    config: PaymentProviderConfig,
    intent: PaymentIntent,
    attempt: PaymentAttempt
  ): Promise<ProviderAttemptResult> {
    assertSafeIntegerAmount(attempt.amountMinor, "attempt.amountMinor", 1);

    if (process.env.NODE_ENV === "production") {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        "Mock payment provider is strictly forbidden in production"
      );
    }

    const providerReference = `mock_tx_${attempt.id}`;

    // Deterministic simulation based on idempotencyKey or metadata
    if (attempt.idempotencyKey.includes("fail") || attempt.errorMessage === "SIMULATE_FAILURE") {
      return {
        state: "FAILED",
        providerReference: `mock_fail_${attempt.id}`,
        providerStatus: "FAILED",
        errorCode: "INSUFFICIENT_FUNDS",
        errorMessage: "Mock simulated payment failure",
        rawResponse: { simulated: true, outcome: "FAILED" },
      };
    }

    // Deterministic integer fee calculation (1% floor, safe integer)
    const feeMinor = Math.floor(attempt.amountMinor / 100);
    const netMinor = attempt.amountMinor - feeMinor;

    // Explicitly allow immediate success ONLY if configured for sync/instant test cases
    if (
      attempt.idempotencyKey.includes("instant_succeed") ||
      attempt.idempotencyKey.includes("sync_succeed")
    ) {
      return {
        state: "SUCCEEDED",
        providerReference,
        providerStatus: "CONFIRMED",
        paymentUrl: `https://pay.mock.jaama.test/checkout/${attempt.id}`,
        feeMinor,
        netMinor,
        rawResponse: {
          simulated: true,
          outcome: "CONFIRMED",
          reference: providerReference,
          amountMinor: attempt.amountMinor,
          currencyCode: attempt.currencyCode,
          feeMinor,
          netMinor,
        },
      };
    }

    // Standard asynchronous provider flow: request accepted != payment confirmed
    return {
      state: "PENDING_PROVIDER",
      providerReference,
      providerStatus: "PENDING",
      paymentUrl: `https://pay.mock.jaama.test/checkout/${attempt.id}`,
      feeMinor,
      netMinor,
      rawResponse: {
        simulated: true,
        outcome: "PENDING",
        reference: providerReference,
        amountMinor: attempt.amountMinor,
        currencyCode: attempt.currencyCode,
        feeMinor,
        netMinor,
      },
    };
  }

  public async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Uint8Array,
    webhookSecret: string
  ): Promise<boolean> {
    if (!webhookSecret || typeof webhookSecret !== "string" || webhookSecret.trim() === "") {
      return false; // Missing webhook secret => FAIL CLOSED
    }

    const signature = headers["x-mock-signature"] || headers["x-jaama-signature"];
    if (!signature || typeof signature !== "string") {
      return false;
    }

    try {
      const bodyBuffer =
        typeof rawBody === "string"
          ? Buffer.from(rawBody, "utf8")
          : Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength);

      const expectedSignatureHex = crypto
        .createHmac("sha256", webhookSecret)
        .update(bodyBuffer)
        .digest("hex");

      const sigBuf = Buffer.from(signature, "hex");
      const expectedBuf = Buffer.from(expectedSignatureHex, "hex");

      if (sigBuf.length !== expectedBuf.length || sigBuf.length === 0) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  public parseWebhookEvent(payload: Record<string, any>): WebhookParseResult {
    const rawEventId = payload.id ?? payload.eventId;
    if (!rawEventId || typeof rawEventId !== "string" || rawEventId.trim() === "") {
      throw new PaymentDomainError(
        "PROVIDER_ERROR",
        "Malformed webhook: missing or invalid eventId"
      );
    }
    const eventId = String(rawEventId).trim();
    const eventType = String(payload.type || payload.eventType || "payment.status_update");
    const data = payload.data || payload;

    const rawReference = data.providerReference || data.reference || data.transactionId;
    if (!rawReference || typeof rawReference !== "string" || rawReference.trim() === "") {
      throw new PaymentDomainError(
        "PROVIDER_ERROR",
        "Malformed webhook: missing providerReference"
      );
    }
    const providerReference = String(rawReference).trim();

    const rawStatus = String(data.status || "PROCESSING").toUpperCase();
    let status: PaymentAttemptStatus = "PROCESSING";
    if (
      rawStatus === "SUCCEEDED" ||
      rawStatus === "SUCCESS" ||
      rawStatus === "COMPLETED" ||
      rawStatus === "CONFIRMED"
    ) {
      status = "SUCCEEDED";
    } else if (
      rawStatus === "FAILED" ||
      rawStatus === "DECLINED" ||
      rawStatus === "REJECTED"
    ) {
      status = "FAILED";
    } else if (rawStatus === "CANCELLED" || rawStatus === "CANCELED") {
      status = "CANCELLED";
    } else if (rawStatus === "EXPIRED") {
      status = "EXPIRED";
    } else if (rawStatus === "PENDING" || rawStatus === "PENDING_PROVIDER") {
      status = "PENDING_PROVIDER";
    } else {
      status = "PROCESSING";
    }

    const amountMinor = data.amountMinor ?? data.amount;
    assertSafeIntegerAmount(amountMinor, "amountMinor", 1);

    const feeMinor = data.feeMinor ?? 0;
    assertSafeIntegerAmount(feeMinor, "feeMinor", 0, amountMinor);

    const netMinor = data.netMinor ?? amountMinor - feeMinor;
    assertSafeIntegerAmount(netMinor, "netMinor", 0, amountMinor);

    if (feeMinor + netMinor !== amountMinor) {
      throw new PaymentDomainError(
        "AMOUNT_MISMATCH",
        `Webhook financial invariant violated: feeMinor (${feeMinor}) + netMinor (${netMinor}) != amountMinor (${amountMinor})`
      );
    }

    const currencyCode = data.currencyCode || data.currency || "XOF";

    return {
      eventId,
      eventType,
      providerReference,
      status,
      amountMinor,
      currencyCode,
      feeMinor,
      netMinor,
      rawPayload: payload,
    };
  }

  public async checkTransactionStatus(
    _config: PaymentProviderConfig,
    providerReference: string
  ): Promise<ProviderAttemptResult> {
    if (providerReference.includes("fail")) {
      return {
        state: "FAILED",
        providerReference,
        providerStatus: "FAILED",
        errorCode: "TRANSACTION_FAILED",
        errorMessage: "Transaction failed at mock provider",
      };
    }

    return {
      state: "SUCCEEDED",
      providerReference,
      providerStatus: "COMPLETED",
      rawResponse: { status: "COMPLETED", providerReference },
    };
  }
}
