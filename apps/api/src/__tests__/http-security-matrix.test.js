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
const auth_service_1 = require("../auth/auth.service");
const global_exception_filter_1 = require("../common/global-exception.filter");
(0, vitest_1.describe)("JAAMA NestJS Real HTTP Security Matrix Integration Tests (JAA-S0-13 / JAA-S0-16)", () => {
    let app;
    const sessionRepo = new database_1.PrismaSessionRepository(database_1.prisma);
    let validToken;
    let disabledUserToken;
    let nonMemberToken;
    let employeToken;
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
        // 1. Valid Admin Session (Hamidou @ Diallo Commerce)
        const sess1 = await sessionRepo.createSession("user-hamidou", "token-valid-hamidou", new Date(Date.now() + 3600000));
        validToken = sess1.token;
        // 2. Disabled User Session
        const disabledUser = await database_1.prisma.user.upsert({
            where: { id: "user-disabled" },
            update: { status: "disabled" },
            create: { id: "user-disabled", email: "disabled@test.com", name: "Disabled User", status: "disabled" },
        });
        const sess2 = await sessionRepo.createSession(disabledUser.id, "token-disabled-user", new Date(Date.now() + 3600000));
        disabledUserToken = sess2.token;
        // 3. Non-Member User Session
        const nonMemberUser = await database_1.prisma.user.upsert({
            where: { id: "user-non-member" },
            update: { status: "active" },
            create: { id: "user-non-member", email: "nonmember@test.com", name: "Non Member", status: "active" },
        });
        const sess3 = await sessionRepo.createSession(nonMemberUser.id, "token-non-member", new Date(Date.now() + 3600000));
        nonMemberToken = sess3.token;
        // 4. Employe Role Session (No sales.create permission)
        const employeUser = await database_1.prisma.user.upsert({
            where: { id: "user-employe" },
            update: { status: "active" },
            create: { id: "user-employe", email: "employe@test.com", name: "Employe User", status: "active" },
        });
        await database_1.prisma.membership.upsert({
            where: { id: "org-diallo:user-employe" },
            update: { role: "employe", status: "active" },
            create: { id: "org-diallo:user-employe", organizationId: "org-diallo", userId: employeUser.id, role: "employe", status: "active" },
        });
        const sess4 = await sessionRepo.createSession(employeUser.id, "token-employe", new Date(Date.now() + 3600000));
        employeToken = sess4.token;
        // 5. Create Org B & Org B Product & Customer for cross-tenant tests
        const orgB = await database_1.prisma.organization.upsert({
            where: { id: "org-b" },
            update: { status: "active" },
            create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
        });
        await database_1.prisma.product.upsert({
            where: { organizationId_id: { organizationId: orgB.id, id: "prod-b" } },
            update: {},
            create: { id: "prod-b", organizationId: orgB.id, sku: "PROD-B", name: "Prod B", category: "Test", unitPriceMinor: 1000 },
        });
        await database_1.prisma.customer.upsert({
            where: { organizationId_id: { organizationId: orgB.id, id: "cust-b" } },
            update: {},
            create: { id: "cust-b", organizationId: orgB.id, name: "Customer Org B", phone: "+22370000002" },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        if (app)
            await app.close();
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("proves session tokens are generated using CSPRNG with 256-bit entropy", () => {
        const token1 = (0, auth_service_1.generateCsprngSessionToken)();
        const token2 = (0, auth_service_1.generateCsprngSessionToken)();
        (0, vitest_1.expect)(token1).not.toBe(token2);
        (0, vitest_1.expect)(token1.length).toBeGreaterThanOrEqual(40); // Base64url 32 bytes = 43 chars
        (0, vitest_1.expect)(token1).not.toContain("tok-"); // Must not be timestamp based
    });
    (0, vitest_1.it)("sanitizes database URIs and sensitive credentials in log text", () => {
        const secretUri = "postgresql://jaama_user:SUPER_SECRET_PASSWORD@localhost:5432/jaama_db";
        const sanitized = (0, global_exception_filter_1.sanitizeLogMessage)(secretUri);
        (0, vitest_1.expect)(sanitized).not.toContain("SUPER_SECRET_PASSWORD");
        (0, vitest_1.expect)(sanitized).toContain("[REDACTED_PASSWORD]");
    });
    (0, vitest_1.it)("401 UNAUTHORIZED when no authorization header is provided", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("X-Organization-ID", "org-diallo")
            .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });
    (0, vitest_1.it)("401 UNAUTHORIZED when session token is invalid or expired", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", "Bearer invalid-token-123")
            .set("X-Organization-ID", "org-diallo")
            .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });
    (0, vitest_1.it)("401 UNAUTHORIZED when user account is disabled", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${disabledUserToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)("400 BAD REQUEST when X-Organization-ID header is missing", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)("403 FORBIDDEN when user has no membership in target organization", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${nonMemberToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error.code).toBe("PERMISSION_DENIED");
    });
    (0, vitest_1.it)("403 FORBIDDEN when user role lacks required sales.create permission", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${employeToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error.code).toBe("PERMISSION_DENIED");
    });
    (0, vitest_1.it)("400 BAD REQUEST when referencing cross-tenant Product belonging to Org B", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            lines: [{ productId: "prod-b", quantity: 1 }], // Belongs to Org B!
            payments: [{ method: "cash", amountMinor: 1000 }],
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("Produit introuvable ou inactif dans cette organisation");
    });
    (0, vitest_1.it)("400 BAD REQUEST when referencing cross-tenant Customer belonging to Org B", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            customerId: "cust-b", // Belongs to Org B!
            lines: [{ productId: "prod-001", quantity: 1 }],
            payments: [{ method: "cash", amountMinor: 500 }],
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("Client introuvable ou n'appartient pas à votre organisation");
        // Assert ZERO sales created
        const salesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(salesCount).toBe(0);
    });
    (0, vitest_1.it)("400 BAD REQUEST when line quantity is zero or negative", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            lines: [{ productId: "prod-001", quantity: -2 }],
            payments: [{ method: "cash", amountMinor: 500 }],
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("entier strictement positif");
    });
    (0, vitest_1.it)("400 BAD REQUEST when payments total exceeds sale total (Overpayment P0 Violation)", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            lines: [{ productId: "prod-001", quantity: 1 }], // Total 500 FCFA
            payments: [{ method: "cash", amountMinor: 10000 }], // Overpayment!
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.code).toBe("OVERPAYMENT_NOT_ALLOWED");
        // Verify 0 rows created in PostgreSQL
        const salesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(salesCount).toBe(0);
    });
    (0, vitest_1.it)("201 CREATED for valid zero-payment / credit sale (payments: [])", async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            lines: [{ productId: "prod-001", quantity: 2 }], // 1000 FCFA total
            payments: [], // Credit sale: 0 payments collected
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.totalMinor).toBe(1000);
        (0, vitest_1.expect)(res.body.paidMinor).toBe(0);
        (0, vitest_1.expect)(res.body.remainingMinor).toBe(1000);
        (0, vitest_1.expect)(res.body.paymentStatus).toBe("TO_COLLECT");
        (0, vitest_1.expect)(res.body.saleStatus).toBe("COMPLETED");
    });
    (0, vitest_1.it)("409 CONFLICT on idempotency key payload mismatch", async () => {
        const key = "key-conflict-test";
        // 1st request
        await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            lines: [{ productId: "prod-001", quantity: 1 }],
            payments: [{ method: "cash", amountMinor: 500 }],
            idempotencyKey: key,
        });
        // 2nd request with altered payload
        const res2 = await (0, supertest_1.default)(app.getHttpServer())
            .post("/api/v1/sales")
            .set("Authorization", `Bearer ${validToken}`)
            .set("X-Organization-ID", "org-diallo")
            .send({
            lines: [{ productId: "prod-002", quantity: 1 }], // Different product!
            payments: [{ method: "cash", amountMinor: 1200 }],
            idempotencyKey: key,
        });
        (0, vitest_1.expect)(res2.status).toBe(409);
        (0, vitest_1.expect)(res2.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    });
    (0, vitest_1.it)("500 INTERNAL_SERVER_ERROR hides internal exception details from client on unexpected error and sanitizes credentials", async () => {
        // Force an unexpected runtime exception containing connection string credentials
        const originalMethod = database_1.prisma.$transaction;
        database_1.prisma.$transaction = async () => {
            throw new Error("FATAL_SECRET_POSTGRES_INTERNAL_CONNECTION_STRING_EXPOSURE_postgresql://jaama_user:SUPER_SECRET_PASSWORD@localhost:5432/jaama_db");
        };
        try {
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post("/api/v1/sales")
                .set("Authorization", `Bearer ${validToken}`)
                .set("X-Organization-ID", "org-diallo")
                .send({ lines: [{ productId: "prod-001", quantity: 1 }] });
            (0, vitest_1.expect)(res.status).toBe(500);
            (0, vitest_1.expect)(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
            (0, vitest_1.expect)(res.body.error.message).toBe("Une erreur interne est survenue.");
            (0, vitest_1.expect)(res.body.error.message).not.toContain("SUPER_SECRET_PASSWORD");
            (0, vitest_1.expect)(JSON.stringify(res.body)).not.toContain("SUPER_SECRET_PASSWORD");
        }
        finally {
            database_1.prisma.$transaction = originalMethod;
        }
    });
});
