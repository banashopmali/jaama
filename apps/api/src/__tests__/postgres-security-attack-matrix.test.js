"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("@jaama/database");
const sales_service_1 = require("../sales/sales.service");
(0, vitest_1.describe)("JAAMA Security Attack Matrix Integration Tests against PostgreSQL (JAA-S0-13)", () => {
    const salesService = new sales_service_1.SalesService();
    const sessionRepo = new database_1.PrismaSessionRepository(database_1.prisma);
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
        // Create session token for Hamidou in PostgreSQL
        await sessionRepo.createSession("user-hamidou", "token-hamidou-123", new Date(Date.now() + 3600000));
        // Create Org B (Mali Tech) and Org B Product & Customer
        await database_1.prisma.organization.create({
            data: {
                id: "org-mali-tech",
                name: "Mali Tech",
                slug: "mali-tech",
                status: "active",
            },
        });
        await database_1.prisma.product.create({
            data: {
                id: "prod-org-b",
                organizationId: "org-mali-tech",
                sku: "PROD-B-1",
                name: "Produit Org B",
                category: "Test",
                unitPriceMinor: 2000,
            },
        });
        await database_1.prisma.customer.create({
            data: {
                id: "cust-org-b",
                organizationId: "org-mali-tech",
                name: "Client Org B",
                phone: "+22370000002",
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("REJECTS cross-tenant Product reference in CreateSale command with 400 error", async () => {
        const userContext = {
            actorId: "user-hamidou",
            organizationId: "org-diallo", // Org A
            membershipId: "org-diallo:user-hamidou",
            permissions: ["sales.create"],
        };
        const payload = {
            lines: [{ productId: "prod-org-b", quantity: 1 }], // Belongs to Org B!
            payments: [{ method: "cash", amountMinor: 2000 }],
        };
        await (0, vitest_1.expect)(salesService.createSale(userContext, payload, database_1.prisma)).rejects.toThrow("Produit introuvable ou inactif dans cette organisation");
    });
    (0, vitest_1.it)("REJECTS cross-tenant Customer reference in CreateSale command with 400 error and ZERO database mutations", async () => {
        const userContext = {
            actorId: "user-hamidou",
            organizationId: "org-diallo", // Org A
            membershipId: "org-diallo:user-hamidou",
            permissions: ["sales.create"],
        };
        const payload = {
            customerId: "cust-org-b", // Belongs to Org B!
            lines: [{ productId: "prod-001", quantity: 1 }],
            payments: [{ method: "cash", amountMinor: 500 }],
        };
        await (0, vitest_1.expect)(salesService.createSale(userContext, payload, database_1.prisma)).rejects.toThrow("Client introuvable ou n'appartient pas à votre organisation");
        // Verify ZERO mutations in PostgreSQL
        const salesCount = await database_1.prisma.sale.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(salesCount).toBe(0);
        const paymentsCount = await database_1.prisma.payment.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(paymentsCount).toBe(0);
        const stockMovements = await database_1.prisma.stockMovement.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(stockMovements).toBe(0);
        const auditCount = await database_1.prisma.auditEvent.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(auditCount).toBe(0);
        const outboxCount = await database_1.prisma.outboxEvent.count({ where: { organizationId: "org-diallo" } });
        (0, vitest_1.expect)(outboxCount).toBe(0);
    });
    (0, vitest_1.it)("REJECTS negative or zero quantity in CreateSale command", async () => {
        const userContext = {
            actorId: "user-hamidou",
            organizationId: "org-diallo",
            membershipId: "org-diallo:user-hamidou",
            permissions: ["sales.create"],
        };
        const payload = {
            lines: [{ productId: "prod-001", quantity: -5 }],
            payments: [{ method: "cash", amountMinor: 500 }],
        };
        await (0, vitest_1.expect)(salesService.createSale(userContext, payload, database_1.prisma)).rejects.toThrow("La quantité de chaque produit doit être un entier strictement positif.");
    });
    (0, vitest_1.it)("REJECTS duplicate payment methods in CreateSale command", async () => {
        const userContext = {
            actorId: "user-hamidou",
            organizationId: "org-diallo",
            membershipId: "org-diallo:user-hamidou",
            permissions: ["sales.create"],
        };
        const payload = {
            lines: [{ productId: "prod-001", quantity: 1 }],
            payments: [
                { method: "cash", amountMinor: 250 },
                { method: "cash", amountMinor: 250 }, // Duplicate method!
            ],
        };
        await (0, vitest_1.expect)(salesService.createSale(userContext, payload, database_1.prisma)).rejects.toThrow("Un mode de règlement ne peut être utilisé qu’une seule fois.");
    });
});
