"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("@jaama/database");
const sales_service_1 = require("../sales/sales.service");
(0, vitest_1.describe)("JAAMA Real PostgreSQL Stock Concurrency & Oversell Protection (JAA-S0-14 / P0)", () => {
    const salesService = new sales_service_1.SalesService();
    const userContext = {
        actorId: "user-hamidou",
        organizationId: "org-diallo",
        membershipId: "org-diallo:user-hamidou",
        permissions: ["sales.create"],
    };
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
        // Set Lait Nido (prod-003) stock to EXACTLY 1 in PostgreSQL
        await database_1.prisma.inventoryBalance.update({
            where: {
                organizationId_productId: {
                    organizationId: "org-diallo",
                    productId: "prod-003",
                },
            },
            data: {
                availableQuantity: 1,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("executes two GENUINELY CONCURRENT sale attempts for stock=1: exactly 1 succeeds, 1 fails, final stock=0", async () => {
        const payload1 = {
            lines: [{ productId: "prod-003", quantity: 1 }], // Unit price 5000 FCFA
            payments: [{ method: "cash", amountMinor: 5000 }],
            idempotencyKey: "conc-sale-attempt-1",
        };
        const payload2 = {
            lines: [{ productId: "prod-003", quantity: 1 }],
            payments: [{ method: "cash", amountMinor: 5000 }],
            idempotencyKey: "conc-sale-attempt-2",
        };
        // Execute concurrently using Promise.allSettled
        const results = await Promise.allSettled([
            salesService.createSale(userContext, payload1, database_1.prisma),
            salesService.createSale(userContext, payload2, database_1.prisma),
        ]);
        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        // EXACTLY 1 SUCCEEDS AND 1 FAILS
        (0, vitest_1.expect)(fulfilled.length).toBe(1);
        (0, vitest_1.expect)(rejected.length).toBe(1);
        // Assert final available stock in PostgreSQL is EXACTLY 0 (never negative)
        const finalBalance = await database_1.prisma.inventoryBalance.findUnique({
            where: {
                organizationId_productId: {
                    organizationId: "org-diallo",
                    productId: "prod-003",
                },
            },
        });
        (0, vitest_1.expect)(finalBalance?.availableQuantity).toBe(0);
        // Assert exactly 1 Sale row was created in PostgreSQL for prod-003
        const salesCount = await database_1.prisma.sale.count({
            where: { organizationId: "org-diallo" },
        });
        (0, vitest_1.expect)(salesCount).toBe(1);
        // Assert exactly 1 SALE_OUT stock movement created
        const movements = await database_1.prisma.stockMovement.findMany({
            where: { organizationId: "org-diallo", productId: "prod-003" },
        });
        (0, vitest_1.expect)(movements.length).toBe(1);
        (0, vitest_1.expect)(movements[0].quantityDelta).toBe(-1);
    });
});
