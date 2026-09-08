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
} from "../provider.interface";

export class MockPaymentProvider implements PaymentProvider {
  public readonly providerType: PaymentProviderType = "mock";

  public async createPaymentAttempt(
    config: PaymentProviderConfig,
    intent: PaymentIntent,
    attempt: PaymentAttempt
  ): Promise<ProviderAttemptResult> {
    if (attempt.amountMinor <= 0) {
      throw new PaymentDomainError("AMOUNT_MISMATCH", "Attempt amount must be positive", {
        amountMinor: attempt.amountMinor,
      });
    }

    // Deterministic simulation based on idempotencyKey or metadata
    if (attempt.idempotencyKey.includes("fail") || attempt.errorMessage === "SIMULATE_FAILURE") {
      return {
        success: false,
        providerReference: `mock_fail_${attempt.id}`,
        providerStatus: "FAILED",
        errorCode: "INSUFFICIENT_FUNDS",
        errorMessage: "Mock simulated payment failure",
        rawResponse: { simulated: true, outcome: "FAILED" },
      };
    }

    const providerReference = `mock_tx_${attempt.id}`;
    return {
      success: true,
      providerReference,
      providerStatus: "COMPLETED",
      paymentUrl: `https://pay.mock.jaama.test/checkout/${attempt.id}`,
      rawResponse: {
        simulated: true,
        outcome: "COMPLETED",
        reference: providerReference,
        amountMinor: attempt.amountMinor,
        currencyCode: attempt.currencyCode,
        feeMinor: Math.round(attempt.amountMinor * 0.01), // 1% simulated fee
      },
    };
  }

  public async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
    webhookSecret: string
  ): Promise<boolean> {
    const signature = headers["x-mock-signature"] || headers["x-jaama-signature"];
    if (!signature || typeof signature !== "string") {
      return false;
    }

    if (signature === "valid_mock_signature" || signature === "test-secret-signature") {
      return true;
    }

    // HMAC-SHA256 signature check if secret is configured
    try {
      const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(bodyString)
        .digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  public parseWebhookEvent(payload: Record<string, any>): WebhookParseResult {
    const eventId = String(payload.id || payload.eventId || `evt_${Date.now()}`);
    const eventType = String(payload.type || payload.eventType || "payment.succeeded");
    const data = payload.data || payload;

    const providerReference = String(data.providerReference || data.reference || data.transactionId || "");
    const rawStatus = String(data.status || "SUCCEEDED").toUpperCase();
    
    let status: "SUCCEEDED" | "FAILED" | "PROCESSING" = "PROCESSING";
    if (rawStatus === "SUCCEEDED" || rawStatus === "SUCCESS" || rawStatus === "COMPLETED") {
      status = "SUCCEEDED";
    } else if (rawStatus === "FAILED" || rawStatus === "DECLINED" || rawStatus === "CANCELLED") {
      status = "FAILED";
    }

    const amountMinor = Number(data.amountMinor || data.amount || 0);
    const currencyCode = data.currencyCode || data.currency || "XOF";
    const feeMinor = Number(data.feeMinor || 0);
    const netMinor = amountMinor - feeMinor;

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
        success: false,
        providerReference,
        providerStatus: "FAILED",
        errorCode: "TRANSACTION_FAILED",
        errorMessage: "Transaction failed at mock provider",
      };
    }

    return {
      success: true,
      providerReference,
      providerStatus: "COMPLETED",
      rawResponse: { status: "COMPLETED", providerReference },
    };
  }
}
