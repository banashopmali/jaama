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
      });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.membership.role).toBe("vendeur");
  });
});
