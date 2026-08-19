"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const database_1 = require("@jaama/database");
const app_module_1 = require("../app.module");
(0, vitest_1.describe)("JAAMA Real HTTP Reference Create Sale Vertical Slice (JAA-S0-16 / JAA-S0-17)", () => {
    let app;
    const sessionRepo = new database_1.PrismaSessionRepository(database_1.prisma);
    let sessionToken;
    (0, vitest_1.beforeAll)(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.enableShutdownHooks();
        await app.init();
    });
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
        // Set Lait Nido (prod-003) unitPriceMinor to 5000 FCFA
        await database_1.prisma.product.update({
            where: { organizationId_id: { organizationId: "org-diallo", id: "prod-003" } },
            data: { unitPriceMinor: 5000 },
        });
        const session = await sessionRepo.createSession("user-hamidou", "token-slice-http-123", new Date(Date.now() + 3600000));
        sessionToken = session.token;
    });
    (0, vitest_1.afterAll)(async () => {
        if (app)
            await app.close();
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("executes complete reference vertical slice over NestJS HTTP against PostgreSQL: Hamidou @ Diallo Commerce, Total 75 000 FCFA, Wave 50 000 FCFA, Remaining 25 000 FCFA", async () => {
        const payload = {
            customerId: null, // Client comptoir
            lines: [
                { productId: "prod-004", quantity: 10 }, // 10 x 6500 = 65 000 FCFA
                { productId: "prod-003", quantity: 2 }, // 2 x 5000  = 10 000 FCFA
            ],
            discountMinor: 0,
            payments: [{ method: "wave", amountMinor: 50000 }],
            idempotencyKey: "ref-http-slice-key-001",
        };
        // 1. Send HTTP POST /api/v1/sales
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${sessionToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send(payload);
        console.log("HTTP TEST RESPONSE STATUS:", res.status, "BODY:", JSON.stringify(res.body));
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.id).toBeDefined();
        (0, vitest_1.expect)(res.body.reference).toBe("VTE-0025");
        (0, vitest_1.expect)(res.body.organizationId).toBe("org-diallo");
        (0, vitest_1.expect)(res.body.sellerUserId).toBe("user-hamidou");
        (0, vitest_1.expect)(res.body.customerId).toBeNull();
        (0, vitest_1.expect)(res.body.subtotalMinor).toBe(75000);
        (0, vitest_1.expect)(res.body.discountMinor).toBe(0);
        (0, vitest_1.expect)(res.body.totalMinor).toBe(75000);
        (0, vitest_1.expect)(res.body.paidMinor).toBe(50000);
        (0, vitest_1.expect)(res.body.remainingMinor).toBe(25000);
        (0, vitest_1.expect)(res.body.saleStatus).toBe("COMPLETED");
        (0, vitest_1.expect)(res.body.paymentStatus).toBe("PARTIALLY_PAID");
        const saleId = res.body.id;
        // 3. Assert Persisted Database Ledger Rows in PostgreSQL
        const dbSale = await database_1.prisma.sale.findUnique({
            where: { organizationId_id: { organizationId: "org-diallo", id: saleId } },
            include: { lines: true, payments: true },
        });
        (0, vitest_1.expect)(dbSale).not.toBeNull();
        (0, vitest_1.expect)(dbSale?.reference).toBe("VTE-0025");
        (0, vitest_1.expect)(dbSale?.lines.length).toBe(2);
        // Payments in PostgreSQL
        const dbPayments = await database_1.prisma.payment.findMany({
            where: { organizationId: "org-diallo", saleId },
        });
        (0, vitest_1.expect)(dbPayments.length).toBe(1);
        (0, vitest_1.expect)(dbPayments[0].method).toBe("wave");
        (0, vitest_1.expect)(dbPayments[0].amountMinor).toBe(50000);
        (0, vitest_1.expect)(dbPayments[0].status).toBe("SUCCESS");
        // Stock Levels in PostgreSQL (Riz 20 -> 10, Nido 10 -> 8)
        const rizBal = await database_1.prisma.inventoryBalance.findUnique({
            where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-004" } },
        });
        (0, vitest_1.expect)(rizBal?.availableQuantity).toBe(10);
        const nidoBal = await database_1.prisma.inventoryBalance.findUnique({
            where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-003" } },
        });
        (0, vitest_1.expect)(nidoBal?.availableQuantity).toBe(8);
        // Stock Movements in PostgreSQL
        const movements = await database_1.prisma.stockMovement.findMany({
            where: { organizationId: "org-diallo", reference: "VTE-0025" },
        });
        (0, vitest_1.expect)(movements.length).toBe(2);
        // Audit Event in PostgreSQL
        const audit = await database_1.prisma.auditEvent.findFirst({
            where: { organizationId: "org-diallo", resourceId: saleId },
        });
        (0, vitest_1.expect)(audit).not.toBeNull();
        (0, vitest_1.expect)(audit?.actorId).toBe("user-hamidou");
        // Outbox Event in PostgreSQL
        const outbox = await database_1.prisma.outboxEvent.findFirst({
            where: { organizationId: "org-diallo", aggregateId: saleId },
        });
        (0, vitest_1.expect)(outbox).not.toBeNull();
        (0, vitest_1.expect)(outbox?.eventType).toBe("SaleCreated");
        // Idempotency Record in PostgreSQL
        const idempRecord = await database_1.prisma.idempotencyRecord.findUnique({
            where: {
                organizationId_operation_idempotencyKey: {
                    organizationId: "org-diallo",
                    operation: "sales.create",
                    idempotencyKey: "ref-http-slice-key-001",
                },
            },
        });
        (0, vitest_1.expect)(idempRecord).not.toBeNull();
        (0, vitest_1.expect)(idempRecord?.status).toBe("COMPLETED");
        // 4. Replay HTTP Request with Same Idempotency Key -> Replays Same Sale
        const resReplay = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${sessionToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send(payload);
        (0, vitest_1.expect)(resReplay.status).toBe(201);
        (0, vitest_1.expect)(resReplay.body.id).toBe(saleId);
        // Verify PostgreSQL count did NOT duplicate
        const salesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(salesCount).toBe(1);
    });
});
