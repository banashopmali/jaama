"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("@jaama/database");
const sales_service_1 = require("../sales/sales.service");
(0, vitest_1.describe)("JAAMA Reference Create Sale Vertical Slice against PostgreSQL (JAA-S0-17 / CERTIFICATION PROOF)", () => {
    const salesService = new sales_service_1.SalesService();
    const sessionRepo = new database_1.PrismaSessionRepository(database_1.prisma);
    let userContext;
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
        // Ensure Lait Nido (prod-003) unitPriceMinor is 5000 FCFA
        await database_1.prisma.product.update({
            where: { organizationId_id: { organizationId: "org-diallo", id: "prod-003" } },
            data: { unitPriceMinor: 5000 },
        });
        await sessionRepo.createSession("user-hamidou", "token-slice-123", new Date(Date.now() + 3600000));
        userContext = {
            actorId: "user-hamidou",
            organizationId: "org-diallo",
            membershipId: "org-diallo:user-hamidou",
            permissions: ["sales.create"],
        };
    });
    (0, vitest_1.afterAll)(async () => {
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("executes authoritative vertical slice against real PostgreSQL: Hamidou @ Diallo Commerce, Total 75 000 FCFA, Paid 50 000 FCFA (Wave), Remaining 25 000 FCFA", async () => {
        // Payload: 10x Riz Parfumé 5kg (65 000) + 2x Lait Nido 400g (10 000) = 75 000 FCFA
        // Payment: Wave 50 000 FCFA
        const payload = {
            customerId: null, // Client comptoir
            lines: [
                { productId: "prod-004", quantity: 10 },
                { productId: "prod-003", quantity: 2 },
            ],
            discountMinor: 0,
            payments: [{ method: "wave", amountMinor: 50000 }],
            idempotencyKey: "ref-postgres-slice-001",
        };
        // 1. Execute Sale Transaction
        const sale = await salesService.createSale(userContext, payload, database_1.prisma);
        // 2. Assert Returned Entity Values
        (0, vitest_1.expect)(sale.id).toBeDefined();
        (0, vitest_1.expect)(sale.organizationId).toBe("org-diallo");
        (0, vitest_1.expect)(sale.sellerUserId).toBe("user-hamidou");
        (0, vitest_1.expect)(sale.customerId).toBeNull();
        (0, vitest_1.expect)(sale.subtotalMinor).toBe(75000);
        (0, vitest_1.expect)(sale.discountMinor).toBe(0);
        (0, vitest_1.expect)(sale.totalMinor).toBe(75000);
        (0, vitest_1.expect)(sale.paidMinor).toBe(50000);
        (0, vitest_1.expect)(sale.remainingMinor).toBe(25000);
        (0, vitest_1.expect)(sale.saleStatus).toBe("COMPLETED");
        (0, vitest_1.expect)(sale.paymentStatus).toBe("PARTIALLY_PAID");
        // 3. Assert Real PostgreSQL Database Ledger Persistence
        const dbSale = await database_1.prisma.sale.findUnique({
            where: { organizationId_id: { organizationId: "org-diallo", id: sale.id } },
            include: { lines: true, payments: true },
        });
        (0, vitest_1.expect)(dbSale).not.toBeNull();
        (0, vitest_1.expect)(dbSale?.reference).toBe(sale.reference);
        (0, vitest_1.expect)(dbSale?.lines.length).toBe(2);
        // Payments in PostgreSQL
        const dbPayments = await database_1.prisma.payment.findMany({
            where: { organizationId: "org-diallo", saleId: sale.id },
        });
        (0, vitest_1.expect)(dbPayments.length).toBe(1);
        (0, vitest_1.expect)(dbPayments[0].method).toBe("wave");
        (0, vitest_1.expect)(dbPayments[0].amountMinor).toBe(50000);
        (0, vitest_1.expect)(dbPayments[0].status).toBe("SUCCESS");
        // Stock Level Decrement in PostgreSQL (Riz initial 20 -> 10, Nido initial 10 -> 8)
        const rizBalance = await database_1.prisma.inventoryBalance.findUnique({
            where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-004" } },
        });
        (0, vitest_1.expect)(rizBalance?.availableQuantity).toBe(10);
        const nidoBalance = await database_1.prisma.inventoryBalance.findUnique({
            where: { organizationId_productId: { organizationId: "org-diallo", productId: "prod-003" } },
        });
        (0, vitest_1.expect)(nidoBalance?.availableQuantity).toBe(8);
        // Stock Movements in PostgreSQL
        const movements = await database_1.prisma.stockMovement.findMany({
            where: { organizationId: "org-diallo", reference: sale.reference },
        });
        (0, vitest_1.expect)(movements.length).toBe(2);
        // Audit Event in PostgreSQL
        const audit = await database_1.prisma.auditEvent.findFirst({
            where: { organizationId: "org-diallo", resourceId: sale.id },
        });
        (0, vitest_1.expect)(audit).not.toBeNull();
        (0, vitest_1.expect)(audit?.actorId).toBe("user-hamidou");
        // Outbox Event in PostgreSQL
        const outbox = await database_1.prisma.outboxEvent.findFirst({
            where: { organizationId: "org-diallo", aggregateId: sale.id },
        });
        (0, vitest_1.expect)(outbox).not.toBeNull();
        (0, vitest_1.expect)(outbox?.eventType).toBe("SaleCreated");
        // Idempotency Record in PostgreSQL
        const idempRecord = await database_1.prisma.idempotencyRecord.findUnique({
            where: {
                organizationId_operation_idempotencyKey: {
                    organizationId: "org-diallo",
                    operation: "sales.create",
                    idempotencyKey: "ref-postgres-slice-001",
                },
            },
        });
        (0, vitest_1.expect)(idempRecord).not.toBeNull();
        (0, vitest_1.expect)(idempRecord?.status).toBe("COMPLETED");
        // 4. Assert Idempotent Replay on Duplicate Request
        const replayedSale = await salesService.createSale(userContext, payload, database_1.prisma);
        (0, vitest_1.expect)(replayedSale.id).toBe(sale.id);
        // Verify DB count did not duplicate
        const finalSalesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(finalSalesCount).toBe(1);
    });
});
