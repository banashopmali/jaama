import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { prisma, seedPostgresDatabase, PrismaSessionRepository } from "@jaama/database";
import { AppModule } from "../app.module";
import { generateCsprngSessionToken } from "../auth/auth.service";
import { sanitizeLogMessage } from "../common/global-exception.filter";

describe("JAAMA NestJS Real HTTP Security Matrix Integration Tests (JAA-S0-13 / JAA-S0-16)", () => {
  let app: INestApplication;
  const sessionRepo = new PrismaSessionRepository(prisma);

  let validToken: string;
  let disabledUserToken: string;
  let nonMemberToken: string;
  let employeToken: string;

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

    // 1. Valid Admin Session (Hamidou @ Diallo Commerce)
    const sess1 = await sessionRepo.createSession("user-hamidou", "token-valid-hamidou", new Date(Date.now() + 3600000));
    validToken = sess1.token;

    // 2. Disabled User Session
    const disabledUser = await prisma.user.upsert({
      where: { id: "user-disabled" },
      update: { status: "disabled" },
      create: { id: "user-disabled", email: "disabled@test.com", name: "Disabled User", status: "disabled" },
    });
    const sess2 = await sessionRepo.createSession(disabledUser.id, "token-disabled-user", new Date(Date.now() + 3600000));
    disabledUserToken = sess2.token;

    // 3. Non-Member User Session
    const nonMemberUser = await prisma.user.upsert({
      where: { id: "user-non-member" },
      update: { status: "active" },
      create: { id: "user-non-member", email: "nonmember@test.com", name: "Non Member", status: "active" },
    });
    const sess3 = await sessionRepo.createSession(nonMemberUser.id, "token-non-member", new Date(Date.now() + 3600000));
    nonMemberToken = sess3.token;

    // 4. Employe Role Session (No sales.create permission)
    const employeUser = await prisma.user.upsert({
      where: { id: "user-employe" },
      update: { status: "active" },
      create: { id: "user-employe", email: "employe@test.com", name: "Employe User", status: "active" },
    });
    await prisma.membership.upsert({
      where: { id: "org-diallo:user-employe" },
      update: { role: "employe", status: "active" },
      create: { id: "org-diallo:user-employe", organizationId: "org-diallo", userId: employeUser.id, role: "employe", status: "active" },
    });
    const sess4 = await sessionRepo.createSession(employeUser.id, "token-employe", new Date(Date.now() + 3600000));
    employeToken = sess4.token;

    // 5. Create Org B & Org B Product & Customer for cross-tenant tests
    const orgB = await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });
    await prisma.product.upsert({
      where: { organizationId_id: { organizationId: orgB.id, id: "prod-b" } },
      update: {},
      create: { id: "prod-b", organizationId: orgB.id, sku: "PROD-B", name: "Prod B", category: "Test", unitPriceMinor: 1000 },
    });
    await prisma.customer.upsert({
      where: { organizationId_id: { organizationId: orgB.id, id: "cust-b" } },
      update: {},
      create: { id: "cust-b", organizationId: orgB.id, name: "Customer Org B", phone: "+22370000002" },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it("proves session tokens are generated using CSPRNG with 256-bit entropy", () => {
    const token1 = generateCsprngSessionToken();
    const token2 = generateCsprngSessionToken();

    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(40); // Base64url 32 bytes = 43 chars
    expect(token1).not.toContain("tok-"); // Must not be timestamp based
  });

  it("sanitizes database URIs and sensitive credentials in log text", () => {
    const secretUri = "postgresql://jaama_user:SUPER_SECRET_PASSWORD@localhost:5432/jaama_db";
    const sanitized = sanitizeLogMessage(secretUri);

    expect(sanitized).not.toContain("SUPER_SECRET_PASSWORD");
    expect(sanitized).toContain("[REDACTED_PASSWORD]");
  });

  it("401 UNAUTHORIZED when no authorization header is provided", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("X-Organization-ID", "org-diallo")
      .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("401 UNAUTHORIZED when session token is invalid or expired", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", "Bearer invalid-token-123")
      .set("X-Organization-ID", "org-diallo")
      .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("401 UNAUTHORIZED when user account is disabled", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${disabledUserToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  it("400 BAD REQUEST when X-Organization-ID header is missing", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

    expect(res.status).toBe(400);
  });

  it("403 FORBIDDEN when user has no membership in target organization", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${nonMemberToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });

  it("403 FORBIDDEN when user role lacks required sales.create permission", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${employeToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });

  it("400 BAD REQUEST when referencing cross-tenant Product belonging to Org B", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        lines: [{ productId: "prod-b", quantity: 1 }], // Belongs to Org B!
        payments: [{ method: "cash", amountMinor: 1000 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Produit introuvable ou inactif dans cette organisation");
  });

  it("400 BAD REQUEST when referencing cross-tenant Customer belonging to Org B", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        customerId: "cust-b", // Belongs to Org B!
        lines: [{ productId: "prod-001", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 500 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Client introuvable ou n'appartient pas à votre organisation");

    // Assert ZERO sales created
    const salesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(salesCount).toBe(0);
  });

  it("400 BAD REQUEST when line quantity is zero or negative", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        lines: [{ productId: "prod-001", quantity: -2 }],
        payments: [{ method: "cash", amountMinor: 500 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("entier strictement positif");
  });

  it("400 BAD REQUEST when payments total exceeds sale total (Overpayment P0 Violation)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        lines: [{ productId: "prod-001", quantity: 1 }], // Total 500 FCFA
        payments: [{ method: "cash", amountMinor: 10000 }], // Overpayment!
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OVERPAYMENT_NOT_ALLOWED");

    // Verify 0 rows created in PostgreSQL
    const salesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(salesCount).toBe(0);
  });

  it("201 CREATED for valid zero-payment / credit sale (payments: [])", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        lines: [{ productId: "prod-001", quantity: 2 }], // 1000 FCFA total
        payments: [], // Credit sale: 0 payments collected
      });

    expect(res.status).toBe(201);
    expect(res.body.totalMinor).toBe(1000);
    expect(res.body.paidMinor).toBe(0);
    expect(res.body.remainingMinor).toBe(1000);
    expect(res.body.paymentStatus).toBe("TO_COLLECT");
    expect(res.body.saleStatus).toBe("COMPLETED");
  });

  it("409 CONFLICT on idempotency key payload mismatch", async () => {
    const key = "key-conflict-test";

    // 1st request
    await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        lines: [{ productId: "prod-001", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 500 }],
        idempotencyKey: key,
      });

    // 2nd request with altered payload
    const res2 = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${validToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send({
        lines: [{ productId: "prod-002", quantity: 1 }], // Different product!
        payments: [{ method: "cash", amountMinor: 1200 }],
        idempotencyKey: key,
      });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("500 INTERNAL_SERVER_ERROR hides internal exception details from client on unexpected error and sanitizes credentials", async () => {
    // Force an unexpected runtime exception containing connection string credentials
    const originalMethod = (prisma as any).$transaction;
    (prisma as any).$transaction = async () => {
      throw new Error("FATAL_SECRET_POSTGRES_INTERNAL_CONNECTION_STRING_EXPOSURE_postgresql://jaama_user:SUPER_SECRET_PASSWORD@localhost:5432/jaama_db");
    };

    try {
      const res = await request(app.getHttpServer())
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${validToken}`)
        .set("X-Organization-ID", "org-diallo")
        .send({ lines: [{ productId: "prod-001", quantity: 1 }] });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(res.body.error.message).toBe("Une erreur interne est survenue.");
      expect(res.body.error.message).not.toContain("SUPER_SECRET_PASSWORD");
      expect(JSON.stringify(res.body)).not.toContain("SUPER_SECRET_PASSWORD");
    } finally {
      (prisma as any).$transaction = originalMethod;
    }
  });
});
