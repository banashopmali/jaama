import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { prisma, seedPostgresDatabase, PrismaSessionRepository } from "@jaama/database";
import { AppModule } from "../app.module";

describe("JAAMA Real HTTP Reference Create Sale Vertical Slice (JAA-S0-16 / JAA-S0-17)", () => {
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

    // Set Lait Nido (prod-003) unitPriceMinor to 5000 FCFA
    await prisma.product.update({
      where: { organizationId_id: { organizationId: "org-diallo", id: "prod-003" } },
      data: { unitPriceMinor: 5000 },
    });

    const session = await sessionRepo.createSession("user-hamidou", "token-slice-http-123", new Date(Date.now() + 3600000));
    sessionToken = session.token;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it("executes complete reference vertical slice over NestJS HTTP against PostgreSQL: Hamidou @ Diallo Commerce, Total 75 000 FCFA, Wave 50 000 FCFA, Remaining 25 000 FCFA", async () => {
    const payload = {
      customerId: null, // Client comptoir
      lines: [
        { productId: "prod-004", quantity: 10 }, // 10 x 6500 = 65 000 FCFA
        { productId: "prod-003", quantity: 2 },  // 2 x 5000  = 10 000 FCFA
      ],
      discountMinor: 0,
      payments: [{ method: "wave", amountMinor: 50000 }],
      idempotencyKey: "ref-http-slice-key-001",
    };

    // 1. Send HTTP POST /api/v1/sales
    const res = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send(payload);

    console.log("HTTP TEST RESPONSE STATUS:", res.status, "BODY:", JSON.stringify(res.body));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.reference).toBe("VTE-0025");
    expect(res.body.organizationId).toBe("org-diallo");
    expect(res.body.sellerUserId).toBe("user-hamidou");
    expect(res.body.customerId).toBeNull();
    expect(res.body.subtotalMinor).toBe(75000);
    expect(res.body.discountMinor).toBe(0);
    expect(res.body.totalMinor).toBe(75000);
    expect(res.body.paidMinor).toBe(50000);
    expect(res.body.remainingMinor).toBe(25000);
    expect(res.body.saleStatus).toBe("COMPLETED");
    expect(res.body.paymentStatus).toBe("PARTIALLY_PAID");

    const saleId = res.body.id;

    // 3. Assert Persisted Database Ledger Rows in PostgreSQL
    const dbSale = await prisma.sale.findUnique({
      where: { organizationId_id: { organizationId: "org-diallo", id: saleId } },
      include: { lines: true, payments: true },
    });

    expect(dbSale).not.toBeNull();
    expect(dbSale?.reference).toBe("VTE-0025");
    expect(dbSale?.lines.length).toBe(2);

    // Payments in PostgreSQL
    const dbPayments = await prisma.payment.findMany({
      where: { organizationId: "org-diallo", saleId },
    });
    expect(dbPayments.length).toBe(1);
    expect(dbPayments[0].method).toBe("wave");
    expect(dbPayments[0].amountMinor).toBe(50000);
    expect(dbPayments[0].status).toBe("SUCCESS");

    // Stock Levels in PostgreSQL (Riz 20 -> 10, Nido 10 -> 8)
    const rizBal = await prisma.inventoryBalance.findUnique({
      where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-004" } },
    });
    expect(rizBal?.availableQuantity).toBe(10);

    const nidoBal = await prisma.inventoryBalance.findUnique({
      where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-003" } },
    });
    expect(nidoBal?.availableQuantity).toBe(8);

    // Stock Movements in PostgreSQL
    const movements = await prisma.stockMovement.findMany({
      where: { organizationId: "org-diallo", reference: "VTE-0025" },
    });
    expect(movements.length).toBe(2);

    // Audit Event in PostgreSQL
    const audit = await prisma.auditEvent.findFirst({
      where: { organizationId: "org-diallo", resourceId: saleId },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe("user-hamidou");

    // Outbox Event in PostgreSQL
    const outbox = await prisma.outboxEvent.findFirst({
      where: { organizationId: "org-diallo", aggregateId: saleId },
    });
    expect(outbox).not.toBeNull();
    expect(outbox?.eventType).toBe("SaleCreated");

    // Idempotency Record in PostgreSQL
    const idempRecord = await prisma.idempotencyRecord.findUnique({
      where: {
        organizationId_operation_idempotencyKey: {
          organizationId: "org-diallo",
          operation: "sales.create",
          idempotencyKey: "ref-http-slice-key-001",
        },
      },
    });
    expect(idempRecord).not.toBeNull();
    expect(idempRecord?.status).toBe("COMPLETED");

    // 4. Replay HTTP Request with Same Idempotency Key -> Replays Same Sale
    const resReplay = await request(app.getHttpServer())
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("X-Organization-ID", "org-diallo")
      .send(payload);

    expect(resReplay.status).toBe(201);
    expect(resReplay.body.id).toBe(saleId);

    // Verify PostgreSQL count did NOT duplicate
    const salesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(salesCount).toBe(1);
  });
});
