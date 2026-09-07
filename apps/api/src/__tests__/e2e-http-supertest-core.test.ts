import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { AppModule } from "../app.module";

describe("JAAMA Real NestJS HTTP Supertest E2E & Certification Suite (Section F)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  });

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  async function createAuthAgent(email = "hamidou@diallo-commerce.ml", password = "Password123!") {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent.post("/api/v1/auth/login").send({ email, password });
    expect(loginRes.status).toBe(201);
    return agent;
  }

  // A. AUTH MATRIX
  describe("A. Auth & HttpOnly Cookie Protocol", () => {
    it("login sets HttpOnly jaama_session cookie and returns safe DTO without session token", async () => {
      const agent = request.agent(app.getHttpServer());

      const loginRes = await agent.post("/api/v1/auth/login").send({
        email: "hamidou@diallo-commerce.ml",
        password: "Password123!",
      });

      expect(loginRes.status).toBe(201);
      expect(loginRes.body.user).toBeDefined();
      expect(loginRes.body.user.email).toBe("hamidou@diallo-commerce.ml");
      expect(loginRes.body.session.id).toBeDefined();
      expect(loginRes.body.session.expiresAt).toBeDefined();
      // MUST NOT contain plaintext token or credentials
      expect(loginRes.body.token).toBeUndefined();
      expect(loginRes.body.session.token).toBeUndefined();
      expect(loginRes.body.tokenHash).toBeUndefined();
      expect(loginRes.body.passwordHash).toBeUndefined();

      // Verify Cookie header
      const setCookie = loginRes.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie);
      expect(cookieStr).toContain("jaama_session=");
      expect(cookieStr).toContain("HttpOnly");

      // /auth/me via Cookie
      const meRes = await agent.get("/api/v1/auth/me").set("X-Organization-ID", "org-diallo");
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.name).toBe("Hamidou Diallo");
      expect(meRes.body.organization.name).toBe("Diallo Commerce");
      expect(meRes.body.organizationId).toBe("org-diallo");
      expect(meRes.body.session).toBeUndefined();
      expect(meRes.body.token).toBeUndefined();

      // Logout clears cookie and revokes session
      const logoutRes = await agent.post("/api/v1/auth/logout");
      expect(logoutRes.status).toBe(201);
      expect(logoutRes.body.success).toBe(true);

      const unauthRes = await agent.get("/api/v1/auth/me");
      expect(unauthRes.status).toBe(401);
    });

    it("revoked or expired cookie returns 401 Unauthorized", async () => {
      const agent = await createAuthAgent();

      // Revoke all sessions in DB
      await prisma.session.deleteMany({ where: { user: { email: "hamidou@diallo-commerce.ml" } } });

      const res = await agent.get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });
  });

  // B. PRODUCT & CUSTOMER CROSS-TENANT ISOLATION
  describe("B. Product & Customer Cross-Tenant Isolation", () => {
    it("rejects cross-tenant access to Product or Customer belonging to another organization", async () => {
      const agentA = await createAuthAgent("hamidou@diallo-commerce.ml", "Password123!");

      // Create Product in Org A (org-diallo)
      const pRes = await agentA
        .post("/api/v1/products")
        .set("X-Organization-ID", "org-diallo")
        .send({
          sku: "ISOL-PROD-01",
          name: "Produit Exclusive A",
          category: "Général",
          unitPriceMinor: 2500,
        });
      expect(pRes.status).toBe(201);
      const prodAId = pRes.body.id;

      // Login as User B (baba@baba-boutique.ml in org-baba)
      const agentB = await createAuthAgent("baba@baba-boutique.ml", "Password123!");

      // User B trying to access Product A under org-baba context -> expect 404
      const failProd = await agentB
        .get(`/api/v1/products/${prodAId}`)
        .set("X-Organization-ID", "org-baba");
      expect(failProd.status).toBe(404);

      // User B trying to spoof Org A header -> expect 403 Forbidden (not member of Org A)
      const attackRes = await agentB
        .get(`/api/v1/products/${prodAId}`)
        .set("X-Organization-ID", "org-diallo");
      expect(attackRes.status).toBe(403);
    });
  });

  // C. SALE & PAYMENT LIFECYCLE
  describe("C. Sale Creation & Partial Payment Lifecycle", () => {
    it("creates Sale (5000 FCFA), pays initial 3000 FCFA, then clears remaining 2000 FCFA", async () => {
      const agent = await createAuthAgent();

      // 1. Create Sale: 10 units x 500 FCFA = 5000 FCFA, wave payment 3000 FCFA
      const saleRes = await agent
        .post("/api/v1/sales")
        .set("X-Organization-ID", "org-diallo")
        .send({
          customerId: null,
          lines: [{ productId: "prod-004", quantity: 1 }],
          discountMinor: 1500,
          payments: [{ method: "wave", amountMinor: 3000 }],
          idempotencyKey: "sale-lifecycle-key-01",
        });

      expect(saleRes.status).toBe(201);
      const saleId = saleRes.body.id;
      expect(saleRes.body.totalMinor).toBe(5000);
      expect(saleRes.body.paidMinor).toBe(3000);
      expect(saleRes.body.remainingMinor).toBe(2000);
      expect(saleRes.body.paymentStatus).toBe("PARTIALLY_PAID");

      // 2. Clear remaining 2000 FCFA with cash payment
      const payRes = await agent
        .post("/api/v1/payments")
        .set("X-Organization-ID", "org-diallo")
        .send({
          saleId,
          method: "cash",
          amountMinor: 2000,
          idempotencyKey: "pay-lifecycle-key-01",
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.paidMinor).toBe(5000);
      expect(payRes.body.remainingMinor).toBe(0);
      expect(payRes.body.paymentStatus).toBe("PAID");
    });
  });

  // D. PAYMENT CONCURRENCY & IDEMPOTENCY
  describe("D. Payment Concurrency & Idempotency", () => {
    it("handles concurrent payments safely under SELECT FOR UPDATE and enforces overcollection protection", async () => {
      const agent = await createAuthAgent();

      // Create Sale with 40000 FCFA remaining
      const saleRes = await agent
        .post("/api/v1/sales")
        .set("X-Organization-ID", "org-diallo")
        .send({
          customerId: null,
          lines: [{ productId: "prod-003", quantity: 10 }],
          discountMinor: 10000,
          payments: [],
          idempotencyKey: "concurrent-sale-key-01",
        });

      const saleId = saleRes.body.id;
      expect(saleRes.body.remainingMinor).toBe(40000);

      // Two parallel requests for 30000 FCFA each
      const [res1, res2] = await Promise.all([
        agent
          .post("/api/v1/payments")
          .set("X-Organization-ID", "org-diallo")
          .send({
            saleId,
            method: "cash",
            amountMinor: 30000,
            idempotencyKey: "conc-pay-key-A",
          }),
        agent
          .post("/api/v1/payments")
          .set("X-Organization-ID", "org-diallo")
          .send({
            saleId,
            method: "wave",
            amountMinor: 30000,
            idempotencyKey: "conc-pay-key-B",
          }),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);

      const updatedSale = await prisma.sale.findUnique({ where: { id: saleId } });
      expect(updatedSale!.paidMinor).toBe(30000);
      expect(updatedSale!.remainingMinor).toBe(10000);
    });

    it("enforces payment idempotency (same key -> replay, altered payload -> 409)", async () => {
      const agent = await createAuthAgent();

      const saleRes = await agent
        .post("/api/v1/sales")
        .set("X-Organization-ID", "org-diallo")
        .send({
          customerId: null,
          lines: [{ productId: "prod-004", quantity: 1 }],
          payments: [],
          idempotencyKey: "idemp-sale-key-01",
        });
      const saleId = saleRes.body.id;

      const key = "idemp-pay-test-key-999";
      const payload = { saleId, method: "cash", amountMinor: 1000, idempotencyKey: key };

      // 1st request
      const req1 = await agent
        .post("/api/v1/payments")
        .set("X-Organization-ID", "org-diallo")
        .send(payload);
      expect(req1.status).toBe(201);

      // Replay exact request
      const req2 = await agent
        .post("/api/v1/payments")
        .set("X-Organization-ID", "org-diallo")
        .send(payload);
      expect(req2.status).toBe(201);
      expect(req2.body.id).toBe(req1.body.id);

      // Same key + altered payload -> 409
      const req3 = await agent
        .post("/api/v1/payments")
        .set("X-Organization-ID", "org-diallo")
        .send({ ...payload, amountMinor: 2000 });
      expect(req3.status).toBe(409);
    });
  });

  // E. PURCHASING & RECEIVING CONCURRENCY / IDEMPOTENCY
  describe("E. Purchasing & Receiving Concurrency and Idempotency", () => {
    it("enforces receiving over-receiving protection and idempotency key replay", async () => {
      const agent = await createAuthAgent();

      // Create Supplier & Purchase for 10 units
      const sup = await agent
        .post("/api/v1/suppliers")
        .set("X-Organization-ID", "org-diallo")
        .send({ name: "Fournisseur E2E Rec" });
      const pur = await agent
        .post("/api/v1/purchases")
        .set("X-Organization-ID", "org-diallo")
        .send({
          supplierId: sup.body.id,
          lines: [{ productId: "prod-004", quantity: 10, unitCostMinor: 5000 }],
        });

      const purchaseId = pur.body.id;
      const recKey = "rec-idemp-key-100";

      // Receive 6 units
      const rec1 = await agent
        .post(`/api/v1/purchases/${purchaseId}/receive`)
        .set("X-Organization-ID", "org-diallo")
        .send({
          idempotencyKey: recKey,
          lines: [{ productId: "prod-004", quantityReceived: 6 }],
        });
      expect(rec1.status).toBe(201);
      expect(rec1.body.status).toBe("PARTIALLY_RECEIVED");

      // Replay exact request recKey -> same response
      const rec2 = await agent
        .post(`/api/v1/purchases/${purchaseId}/receive`)
        .set("X-Organization-ID", "org-diallo")
        .send({
          idempotencyKey: recKey,
          lines: [{ productId: "prod-004", quantityReceived: 6 }],
        });
      expect(rec2.status).toBe(201);
      expect(rec2.body.id).toBe(rec1.body.id);

      // Attempt over-receiving: receive 10 more when only 4 remain -> 400
      const overRec = await agent
        .post(`/api/v1/purchases/${purchaseId}/receive`)
        .set("X-Organization-ID", "org-diallo")
        .send({
          idempotencyKey: "rec-over-key-01",
          lines: [{ productId: "prod-004", quantityReceived: 10 }],
        });
      expect(overRec.status).toBe(400);
    });
  });

  // F. SEARCH & EXPORT TENANT ISOLATION
  describe("F. Search & Export Tenant Isolation", () => {
    it("guarantees search and CSV export never reveal resources belonging to another organization", async () => {
      const agentB = await createAuthAgent("baba@baba-boutique.ml", "Password123!");

      // Create unique secret product in Org B
      await agentB
        .post("/api/v1/products")
        .set("X-Organization-ID", "org-baba")
        .send({
          sku: "SECRET-ORG-B-99",
          name: "Secret Product Org B",
          category: "Secret",
          unitPriceMinor: 99000,
        });

      // Login as User A (Org A)
      const agentA = await createAuthAgent("hamidou@diallo-commerce.ml", "Password123!");

      // Search as Org A -> must NOT return Secret Product Org B
      const searchRes = await agentA
        .get("/api/v1/search?q=Secret")
        .set("X-Organization-ID", "org-diallo");
      expect(searchRes.status).toBe(200);
      const hits = searchRes.body.products || [];
      expect(hits.some((p: any) => p.sku === "SECRET-ORG-B-99")).toBe(false);

      // Export CSV as Org A -> must NOT contain Org B product
      const exportRes = await agentA
        .get("/api/v1/products/export")
        .set("X-Organization-ID", "org-diallo");
      expect(exportRes.status).toBe(200);
      expect(exportRes.text).not.toContain("SECRET-ORG-B-99");
    });
  });

  // G. TEAM INVITATION IDENTITY SECURITY MATRIX
  describe("G. Team Invitation Identity Verification Matrix", () => {
    it("exercises full team invitation matrix (new user pwd required, existing user pwd verification)", async () => {
      const agent = await createAuthAgent();

      // 1. Invite new email
      const newEmail = `new.invite.${Date.now()}@test.com`;
      const invRes = await agent
        .post("/api/v1/team/invite")
        .set("X-Organization-ID", "org-diallo")
        .send({ email: newEmail, role: "vendeur" });
      expect(invRes.status).toBe(201);
      const tokenNew = invRes.body.inviteToken;

      // Accept New User without password -> FAIL (400)
      const failNoPwd = await request(app.getHttpServer())
        .post("/api/v1/team/accept-invite")
        .send({ inviteToken: tokenNew, name: "New User" });
      expect(failNoPwd.status).toBe(400);

      // Accept New User with password -> PASS (201)
      const passNew = await request(app.getHttpServer())
        .post("/api/v1/team/accept-invite")
        .send({ inviteToken: tokenNew, name: "New User", password: "NewUserPass123!" });
      expect(passNew.status).toBe(201);

      // Re-accepting used token -> FAIL (400)
      const failUsed = await request(app.getHttpServer())
        .post("/api/v1/team/accept-invite")
        .send({ inviteToken: tokenNew, password: "NewUserPass123!" });
      expect(failUsed.status).toBe(400);

      // 2. Existing user invitation matrix
      const existingEmail = `existing.user.${Date.now()}@test.com`;
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ email: existingEmail, name: "Existing User", password: "CorrectPassword123!" });

      // Invite existing user to org-diallo
      const invExist = await agent
        .post("/api/v1/team/invite")
        .set("X-Organization-ID", "org-diallo")
        .send({ email: existingEmail, role: "comptable" });
      const tokenExist = invExist.body.inviteToken;

      // Existing user without password -> FAIL (400)
      const failExistNoPwd = await request(app.getHttpServer())
        .post("/api/v1/team/accept-invite")
        .send({ inviteToken: tokenExist });
      expect(failExistNoPwd.status).toBe(400);

      // Existing user with wrong password -> FAIL (401)
      const failExistWrongPwd = await request(app.getHttpServer())
        .post("/api/v1/team/accept-invite")
        .send({ inviteToken: tokenExist, password: "WrongPassword123!" });
      expect(failExistWrongPwd.status).toBe(401);

      // Existing user with correct password -> PASS (201)
      const passExistCorrect = await request(app.getHttpServer())
        .post("/api/v1/team/accept-invite")
        .send({ inviteToken: tokenExist, password: "CorrectPassword123!" });
      expect(passExistCorrect.status).toBe(201);
      expect(passExistCorrect.body.role).toBe("comptable");
    });
  });
});
