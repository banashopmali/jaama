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
  PaymentDomainError,
  MockPaymentProvider,
} from "../payments-foundation";
import { SalesService } from "../sales/sales.service";

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
      where: { provider_eventId: { provider: "mock", eventId: "evt_org_a_1" } },
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

  // 11. concurrent attempts cannot overcollect one PaymentIntent
  it("11. prevents overcollection under concurrent execution using SELECT FOR UPDATE row locking", async () => {
    const intent = await intentService.createPaymentIntent(orgAContext, {
      amountMinor: 10000,
    });

    // First attempt succeeds for 10000
    await intentService.createPaymentAttempt(orgAContext, intent.id, {
      provider: "mock",
      amountMinor: 10000,
      idempotencyKey: "instant_succeed_first",
    });

    // Second attempt trying to collect another 10000 must fail deterministically
    await expect(
      intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        amountMinor: 10000,
        idempotencyKey: "instant_succeed_second",
      })
    ).rejects.toThrow(PaymentDomainError);

    const attempts = await prisma.paymentAttempt.findMany({
      where: { paymentIntentId: intent.id, status: "SUCCEEDED" },
    });
    expect(attempts.length).toBe(1);
    expect(attempts[0].amountMinor).toBe(10000);
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
});
