import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import {
  PaymentProviderRegistry,
  PaymentProviderResolver,
  PaymentIntentService,
  WebhookEventService,
  SettlementService,
  PaymentDomainError,
} from "../payments-foundation";
import { SalesService } from "../sales/sales.service";

describe("JAA-S2-01 — Payment Abstraction Foundation Tests against PostgreSQL", () => {
  const providerRegistry = new PaymentProviderRegistry();
  const providerResolver = new PaymentProviderResolver(providerRegistry, prisma);
  const intentService = new PaymentIntentService(providerResolver, prisma);
  const webhookService = new WebhookEventService(providerRegistry, providerResolver, prisma);
  const settlementService = new SettlementService(prisma);
  const salesService = new SalesService();

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
    await seedPostgresDatabase(prisma);

    await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });
  });

  describe("1. Payment Provider Registry & Resolver", () => {
    it("registers and resolves MockPaymentProvider for a tenant", async () => {
      const { provider, config } = await providerResolver.resolveProvider("org-diallo", "mock");
      expect(provider.providerType).toBe("mock");
      expect(config.provider).toBe("mock");
      expect(config.isEnabled).toBe(true);
      expect(config.isTestMode).toBe(true);
    });

    it("throws when resolving an unconfigured non-mock provider", async () => {
      await expect(
        providerResolver.resolveProvider("org-diallo", "wave")
      ).rejects.toThrow(PaymentDomainError);
    });
  });

  describe("2. PaymentIntent Lifecycle & Explicit State Machine", () => {
    it("creates a PaymentIntent in REQUIRES_PAYMENT status with valid financial amount", async () => {
      const intent = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 50000,
        currencyCode: "XOF",
        description: "Test checkout intent",
      });

      expect(intent.id).toBeDefined();
      expect(intent.reference).toContain("PI-");
      expect(intent.amountMinor).toBe(50000);
      expect(intent.currencyCode).toBe("XOF");
      expect(intent.status).toBe("REQUIRES_PAYMENT");
      expect(intent.organizationId).toBe("org-diallo");
    });

    it("rejects non-positive PaymentIntent amounts", async () => {
      await expect(
        intentService.createPaymentIntent(orgAContext, {
          amountMinor: 0,
        })
      ).rejects.toThrow(PaymentDomainError);

      await expect(
        intentService.createPaymentIntent(orgAContext, {
          amountMinor: -5000,
        })
      ).rejects.toThrow(PaymentDomainError);
    });

    it("cancels a PaymentIntent and enforces terminal state", async () => {
      const intent = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 25000,
      });

      const cancelled = await intentService.cancelPaymentIntent(orgAContext, intent.id);
      expect(cancelled.status).toBe("CANCELLED");

      // Cannot cancel again or execute payment on cancelled intent
      await expect(
        intentService.cancelPaymentIntent(orgAContext, intent.id)
      ).rejects.toThrow(PaymentDomainError);
    });
  });

  describe("3. PaymentAttempt Execution, Idempotency & Provider Separation", () => {
    it("executes PaymentAttempt via mock provider, creating ProviderTransaction and advancing Intent to PAID", async () => {
      const intent = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 30000,
      });

      const idempotencyKey = `attempt-key-${Date.now()}`;
      const { attempt, providerResult } = await intentService.createPaymentAttempt(
        orgAContext,
        intent.id,
        {
          provider: "mock",
          idempotencyKey,
        }
      );

      expect(attempt.status).toBe("SUCCEEDED");
      expect(attempt.amountMinor).toBe(30000);
      expect(attempt.providerReference).toContain("mock_tx_");
      expect(providerResult.success).toBe(true);

      // Verify ProviderTransaction created
      const providerTx = await prisma.providerTransaction.findFirst({
        where: { paymentAttemptId: attempt.id },
      });
      expect(providerTx).toBeDefined();
      expect(providerTx?.provider).toBe("mock");
      expect(providerTx?.feeMinor).toBe(300); // 1% of 30,000

      // Verify Intent status advanced to PAID
      const updatedIntent = await intentService.getPaymentIntent(orgAContext, intent.id);
      expect(updatedIntent.status).toBe("PAID");
    });

    it("enforces idempotency on PaymentAttempt: replay returns existing attempt without duplicate charge", async () => {
      const intent = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 15000,
      });

      const idempotencyKey = `idemp-attempt-${Date.now()}`;
      const res1 = await intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        idempotencyKey,
      });

      const res2 = await intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        idempotencyKey,
      });

      expect(res1.attempt.id).toBe(res2.attempt.id);
      expect(res2.providerResult.idempotentReplay).toBe(true);

      // Total attempts in database for this intent must be 1
      const count = await prisma.paymentAttempt.count({
        where: { paymentIntentId: intent.id },
      });
      expect(count).toBe(1);
    });
  });

  describe("4. Non-Negotiable Domain Invariant: PAYMENT_ATTEMPT != PAYMENT & SALE != PAYMENT", () => {
    it("updates internal Payment ledger ONLY when linked to a Sale and attempt succeeds", async () => {
      // 1. Create a Sale for 1,000 XOF using seeded prod-001 (TO_COLLECT)
      const sale = await salesService.createSale(orgAContext, {
        lines: [{ productId: "prod-001", quantity: 2 }],
        payments: [], // No initial payment recorded
      });

      expect(sale.totalMinor).toBe(1000);
      expect(sale.paidMinor).toBe(0);
      expect(sale.paymentStatus).toBe("TO_COLLECT");

      // 2. Create a PaymentIntent linked to the Sale
      const intent = await intentService.createPaymentIntent(orgAContext, {
        saleId: sale.id,
        amountMinor: 1000,
      });

      // 3. Execute PaymentAttempt
      const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        idempotencyKey: `sale-attempt-${Date.now()}`,
      });

      expect(attempt.status).toBe("SUCCEEDED");

      // 4. Verify Internal Payment ledger entry created for the Sale
      const internalPayments = await prisma.payment.findMany({
        where: { saleId: sale.id },
      });
      expect(internalPayments.length).toBe(1);
      expect(internalPayments[0].amountMinor).toBe(1000);
      expect(internalPayments[0].status).toBe("SUCCESS");

      // 5. Verify Sale state transitioned to PAID
      const updatedSale = await prisma.sale.findUnique({
        where: { id: sale.id },
      });
      expect(updatedSale?.paidMinor).toBe(1000);
      expect(updatedSale?.remainingMinor).toBe(0);
      expect(updatedSale?.paymentStatus).toBe("PAID");
    });
  });

  describe("5. Tenant Isolation (P0)", () => {
    it("rejects cross-tenant PaymentIntent access and attempt creation", async () => {
      const intentOrgA = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 10000,
      });

      // Org B attempts to read Org A's intent
      await expect(
        intentService.getPaymentIntent(orgBContext, intentOrgA.id)
      ).rejects.toThrow(PaymentDomainError);

      // Org B attempts to execute attempt on Org A's intent
      await expect(
        intentService.createPaymentAttempt(orgBContext, intentOrgA.id, {
          provider: "mock",
          idempotencyKey: `cross-tenant-${Date.now()}`,
        })
      ).rejects.toThrow(PaymentDomainError);

      // Org B attempts to cancel Org A's intent
      await expect(
        intentService.cancelPaymentIntent(orgBContext, intentOrgA.id)
      ).rejects.toThrow(PaymentDomainError);
    });
  });

  describe("6. Webhook Idempotency & Signature Verification", () => {
    it("handles webhook with valid signature, advancing attempt and intent status", async () => {
      const intent = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 20000,
      });

      // Create an attempt manually in PENDING_PROVIDER state
      const attempt = await prisma.paymentAttempt.create({
        data: {
          organizationId: "org-diallo",
          paymentIntentId: intent.id,
          provider: "mock",
          amountMinor: 20000,
          currencyCode: "XOF",
          status: "PENDING_PROVIDER",
          idempotencyKey: `webhook-test-${Date.now()}`,
          providerReference: "mock_async_ref_123",
        },
      });

      const eventId = `evt_${Date.now()}`;
      const payload = {
        id: eventId,
        type: "payment.succeeded",
        organizationId: "org-diallo",
        data: {
          providerReference: "mock_async_ref_123",
          status: "SUCCEEDED",
          amountMinor: 20000,
          currencyCode: "XOF",
          feeMinor: 200,
        },
      };

      const result = await webhookService.handleWebhook(
        "mock",
        { "x-mock-signature": "valid_mock_signature" },
        JSON.stringify(payload),
        payload
      );

      expect(result.status).toBe("SUCCESS");
      expect(result.eventId).toBe(eventId);

      // Verify attempt updated to SUCCEEDED
      const updatedAttempt = await prisma.paymentAttempt.findUnique({
        where: { id: attempt.id },
      });
      expect(updatedAttempt?.status).toBe("SUCCEEDED");

      // Idempotency: replaying same webhook returns ALREADY_PROCESSED
      const replay = await webhookService.handleWebhook(
        "mock",
        { "x-mock-signature": "valid_mock_signature" },
        JSON.stringify(payload),
        payload
      );
      expect(replay.status).toBe("ALREADY_PROCESSED");
    });

    it("rejects webhook with invalid signature", async () => {
      const eventId = `evt_invalid_${Date.now()}`;
      const payload = {
        id: eventId,
        organizationId: "org-diallo",
        data: { providerReference: "mock_ref_invalid" },
      };

      await expect(
        webhookService.handleWebhook(
          "mock",
          { "x-mock-signature": "bad_signature" },
          JSON.stringify(payload),
          payload
        )
      ).rejects.toThrow(PaymentDomainError);
    });
  });

  describe("7. Settlement & Reconciliation Lifecycle", () => {
    it("creates and transitions Settlement record according to strict state machine", async () => {
      const settlement = await settlementService.createSettlement(orgAContext, {
        provider: "mock",
        reference: `SETTLE-${Date.now()}`,
        totalAmountMinor: 500000,
        feeAmountMinor: 5000,
      });

      expect(settlement.status).toBe("PENDING");
      expect(settlement.totalAmountMinor).toBe(500000);

      // PENDING -> PARTIALLY_SETTLED
      const partial = await settlementService.updateSettlementStatus(
        orgAContext,
        settlement.id,
        "PARTIALLY_SETTLED",
        250000
      );
      expect(partial.status).toBe("PARTIALLY_SETTLED");
      expect(partial.settledAmountMinor).toBe(250000);

      // PARTIALLY_SETTLED -> SETTLED
      const settled = await settlementService.updateSettlementStatus(
        orgAContext,
        settlement.id,
        "SETTLED",
        500000
      );
      expect(settled.status).toBe("SETTLED");

      // SETTLED -> RECONCILIATION_REQUIRED
      const flagRecon = await settlementService.updateSettlementStatus(
        orgAContext,
        settlement.id,
        "RECONCILIATION_REQUIRED"
      );
      expect(flagRecon.status).toBe("RECONCILIATION_REQUIRED");

      // RECONCILIATION_REQUIRED -> RECONCILED (Terminal)
      const reconciled = await settlementService.updateSettlementStatus(
        orgAContext,
        settlement.id,
        "RECONCILED"
      );
      expect(reconciled.status).toBe("RECONCILED");

      // Invalid transition from RECONCILED back to PENDING must fail
      await expect(
        settlementService.updateSettlementStatus(orgAContext, settlement.id, "PENDING")
      ).rejects.toThrow(PaymentDomainError);
    });

    it("reconciles ProviderTransaction with internal Payment ledger and records MATCHED status", async () => {
      // 1. Create a PaymentIntent and successful attempt
      const intent = await intentService.createPaymentIntent(orgAContext, {
        amountMinor: 50000,
      });
      const { attempt } = await intentService.createPaymentAttempt(orgAContext, intent.id, {
        provider: "mock",
        idempotencyKey: `recon-attempt-${Date.now()}`,
      });

      const providerTx = await prisma.providerTransaction.findFirst({
        where: { paymentAttemptId: attempt.id },
      });
      expect(providerTx).toBeDefined();

      // 2. Create internal Payment row matching amount
      const sale = await salesService.createSale(orgAContext, {
        lines: [{ productId: "prod-001", quantity: 1 }],
        payments: [],
      });
      const payment = await prisma.payment.create({
        data: {
          organizationId: "org-diallo",
          saleId: sale.id,
          method: "cash",
          amountMinor: 50000,
          status: "SUCCESS",
        },
      });

      // 3. Reconcile
      const recon = await settlementService.reconcileRecord(orgAContext, {
        provider: "mock",
        providerTransactionId: providerTx!.id,
        paymentId: payment.id,
      });

      expect(recon.status).toBe("MATCHED");
      expect(recon.discrepancyType).toBeNull();
    });
  });
});
