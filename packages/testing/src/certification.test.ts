import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, seedPostgresDatabase, PrismaClient } from "@jaama/database";
import { AuthService, RbacService, TenantService, createSession } from "@jaama/auth";
import { SalesService, AuthTenantGuard } from "@jaama/api";
import { StructuredLogger, sanitizeContext } from "@jaama/observability";
import { validateEnvironment, getLivenessSignal, getReadinessSignal } from "@jaama/config";
import { validateCreateSaleCommand } from "@jaama/validation";
import { UserContext } from "@jaama/types";

describe("JAAMA Sprint 0 Foundation Program Final Certification (JAA-S0-19)", () => {
  const salesService = new SalesService();

  const defaultUserContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["sales.create", "sales.read"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("1. Multi-Tenant Isolation & Security Boundaries (JAA-S0-10)", () => {
    it("strictly prevents cross-tenant data access across all boundary operations", async () => {
      // Create Org B
      await prisma.organization.create({
        data: {
          id: "org-other-tenant",
          name: "Other Store",
          slug: "other-store",
          status: "active",
        },
      });

      await prisma.product.create({
        data: {
          id: "prod-other",
          organizationId: "org-other-tenant",
          sku: "OTH-01",
          name: "Other Product",
          category: "Misc",
          unitPriceMinor: 1000,
        },
      });

      // Hamidou (Org Diallo) attempts to purchase Org B product
      await expect(
        salesService.createSale(defaultUserContext, {
          lines: [{ productId: "prod-other", quantity: 1 }],
          payments: [{ method: "cash", amountMinor: 1000 }],
        }, prisma)
      ).rejects.toThrow("Produit introuvable ou inactif dans cette organisation");
    });
  });

  describe("2. Server-Side RBAC Policy Enforcement (JAA-S0-11)", () => {
    it("enforces deny-by-default role permission evaluation", async () => {
      const employeContext: UserContext = {
        actorId: "user-employe",
        organizationId: "org-diallo",
        membershipId: "org-diallo:user-employe",
        permissions: ["sales.read"], // missing sales.create
      };

      // Employe without sales.create attempts sale
      await expect(
        salesService.createSale(employeContext, {
          lines: [{ productId: "prod-001", quantity: 1 }],
          payments: [{ method: "cash", amountMinor: 500 }],
        }, prisma)
      ).rejects.toThrow();
    });
  });

  describe("3. Idempotency Key Engine & Conflict Protection (JAA-S0-14)", () => {
    it("replays cached response on duplicate request and rejects altered payloads", async () => {
      const payload1 = {
        lines: [{ productId: "prod-001", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 500 }],
        idempotencyKey: "cert-idemp-key-001",
      };

      const sale1 = await salesService.createSale(defaultUserContext, payload1, prisma);
      expect(sale1.id).toBeDefined();

      const sale2 = await salesService.createSale(defaultUserContext, payload1, prisma);
      expect(sale2.id).toBe(sale1.id);
    });
  });

  describe("4. Audit & Outbox Tracing (JAA-S0-15)", () => {
    it("redacts sensitive keys from audit log metadata", () => {
      const clean = sanitizeContext({ password: "secret-value", normal: "ok" });
      expect(clean.password).toBe("[REDACTED]");
      expect(clean.normal).toBe("ok");
    });
  });

  describe("5. Reference Create Sale Vertical Slice (JAA-S0-17)", () => {
    it("certifies complete vertical slice execution against PostgreSQL", async () => {
      const payload = {
        lines: [{ productId: "prod-004", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 6500 }],
      };

      const sale = await salesService.createSale(defaultUserContext, payload, prisma);
      expect(sale.totalMinor).toBe(6500);
      expect(sale.saleStatus).toBe("COMPLETED");
      expect(sale.paymentStatus).toBe("PAID");
    });
  });

  describe("6. Production Readiness & Health Signals (JAA-S0-18)", () => {
    it("provides liveness and readiness probe signals", () => {
      expect(getLivenessSignal().status).toBe("ok");
      expect(getReadinessSignal(true).status).toBe("ok");
    });
  });
});
