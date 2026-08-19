import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { prisma, seedPostgresDatabase, PrismaSessionRepository } from "@jaama/database";
import { AppModule } from "../app.module";

describe("JAAMA Real NestJS HTTP Supertest E2E Suite (Section J)", () => {
  let app: INestApplication;
  const sessionRepo = new PrismaSessionRepository(prisma);
  let sessionToken: string;

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
    const session = await sessionRepo.createSession(
      "user-hamidou",
      "e2e-supertest-token-001",
      new Date(Date.now() + 3600000)
    );
    sessionToken = session.token;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it("1. GET /api/v1/auth/me returns 200 with authenticated user & workspace details", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo");

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-hamidou");
    expect(res.body.organizationId).toBe("org-diallo");
    expect(res.body.permissions).toContain("sales.create");
  });

  it("2. POST /api/v1/sales creates sale atomically with lines and payment", async () => {
    const payload = {
      customerId: null,
      lines: [{ productId: "prod-004", quantity: 2 }], // 2 x 6500 = 13000
      discountMinor: 0,
      payments: [{ method: "cash", amountMinor: 10000 }],
      idempotencyKey: "e2e-sale-http-key-001",
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.totalMinor).toBe(13000);
    expect(res.body.paidMinor).toBe(10000);
    expect(res.body.remainingMinor).toBe(3000);
    expect(res.body.paymentStatus).toBe("PARTIALLY_PAID");
  });

  it("3. POST /api/v1/payments records payment with mandatory idempotencyKey", async () => {
    // Create sale first
    const saleRes = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        customerId: null,
        lines: [{ productId: "prod-004", quantity: 1 }], // 6500
        discountMinor: 0,
        payments: [],
        idempotencyKey: "e2e-sale-http-key-002",
      });

    const saleId = saleRes.body.id;

    // Missing idempotencyKey -> expect 400
    const failRes = await request(app.getHttpServer())
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        saleId,
        amountMinor: 6500,
        method: "cash",
      });

    expect(failRes.status).toBe(400);

    // With idempotencyKey -> expect 201
    const successRes = await request(app.getHttpServer())
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        saleId,
        amountMinor: 6500,
        method: "cash",
        idempotencyKey: "e2e-pay-http-key-001",
      });

    expect(successRes.status).toBe(201);
    expect(successRes.body.remainingMinor).toBe(0);
    expect(successRes.body.paymentStatus).toBe("PAID");
  });

  it("4. POST /api/v1/purchases & receivePurchase flow over HTTP", async () => {
    // Create supplier
    const supRes = await request(app.getHttpServer())
      .post("/api/v1/suppliers")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({ name: "Fournisseur Test HTTP", phone: "+22377000000" });

    const supplierId = supRes.body.id;

    // Create Purchase
    const purRes = await request(app.getHttpServer())
      .post("/api/v1/purchases")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        supplierId,
        lines: [{ productId: "prod-004", quantity: 5, unitCostMinor: 500000 }],
      });

    expect(purRes.status).toBe(201);
    const purchaseId = purRes.body.id;

    // Receive Purchase with idempotencyKey
    const recRes = await request(app.getHttpServer())
      .post(`/api/v1/purchases/${purchaseId}/receive`)
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        idempotencyKey: "e2e-rec-http-key-001",
        lines: [{ productId: "prod-004", quantityReceived: 5 }],
      });

    expect(recRes.status).toBe(201);
    expect(recRes.body.status).toBe("RECEIVED");
  });

  it("5. Products CSV Export and Import over HTTP", async () => {
    // Export CSV
    const expRes = await request(app.getHttpServer())
      .get("/api/v1/products/export")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo");

    expect(expRes.status).toBe(200);
    expect(expRes.text).toContain("SKU;Nom;Catégorie");

    // Import Bulk
    const impRes = await request(app.getHttpServer())
      .post("/api/v1/products/import")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        items: [
          {
            sku: "HTTP-CSV-001",
            name: "=Formula Test Product",
            category: "Électronique",
            unitPriceMinor: 15000,
          },
        ],
      });

    expect(impRes.status).toBe(201);
    expect(impRes.body.importedCount).toBe(1);
  });

  it("6. Team Invitation & Accept Invite over HTTP", async () => {
    // Invite member
    const inviteRes = await request(app.getHttpServer())
      .post("/api/v1/team/invite")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        email: "invitee.http@test.com",
        role: "vendeur",
      });

    expect(inviteRes.status).toBe(201);
    const token = inviteRes.body.inviteToken;
    expect(token).toBeDefined();

    // Accept Invite
    const acceptRes = await request(app.getHttpServer())
      .post("/api/v1/team/accept-invite")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        inviteToken: token,
        name: "Invitee Person",
        password: "SecureInviteePass2026!",
      });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.membership.role).toBe("vendeur");
  });

  it("7. HttpOnly Session Cookie Login & Authenticated /auth/me flow", async () => {
    // 1. Register user
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "test.cookie.user@diallo.com",
        name: "Test Cookie User",
        password: "Password123!",
      });

    expect(regRes.status).toBe(201);

    // 2. Login over HTTP
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "test.cookie.user@diallo.com",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body.session.token).toBeDefined();

    // Verify Set-Cookie header contains jaama_session
    const setCookie = loginRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieHeaderString = Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie);
    expect(cookieHeaderString).toContain("jaama_session=");

    // 3. Fetch /auth/me using Cookie header
    const meRes = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookieHeaderString);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe("test.cookie.user@diallo.com");

    // 4. Logout clears session cookie
    const logoutRes = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeaderString);

    expect(logoutRes.status).toBe(201);
    expect(logoutRes.body.success).toBe(true);

    // 5. Access /auth/me with revoked cookie returns 401
    const unauthRes = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookieHeaderString);

    expect(unauthRes.status).toBe(401);
  });

  it("8. Concurrency: Concurrent CreatePurchase requests generate distinct ACH references without race conditions", async () => {
    // Create supplier first
    const supRes = await request(app.getHttpServer())
      .post("/api/v1/suppliers")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({ name: "Fournisseur Concurrency Test", phone: "+22377112233" });

    expect(supRes.status).toBe(201);
    const supplierId = supRes.body.id;

    const [pur1, pur2] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/v1/purchases")
        .set("Authorization", `Bearer ${sessionToken}`)
        .set("X-Organization-ID", "org-diallo")
        .send({
          supplierId,
          lines: [{ productId: "prod-004", quantity: 2, unitCostMinor: 200000 }],
        }),
      request(app.getHttpServer())
        .post("/api/v1/purchases")
        .set("Authorization", `Bearer ${sessionToken}`)
        .set("X-Organization-ID", "org-diallo")
        .send({
          supplierId,
          lines: [{ productId: "prod-004", quantity: 3, unitCostMinor: 200000 }],
        }),
    ]);

    expect(pur1.status).toBe(201);
    expect(pur2.status).toBe(201);
    expect(pur1.body.reference).not.toBe(pur2.body.reference);
    expect([pur1.body.reference, pur2.body.reference].sort()).toEqual([
      `ACH-${new Date().getFullYear()}-0001`,
      `ACH-${new Date().getFullYear()}-0002`,
    ]);
  });

  it("9. Security: Cross-tenant attack over HTTP is rejected with 403 Forbidden", async () => {
    // Attempt to access Tenant A (org-diallo) product using Tenant B's context without membership
    const attackRes = await request(app.getHttpServer())
      .get("/api/v1/products/prod-004")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-baba");

    expect(attackRes.status).toBe(403);
    const msg = JSON.stringify(attackRes.body);
    expect(msg).toContain("Organisation introuvable ou inactive");
  });
});
