"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const common_1 = require("@nestjs/common");
const database_1 = require("@jaama/database");
const sales_service_1 = require("../sales/sales.service");
(0, vitest_1.describe)("JAAMA Concurrent Same-Key Idempotency & Reference Integrity against PostgreSQL (JAA-S0-14 / JAA-S0-15 / Option B)", () => {
    const salesService = new sales_service_1.SalesService();
    const userContext = {
        actorId: "user-hamidou",
        organizationId: "org-diallo",
        membershipId: "org-diallo:user-hamidou",
        permissions: ["sales.create"],
    };
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
    });
    (0, vitest_1.afterAll)(async () => {
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("executes two SIMULTANEOUS create-sale requests with SAME key (OPTION B): 1 succeeds (201), 1 receives deterministic 409 Conflict, exactly 1 Sale persisted, and sequential replay returns cached Sale", async () => {
        const payload = {
            lines: [{ productId: "prod-001", quantity: 2 }], // Unit price 500 = 1000 FCFA
            payments: [{ method: "cash", amountMinor: 1000 }],
            idempotencyKey: "same-key-concurrency-option-b-001",
        };
        // Execute 2 concurrent requests with the SAME key
        const results = await Promise.allSettled([
            salesService.createSale(userContext, payload, database_1.prisma),
            salesService.createSale(userContext, payload, database_1.prisma),
        ]);
        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        // Exactly 1 request fulfilled, 1 rejected
        (0, vitest_1.expect)(fulfilled.length).toBe(1);
        (0, vitest_1.expect)(rejected.length).toBe(1);
        // Rejected request must be ConflictException (409), not unhandled P2002
        (0, vitest_1.expect)(rejected[0].reason).toBeInstanceOf(common_1.ConflictException);
        (0, vitest_1.expect)(rejected[0].reason.getStatus()).toBe(409);
        const firstSale = fulfilled[0].value;
        (0, vitest_1.expect)(firstSale.reference).toBe("VTE-0025");
        // Exact ledger integrity counts in PostgreSQL
        const salesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(salesCount).toBe(1);
        const paymentsCount = await database_1.prisma.payment.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(paymentsCount).toBe(1);
        const movements = await database_1.prisma.stockMovement.findMany({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(movements.length).toBe(1);
        const audits = await database_1.prisma.auditEvent.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(audits).toBe(1);
        const outbox = await database_1.prisma.outboxEvent.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(outbox).toBe(1);
        // Balance decremented by exactly 2 (45 -> 43)
        const balance = await database_1.prisma.inventoryBalance.findUnique({
            where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-001" } },
        });
        (0, vitest_1.expect)(balance?.availableQuantity).toBe(43);
        // Sequential replay with same key returns exact cached Sale response
        const replayedSale = await salesService.createSale(userContext, payload, database_1.prisma);
        (0, vitest_1.expect)(replayedSale.id).toBe(firstSale.id);
        (0, vitest_1.expect)(replayedSale.reference).toBe(firstSale.reference);
        // Database counts remain unchanged after replay
        const replayedSalesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(replayedSalesCount).toBe(1);
    });
    (0, vitest_1.it)("executes two SIMULTANEOUS independent sales concurrently: both succeed, generating 2 DISTINCT references without race condition", async () => {
        const payload1 = {
            lines: [{ productId: "prod-001", quantity: 1 }],
            payments: [{ method: "cash", amountMinor: 500 }],
            idempotencyKey: "diff-sale-key-001",
        };
        const payload2 = {
            lines: [{ productId: "prod-002", quantity: 1 }],
            payments: [{ method: "cash", amountMinor: 1200 }],
            idempotencyKey: "diff-sale-key-002",
        };
        const [sale1, sale2] = await Promise.all([
            salesService.createSale(userContext, payload1, database_1.prisma),
            salesService.createSale(userContext, payload2, database_1.prisma),
        ]);
        (0, vitest_1.expect)(sale1.id).not.toBe(sale2.id);
        (0, vitest_1.expect)(sale1.reference).not.toBe(sale2.reference);
        const references = [sale1.reference, sale2.reference];
        (0, vitest_1.expect)(references).toContain("VTE-0025");
        (0, vitest_1.expect)(references).toContain("VTE-0026");
        const totalSales = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(totalSales).toBe(2);
    });
});
