import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, seedPostgresDatabase, PrismaSessionRepository } from "@jaama/database";
import { SalesService } from "../sales/sales.service";
import { UserContext } from "@jaama/types";

describe("JAAMA Security Attack Matrix Integration Tests against PostgreSQL (JAA-S0-13)", () => {
  const salesService = new SalesService();
  const sessionRepo = new PrismaSessionRepository(prisma);

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    // Create session token for Hamidou in PostgreSQL
    await sessionRepo.createSession("user-hamidou", "token-hamidou-123", new Date(Date.now() + 3600000));

    // Create Org B (Mali Tech) and Org B Product & Customer
    await prisma.organization.create({
      data: {
        id: "org-mali-tech",
        name: "Mali Tech",
        slug: "mali-tech",
        status: "active",
      },
    });

    await prisma.product.create({
      data: {
        id: "prod-org-b",
        organizationId: "org-mali-tech",
        sku: "PROD-B-1",
        name: "Produit Org B",
        category: "Test",
        unitPriceMinor: 2000,
      },
    });

    await prisma.customer.create({
      data: {
        id: "cust-org-b",
        organizationId: "org-mali-tech",
        name: "Client Org B",
        phone: "+22370000002",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("REJECTS cross-tenant Product reference in CreateSale command with 400 error", async () => {
    const userContext: UserContext = {
      actorId: "user-hamidou",
      organizationId: "org-diallo", // Org A
      membershipId: "org-diallo:user-hamidou",
      permissions: ["sales.create"],
    };

    const payload = {
      lines: [{ productId: "prod-org-b", quantity: 1 }], // Belongs to Org B!
      payments: [{ method: "cash", amountMinor: 2000 }],
    };

    await expect(
      salesService.createSale(userContext, payload, prisma)
    ).rejects.toThrow("Produit introuvable ou inactif dans cette organisation");
  });

  it("REJECTS cross-tenant Customer reference in CreateSale command with 400 error and ZERO database mutations", async () => {
    const userContext: UserContext = {
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

    await expect(
      salesService.createSale(userContext, payload, prisma)
    ).rejects.toThrow("Client introuvable ou n'appartient pas à votre organisation");

    // Verify ZERO mutations in PostgreSQL
    const salesCount = await prisma.sale.count({ where: { organizationId: "org-diallo" } });
    expect(salesCount).toBe(0);

    const paymentsCount = await prisma.payment.count({ where: { organizationId: "org-diallo" } });
    expect(paymentsCount).toBe(0);

    const stockMovements = await prisma.stockMovement.count({ where: { organizationId: "org-diallo" } });
    expect(stockMovements).toBe(0);

    const auditCount = await prisma.auditEvent.count({ where: { organizationId: "org-diallo" } });
    expect(auditCount).toBe(0);

    const outboxCount = await prisma.outboxEvent.count({ where: { organizationId: "org-diallo" } });
    expect(outboxCount).toBe(0);
  });

  it("REJECTS negative or zero quantity in CreateSale command", async () => {
    const userContext: UserContext = {
      actorId: "user-hamidou",
      organizationId: "org-diallo",
      membershipId: "org-diallo:user-hamidou",
      permissions: ["sales.create"],
    };

    const payload = {
      lines: [{ productId: "prod-001", quantity: -5 }],
      payments: [{ method: "cash", amountMinor: 500 }],
    };

    await expect(
      salesService.createSale(userContext, payload, prisma)
    ).rejects.toThrow("La quantité de chaque produit doit être un entier strictement positif.");
  });

  it("REJECTS duplicate payment methods in CreateSale command", async () => {
    const userContext: UserContext = {
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

    await expect(
      salesService.createSale(userContext, payload, prisma)
    ).rejects.toThrow("Un mode de règlement ne peut être utilisé qu’une seule fois.");
  });
});
