import * as crypto from "crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import {
  PaymentProviderRegistry,
  PaymentProviderResolver,
  PaymentIntentService,
  WebhookEventService,
  SettlementService,
  PaymentFinalizationService,
  PaymentDomainError,
  MockPaymentProvider,
} from "../payments-foundation";
import { SalesService } from "../sales/sales.service";

class CountingMockProvider extends MockPaymentProvider {
  public callCount = 0;
  public requestedAmounts: number[] = [];

  override async createPaymentAttempt(config: any, intent: any, attempt: any) {
    this.callCount++;
    this.requestedAmounts.push(attempt.amountMinor);
    return super.createPaymentAttempt(config, intent, attempt);
  }
}

class MalformedFeeMockProvider extends MockPaymentProvider {
  override async createPaymentAttempt(config: any, intent: any, attempt: any) {
    const res = await super.createPaymentAttempt(config, intent, attempt);
    return {
      ...res,
      feeMinor: 500,
      netMinor: attempt.amountMinor - 200,
    };
  }
}

describe("JAA-S2-01 — Payment Abstraction Foundation Hardening Tests", () => {
  let providerRegistry: PaymentProviderRegistry;
  let providerResolver: PaymentProviderResolver;
  let intentService: PaymentIntentService;
  let webhookService: WebhookEventService;
  let settlementService: SettlementService;
  let salesService: SalesService;

  const orgAContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["sales.create", "sales.read", "payments.record", "payments.read", "products.manage"],
  };

  const orgBContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-b",
    membershipId: "org-b:user-hamidou",
    permissions: ["sales.create", "sales.read", "payments.record", "payments.read"],
  };

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    await seedPostgresDatabase(prisma);

    await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });

    await prisma.paymentProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
      update: { webhookEndpointKey: "endpoint-org-a", webhookSecret: "secret_org_a_secure_key" },
      create: {
        organizationId: "org-diallo",
        provider: "mock",
        webhookEndpointKey: "endpoint-org-a",
        webhookSecret: "secret_org_a_secure_key",
      },
    });

    providerRegistry = new PaymentProviderRegistry();
    providerResolver = new PaymentProviderResolver(providerRegistry, prisma);
    intentService = new PaymentIntentService(providerResolver, prisma);
    webhookService = new WebhookEventService(providerResolver, prisma);
    settlementService = new SettlementService(prisma);
    salesService = new SalesService();
  });

  afterEach(() => {
    process.env.NODE_ENV = "test";
  });

  // 1. mock provider unavailable as financial authority in production mode
  it("1. rejects mock provider as financial authority in production mode", async () => {
    process.env.NODE_ENV = "production";
    const prodRegistry = new PaymentProviderRegistry();
    expect(prodRegistry.has("mock")).toBe(false);

    const prodResolver = new PaymentProviderResolver(prodRegistry, prisma);
    await expect(
      prodResolver.resolveProvider("org-diallo", "mock")
    ).rejects.toThrow("Mock payment provider is strictly disabled in production");

    const mock = new MockPaymentProvider();
    await expect(
      mock.createPaymentAttempt(
        {} as any,
        {} as any,
        { id: "att-1", amountMinor: 5000, idempotencyKey: "k1" } as any
      )
    ).rejects.toThrow("Mock payment provider is strictly forbidden in production");
  });

  // 2. no hardcoded webhook signature bypass
  it("2. fails closed on hardcoded bypass values like 'valid_mock_signature'", async () => {
    const mock = new MockPaymentProvider();
    const secret = "test_webhook_secret_key_123456";
    const rawBody = JSON.stringify({ id: "evt_1", data: { reference: "ref_1" } });

    // The old bypass value must now fail
    const bypassResult = await mock.verifyWebhookSignature(
      { "x-mock-signature": "valid_mock_signature" },
      rawBody,
      secret
    );
    expect(bypassResult).toBe(false);

    const bypassResult2 = await mock.verifyWebhookSignature(
      { "x-jaama-signature": "test-secret-signature" },
      rawBody,
      secret
    );
    expect(bypassResult2).toBe(false);
  });

  // 3. missing webhook secret fails closed
  it("3. fails closed when webhook secret is missing or unconfigured", async () => {
    const mock = new MockPaymentProvider();
    const rawBody = Buffer.from(JSON.stringify({ id: "evt_1" }));

    // Empty or missing secret must return false
    expect(await mock.verifyWebhookSignature({ "x-mock-signature": "abc" }, rawBody, "")).toBe(false);

    // Resolver rejects webhook routing without secret
    await prisma.paymentProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
      update: { webhookSecret: null, webhookEndpointKey: "test-endpoint-no-secret" },
      create: {
        organizationId: "org-diallo",
        provider: "mock",
        webhookEndpointKey: "test-endpoint-no-secret",
        webhookSecret: null,
      },
    });

    await expect(
      providerResolver.resolveByWebhookEndpoint("mock", "test-endpoint-no-secret")
    ).rejects.toThrow("Webhook secret is not configured");
  });

  // 4. payload.organizationId cannot select tenant
  it("4. resolves tenant deterministically via webhookEndpointKey and ignores payload.organizationId", async () => {
    const configA = await prisma.paymentProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
      update: { webhookEndpointKey: "endpoint-org-a", webhookSecret: "secret_org_a_secure_key" },
      create: {
        organizationId: "org-diallo",
        provider: "mock",
        webhookEndpointKey: "endpoint-org-a",
        webhookSecret: "secret_org_a_secure_key",
      },
    });

    // Create attempt in Org A
    const intentA = await intentService.createPaymentIntent(orgAContext, { amountMinor: 10000 });
    const { attempt: attemptA } = await intentService.createPaymentAttempt(orgAContext, intentA.id, {
      provider: "mock",
      idempotencyKey: "k-attempt-org-a",
    });

    const payload = {
      id: "evt_org_a_1",
      organizationId: "org-b", // Attacker injects org-b into payload
      type: "payment.succeeded",
      data: {
        providerReference: attemptA.providerReference,
        status: "SUCCEEDED",
        amountMinor: 10000,
        currencyCode: "XOF",
      },
    };

    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = crypto.createHmac("sha256", configA.webhookSecret!).update(rawBody).digest("hex");

    // Endpoint resolves Org A via endpoint key, ignores malicious payload.organizationId
    const res = await webhookService.handleWebhook(
      "mock",
      "endpoint-org-a",
      { "x-mock-signature": signature },
      rawBody,
      payload
    );

    expect(res.status).toBe("SUCCESS");

    // Verify webhook event was recorded under Org A
    const event = await prisma.webhookEvent.findUnique({
      where: {
        organizationId_provider_eventId: {
          organizationId: "org-diallo",
          provider: "mock",
          eventId: "evt_org_a_1",
        },
      },
    });
    expect(event?.organizationId).toBe("org-diallo");
  });

  // 5. real raw-body HMAC verification
  it("5. validates raw-body HMAC signature and rejects tampered bytes", async () => {
    const config = await prisma.paymentProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
      update: { webhookEndpointKey: "endpoint-hmac-test", webhookSecret: "very_secret_hmac_key_9999" },
      create: {
        organizationId: "org-diallo",
        provider: "mock",
        webhookEndpointKey: "endpoint-hmac-test",
        webhookSecret: "very_secret_hmac_key_9999",
      },
    });

    const intent = await intentService.createPaymentIntent(orgAContext, { amountMinor: 15000 });
    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "k-hmac-test",
    });

    const payload = {
      id: "evt_hmac_valid",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 15000,
        currencyCode: "XOF",
      },
    };

    const exactBytes = Buffer.from(JSON.stringify(payload));
    const validSig = crypto.createHmac("sha256", config.webhookSecret!).update(exactBytes).digest("hex");

    // Valid signature on exact bytes succeeds
    const ok = await webhookService.handleWebhook(
      "mock",
      "endpoint-hmac-test",
      { "x-mock-signature": validSig },
      exactBytes,
      payload
    );
    expect(ok.status).toBe("SUCCESS");

    // Tampered body with original signature fails
    const tamperedBytes = Buffer.from(JSON.stringify({ ...payload, tampered: true }));
    await expect(
      webhookService.handleWebhook(
        "mock",
        "endpoint-hmac-test",
        { "x-mock-signature": validSig },
        tamperedBytes,
        payload
      )
    ).rejects.toThrow("Webhook signature verification failed");
  });

  // 6. cross-tenant providerReference cannot resolve an attempt
  it("6. rejects cross-tenant attempt resolution via webhook", async () => {
    // Org B config
    await prisma.paymentProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: "org-b", provider: "mock" } },
      update: { webhookEndpointKey: "endpoint-org-b", webhookSecret: "secret_org_b_123" },
      create: {
        organizationId: "org-b",
        provider: "mock",
        webhookEndpointKey: "endpoint-org-b",
        webhookSecret: "secret_org_b_123",
      },
    });

    // Org A attempt
    const intentA = await intentService.createPaymentIntent(orgAContext, { amountMinor: 20000 });
    const { attempt: attemptA } = await intentService.createPaymentAttempt(orgAContext, intentA.id, {
      provider: "mock",
      idempotencyKey: "k-cross-tenant-att",
    });

    // Webhook targeting Org B with Org A's providerReference
    const payload = {
      id: "evt_cross_tenant",
      type: "payment.succeeded",
      data: {
        providerReference: attemptA.providerReference,
        status: "SUCCEEDED",
        amountMinor: 20000,
        currencyCode: "XOF",
      },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const sig = crypto.createHmac("sha256", "secret_org_b_123").update(rawBody).digest("hex");

    await expect(
      webhookService.handleWebhook(
        "mock",
        "endpoint-org-b",
        { "x-mock-signature": sig },
        rawBody,
        payload
      )
    ).rejects.toThrow("does not belong to organization 'org-b'");
  });

  // 7. webhook amount mismatch does not create Payment
  it("7. does not create internal Payment on webhook amount mismatch", async () => {
    const sale = await salesService.createSale(orgAContext, {
      lines: [{ productId: "prod-004", quantity: 1, unitPriceMinor: 6500 }],
    });

    const intent = await intentService.createPaymentIntent(orgAContext, {
      saleId: sale.id,
      amountMinor: 6500,
    });

    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "k-amount-mismatch",
    });

    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    const payload = {
      id: "evt_amt_mismatch",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 5000, // Mismatched: expected 6500
        currencyCode: "XOF",
      },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const sig = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody).digest("hex");

    await expect(
      webhookService.handleWebhook(
        "mock",
        config.webhookEndpointKey,
        { "x-mock-signature": sig },
        rawBody,
        payload
      )
    ).rejects.toThrow(PaymentDomainError);

    // Verify 0 payments created for sale
    const payments = await prisma.payment.findMany({ where: { saleId: sale.id } });
    expect(payments.length).toBe(0);

    // Discrepancy reconciliation record recorded
    const discrepancy = await prisma.reconciliationRecord.findFirst({
      where: { organizationId: "org-diallo", discrepancyType: "AMOUNT_MISMATCH_WEBHOOK_VS_ATTEMPT" },
    });
    expect(discrepancy).toBeDefined();
  });

  // 8. webhook currency mismatch does not create Payment
  it("8. does not create internal Payment on webhook currency mismatch", async () => {
    const sale = await salesService.createSale(orgAContext, {
      lines: [{ productId: "prod-004", quantity: 1, unitPriceMinor: 6500 }],
    });

    const intent = await intentService.createPaymentIntent(orgAContext, {
      saleId: sale.id,
      amountMinor: 6500,
      currencyCode: "XOF",
    });

    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "k-curr-mismatch",
    });

    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    const payload = {
      id: "evt_curr_mismatch",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 6500,
        currencyCode: "EUR", // Mismatched currency
      },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const sig = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody).digest("hex");

    await expect(
      webhookService.handleWebhook(
        "mock",
        config.webhookEndpointKey,
        { "x-mock-signature": sig },
        rawBody,
        payload
      )
    ).rejects.toThrow("Webhook currency (EUR) does not match attempt currency (XOF)");

    const payments = await prisma.payment.findMany({ where: { saleId: sale.id } });
    expect(payments.length).toBe(0);
  });

  // 9. PENDING provider result does not create internal Payment
  it("9. leaves attempt pending and does not create internal Payment on asynchronous acceptance", async () => {
    const sale = await salesService.createSale(orgAContext, {
      lines: [{ productId: "prod-004", quantity: 1, unitPriceMinor: 6500 }],
    });

    const intent = await intentService.createPaymentIntent(orgAContext, {
      saleId: sale.id,
      amountMinor: 6500,
    });

    // Standard attempt creation returns PENDING_PROVIDER
    const { attempt, providerResult } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "k-pending-flow",
    });

    expect(attempt.status).toBe("PENDING_PROVIDER");
    expect(providerResult.state).toBe("PENDING_PROVIDER");

    // Intent is in PROCESSING
    const refreshedIntent = await intentService.getPaymentIntent(orgAContext, intent.id);
    expect(refreshedIntent.status).toBe("PROCESSING");

    // Internal ledger payment NOT created yet
    const payments = await prisma.payment.findMany({ where: { saleId: sale.id } });
    expect(payments.length).toBe(0);
  });

  // 10. confirmed SUCCEEDED result creates Payment exactly once
  it("10. creates internal Payment exactly once when attempt is confirmed", async () => {
    const sale = await salesService.createSale(orgAContext, {
      lines: [{ productId: "prod-004", quantity: 1, unitPriceMinor: 6500 }],
    });

    const intent = await intentService.createPaymentIntent(orgAContext, {
      saleId: sale.id,
      amountMinor: 6500,
    });

    // Instant confirmation flow
    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "instant_succeed_k1",
    });

    expect(attempt.status).toBe("SUCCEEDED");
    expect(attempt.paymentId).toBeDefined();

    // Exactly one Payment created
    const payments = await prisma.payment.findMany({ where: { saleId: sale.id } });
    expect(payments.length).toBe(1);
    expect(payments[0].amountMinor).toBe(6500);

    // Replay returns same result without creating a second Payment
    const replay = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "instant_succeed_k1",
    });
    expect(replay.attempt.id).toBe(attempt.id);

    const paymentsAfterReplay = await prisma.payment.findMany({ where: { saleId: sale.id } });
    expect(paymentsAfterReplay.length).toBe(1);
  });

  // 11. true concurrent overcollection prevention & provider call count = 1
  it("11. prevents overcollection and guarantees provider call count = 1 under true concurrent execution", async () => {
    const countingProvider = new CountingMockProvider();
    providerRegistry.register(countingProvider);

    const intent = await intentService.createPaymentIntent(orgAContext, {
      amountMinor: 10000,
    });

    // Launch Request A (10000) and Request B (10000) simultaneously with different idempotency keys
    const [resA, resB] = await Promise.allSettled([
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 10000,
        idempotencyKey: "concurrent-full-req-a",
      }),
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 10000,
        idempotencyKey: "concurrent-full-req-b",
      }),
    ]);

    const fulfilled = [resA, resB].filter((r) => r.status === "fulfilled");
    const rejected = [resA, resB].filter((r) => r.status === "rejected");

    // Exactly one operation reserves the collectible amount
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason).toBeInstanceOf(PaymentDomainError);
    expect(rejectionReason.code).toBe("AMOUNT_MISMATCH");

    // Only one operation was allowed to call the provider adapter
    expect(countingProvider.callCount).toBe(1);
    expect(countingProvider.requestedAmounts).toEqual([10000]);

    // Exactly one successful/active attempt exists in DB
    const attempts = await prisma.paymentAttempt.findMany({
      where: { organizationId: "org-diallo", paymentIntentId: intent.id },
    });
    expect(attempts.length).toBe(1);
    expect(attempts[0].amountMinor).toBe(10000);
  });

  // 11b. partial reservation 6000 + 5000 on 10000 cannot both reach provider
  it("11b. prevents partial over-reservation (6000 + 5000 on 10000) from reaching provider concurrently", async () => {
    const countingProvider = new CountingMockProvider();
    providerRegistry.register(countingProvider);

    const intent = await intentService.createPaymentIntent(orgAContext, {
      amountMinor: 10000,
    });

    const [resA, resB] = await Promise.allSettled([
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 6000,
        idempotencyKey: "partial-req-6000",
      }),
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 5000,
        idempotencyKey: "partial-req-5000",
      }),
    ]);

    const fulfilled = [resA, resB].filter((r) => r.status === "fulfilled");
    const rejected = [resA, resB].filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason).toBeInstanceOf(PaymentDomainError);
    expect(rejectionReason.code).toBe("AMOUNT_MISMATCH");

    // Only one reached provider adapter
    expect(countingProvider.callCount).toBe(1);

    // Sum of reserved active capacity in DB <= 10000
    const activeAttempts = await prisma.paymentAttempt.findMany({
      where: {
        organizationId: "org-diallo",
        paymentIntentId: intent.id,
        status: { in: ["CREATED", "PENDING_PROVIDER", "PROCESSING", "SUCCEEDED"] },
      },
    });
    const totalActiveMinor = activeAttempts.reduce((sum, a) => sum + a.amountMinor, 0);
    expect(totalActiveMinor).toBeLessThanOrEqual(10000);
  });

  // 11c. concurrent same idempotency key creates one attempt / provider call
  it("11c. guarantees simultaneous identical requests with same idempotency key call provider once and return identical result", async () => {
    const countingProvider = new CountingMockProvider();
    providerRegistry.register(countingProvider);

    const intent = await intentService.createPaymentIntent(orgAContext, {
      amountMinor: 25000,
    });

    const [resA, resB] = await Promise.all([
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 25000,
        idempotencyKey: "concurrent-same-key-claim",
      }),
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 25000,
        idempotencyKey: "concurrent-same-key-claim",
      }),
    ]);

    // Both callers receive the exact same logical result
    expect(resA.attempt.id).toBe(resB.attempt.id);
    expect(resA.attempt.amountMinor).toBe(25000);
    expect(resB.attempt.amountMinor).toBe(25000);

    // Provider call count = 1
    expect(countingProvider.callCount).toBe(1);

    // Exactly one PaymentAttempt exists in DB
    const count = await prisma.paymentAttempt.count({
      where: { organizationId: "org-diallo", idempotencyKey: "concurrent-same-key-claim" },
    });
    expect(count).toBe(1);
  });

  // 12. same idempotency key + same payload => replay
  it("12. returns cached attempt on identical idempotency key replay", async () => {
    const intent = await intentService.createPaymentIntent(orgAContext, { amountMinor: 30000 });

    const first = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      amountMinor: 30000,
      idempotencyKey: "idemp-exact-replay",
    });

    const second = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      amountMinor: 30000,
      idempotencyKey: "idemp-exact-replay",
    });

    expect(second.attempt.id).toBe(first.attempt.id);
    expect(second.providerResult.idempotentReplay).toBe(true);
  });

  // 13. same idempotency key + changed intent/provider/amount => 409 conflict
  it("13. throws 409 IDEMPOTENCY_CONFLICT when key is reused with altered parameters", async () => {
    const intent1 = await intentService.createPaymentIntent(orgAContext, { amountMinor: 30000 });
    const intent2 = await intentService.createPaymentIntent(orgAContext, { amountMinor: 30000 });

    await intentService.createPaymentAttempt(orgAContext, intent1.id, {
      provider: "mock",
      amountMinor: 10000,
      idempotencyKey: "idemp-conflict-key",
    });

    // Reusing key on a DIFFERENT intent
    await expect(
      intentService.createPaymentAttempt(orgAContext, intent2.id, {
        provider: "mock",
        amountMinor: 10000,
        idempotencyKey: "idemp-conflict-key",
      })
    ).rejects.toThrow("Idempotency key has already been used with different request parameters");

    // Reusing key on SAME intent with DIFFERENT amount
    await expect(
      intentService.createPaymentAttempt(orgAContext, intent1.id, {
        provider: "mock",
        amountMinor: 20000,
        idempotencyKey: "idemp-conflict-key",
      })
    ).rejects.toThrow("Idempotency key has already been used with different request parameters");
  });

  // 14. fractional / unsafe / negative financial amounts rejected
  it("14. rejects fractional, negative, and unsafe financial amounts without rounding", async () => {
    await expect(
      intentService.createPaymentIntent(orgAContext, { amountMinor: 1000.5 })
    ).rejects.toThrow("amountMinor must be a safe integer, got 1000.5");

    await expect(
      intentService.createPaymentIntent(orgAContext, { amountMinor: -500 })
    ).rejects.toThrow("amountMinor must be at least 1, got -500");

    await expect(
      intentService.createPaymentIntent(orgAContext, { amountMinor: 0 })
    ).rejects.toThrow("amountMinor must be at least 1, got 0");
  });

  // 15. settlement amount > total rejected
  it("15. rejects settlement where settled amount exceeds total amount", async () => {
    const settlement = await settlementService.createSettlement(orgAContext, {
      provider: "mock",
      reference: "SETTLE-TEST-01",
      totalAmountMinor: 100000,
    });

    await expect(
      settlementService.updateSettlementStatus(
        orgAContext,
        settlement.id,
        "SETTLED",
        150000 // Exceeds total 100000
      )
    ).rejects.toThrow("settledAmountMinor cannot exceed 100000, got 150000");
  });

  // 16. reconciliation without proof cannot default to MATCHED
  it("16. ensures reconciliation record does not default to MATCHED without internal proof", async () => {
    // Create an unlinked ProviderTransaction
    const intent = await intentService.createPaymentIntent(orgAContext, { amountMinor: 5000 });
    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "instant_succeed_rec",
    });

    const tx = await prisma.providerTransaction.findFirstOrThrow({
      where: { paymentAttemptId: attempt.id },
    });

    // Reconcile with missing paymentId => must be UNMATCHED_INTERNAL
    const unlinkedRecord = await settlementService.reconcileRecord(orgAContext, {
      provider: "mock",
      providerTransactionId: tx.id,
    });

    expect(unlinkedRecord.status).toBe("UNMATCHED_INTERNAL");
    expect(unlinkedRecord.discrepancyType).toBe("MISSING_INTERNAL_PAYMENT");
  });

  // 17. tenant isolation remains green
  it("17. enforces zero-trust tenant isolation across all payment operations", async () => {
    const intentA = await intentService.createPaymentIntent(orgAContext, { amountMinor: 40000 });

    // Org B cannot view Org A's intent
    await expect(
      intentService.getPaymentIntent(orgBContext, intentA.id)
    ).rejects.toThrow("PaymentIntent '" + intentA.id + "' not found");

    // Org B cannot cancel Org A's intent
    await expect(
      intentService.cancelPaymentIntent(orgBContext, intentA.id)
    ).rejects.toThrow("PaymentIntent '" + intentA.id + "' not found");

    // Org B cannot create an attempt on Org A's intent
    await expect(
      intentService.createPaymentAttempt(orgBContext, intentA.id, {
        provider: "mock",
        idempotencyKey: "k-org-b-cross",
      })
    ).rejects.toThrow("PaymentIntent '" + intentA.id + "' not found");
  });

  // 18. sync + webhook confirmation race creates exactly one Payment
  it("18. creates exactly one Payment when synchronous confirmation and webhook confirmation race", async () => {
    const sale = await salesService.createSale(orgAContext, {
      lines: [{ productId: "prod-004", quantity: 1, unitPriceMinor: 6500 }],
    });

    const intent = await intentService.createPaymentIntent(orgAContext, {
      saleId: sale.id,
      amountMinor: 6500,
    });

    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    // Create attempt in PENDING_PROVIDER
    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      amountMinor: 6500,
      idempotencyKey: "race-sync-webhook-key",
    });

    const payload = {
      id: "evt_race_sync_webhook",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 6500,
        currencyCode: "XOF",
        feeMinor: 65,
        netMinor: 6435,
      },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const sig = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody).digest("hex");

    const finalizationService = new PaymentFinalizationService(prisma);

    const [syncRes, webhookRes] = await Promise.allSettled([
      prisma.$transaction(async (tx) => {
        return finalizationService.finalizeAttemptSuccess(tx, {
          organizationId: "org-diallo",
          attemptId: attempt.id,
          provider: "mock",
          providerReference: attempt.providerReference!,
          providerStatus: "CONFIRMED",
          feeMinor: 65,
          netMinor: 6435,
          actorId: orgAContext.actorId,
        });
      }),
      webhookService.handleWebhook(
        "mock",
        config.webhookEndpointKey,
        { "x-mock-signature": sig },
        rawBody,
        payload
      ),
    ]);

    expect(syncRes.status).toBe("fulfilled");
    expect(webhookRes.status).toBe("fulfilled");

    // Exactly 1 Payment created in database
    const payments = await prisma.payment.findMany({
      where: { organizationId: "org-diallo", saleId: sale.id },
    });
    expect(payments.length).toBe(1);
    expect(payments[0].sourcePaymentAttemptId).toBe(attempt.id);
    expect(payments[0].amountMinor).toBe(6500);

    // Sale is fully paid
    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { organizationId_id: { organizationId: "org-diallo", id: sale.id } },
    });
    expect(updatedSale.paidMinor).toBe(6500);
    expect(updatedSale.remainingMinor).toBe(0);
    expect(updatedSale.paymentStatus).toBe("PAID");
  });

  // 19. two webhook success events racing on one partial attempt create one Payment
  it("19. creates exactly one Payment when two webhook success events race on the same attempt", async () => {
    const sale = await salesService.createSale(orgAContext, {
      lines: [{ productId: "prod-004", quantity: 2, unitPriceMinor: 5000 }],
    });

    const intent = await intentService.createPaymentIntent(orgAContext, {
      saleId: sale.id,
      amountMinor: 10000,
    });

    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      amountMinor: 4000,
      idempotencyKey: "k-race-two-webhooks",
    });

    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    const makeWebhookCall = (eventId: string) => {
      const payload = {
        id: eventId,
        type: "payment.succeeded",
        data: {
          providerReference: attempt.providerReference,
          status: "SUCCEEDED",
          amountMinor: 4000,
          currencyCode: "XOF",
          feeMinor: 40,
          netMinor: 3960,
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const sig = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody).digest("hex");
      return webhookService.handleWebhook(
        "mock",
        config.webhookEndpointKey,
        { "x-mock-signature": sig },
        rawBody,
        payload
      );
    };

    const results = await Promise.allSettled([
      makeWebhookCall("evt_race_webhook_1"),
      makeWebhookCall("evt_race_webhook_2"),
    ]);

    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("fulfilled");

    // Exactly 1 Payment created for this attempt
    const payments = await prisma.payment.findMany({
      where: { organizationId: "org-diallo", sourcePaymentAttemptId: attempt.id },
    });
    expect(payments.length).toBe(1);
    expect(payments[0].amountMinor).toBe(4000);
  });

  // 20. malformed provider fee/net rejected
  it("20. rejects malformed provider financial result (fee + net != amount) and prevents writing corrupted data", async () => {
    const malformedProvider = new MalformedFeeMockProvider();
    providerRegistry.register(malformedProvider);

    const intent = await intentService.createPaymentIntent(orgAContext, {
      amountMinor: 10000,
    });

    await expect(
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 10000,
        idempotencyKey: "k-malformed-provider-test",
      })
    ).rejects.toThrow("Provider financial result invariant violated");

    // No ProviderTransaction should be saved
    const txs = await prisma.providerTransaction.findMany({
      where: { organizationId: "org-diallo" },
    });
    const malformedTx = txs.find((t) => t.feeMinor === 500 && t.netMinor === 9800);
    expect(malformedTx).toBeUndefined();
  });

  // 21. same webhook event ID + same hash => replay
  it("21. returns ALREADY_PROCESSED when same webhook event ID and identical payload hash is delivered", async () => {
    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    const intent = await intentService.createPaymentIntent(orgAContext, { amountMinor: 8000 });
    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "k-replay-hash-test",
    });

    const payload = {
      id: "evt_replay_same_hash",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 8000,
        currencyCode: "XOF",
        feeMinor: 80,
        netMinor: 7920,
      },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const sig = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody).digest("hex");

    const first = await webhookService.handleWebhook(
      "mock",
      config.webhookEndpointKey,
      { "x-mock-signature": sig },
      rawBody,
      payload
    );
    expect(first.status).toBe("SUCCESS");

    // Replay with identical payload and hash
    const second = await webhookService.handleWebhook(
      "mock",
      config.webhookEndpointKey,
      { "x-mock-signature": sig },
      rawBody,
      payload
    );
    expect(second.status).toBe("ALREADY_PROCESSED");
    expect(second.eventId).toBe("evt_replay_same_hash");
  });

  // 22. same webhook event ID + different hash => conflict
  it("22. rejects with IDEMPOTENCY_CONFLICT when same webhook event ID is received with mutated payload hash", async () => {
    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    const intent = await intentService.createPaymentIntent(orgAContext, { amountMinor: 8000 });
    const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      idempotencyKey: "k-conflict-hash-test",
    });

    const payload1 = {
      id: "evt_mutated_hash_conflict",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 8000,
        currencyCode: "XOF",
        feeMinor: 80,
        netMinor: 7920,
      },
    };
    const rawBody1 = Buffer.from(JSON.stringify(payload1));
    const sig1 = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody1).digest("hex");

    await webhookService.handleWebhook(
      "mock",
      config.webhookEndpointKey,
      { "x-mock-signature": sig1 },
      rawBody1,
      payload1
    );

    // Mutated payload with same event ID
    const payload2 = {
      id: "evt_mutated_hash_conflict",
      type: "payment.succeeded",
      data: {
        providerReference: attempt.providerReference,
        status: "SUCCEEDED",
        amountMinor: 8000,
        currencyCode: "XOF",
        feeMinor: 80,
        netMinor: 7920,
        mutated: true,
      },
    };
    const rawBody2 = Buffer.from(JSON.stringify(payload2));
    const sig2 = crypto.createHmac("sha256", config.webhookSecret!).update(rawBody2).digest("hex");

    await expect(
      webhookService.handleWebhook(
        "mock",
        config.webhookEndpointKey,
        { "x-mock-signature": sig2 },
        rawBody2,
        payload2
      )
    ).rejects.toThrow("Webhook idempotency conflict");
  });

  // 23. no fake Date.now provider event IDs on unverified webhook
  it("23. logs security AuditEvent without creating fake Date.now WebhookEvent on unverified webhook with missing eventId", async () => {
    const config = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { organizationId_provider: { organizationId: "org-diallo", provider: "mock" } },
    });

    const payloadWithoutId = {
      data: { status: "FAILED" },
    };
    const rawBody = Buffer.from(JSON.stringify(payloadWithoutId));

    await expect(
      webhookService.handleWebhook(
        "mock",
        config.webhookEndpointKey,
        { "x-mock-signature": "bad_signature_hex_1234" },
        rawBody,
        payloadWithoutId
      )
    ).rejects.toThrow("Webhook signature verification failed.");

    // Verify NO WebhookEvent was created with unverified_ or fake event ID
    const fakeEvents = await prisma.webhookEvent.findMany({
      where: {
        organizationId: "org-diallo",
        eventId: { contains: "unverified_" },
      },
    });
    expect(fakeEvents.length).toBe(0);

    // Verify security AuditEvent was recorded
    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        organizationId: "org-diallo",
        action: "SECURITY_WEBHOOK_INVALID_SIGNATURE",
      },
    });
    expect(auditEvent).toBeDefined();
    expect(auditEvent?.resourceId).toBe(config.webhookEndpointKey);
  });

  // 24. reconciliation status has no MATCHED database default
  it("24. verifies ReconciliationRecord.status has no default in PostgreSQL database schema", async () => {
    const cols: any[] = await prisma.$queryRaw`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'ReconciliationRecord'
        AND column_name = 'status'
    `;
    expect(cols.length).toBe(1);
    expect(cols[0].column_default).toBeNull();
  });
});

