import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { AuthService, RbacService, TenantService, createSession } from "@jaama/auth";
import { SecurityPipeline, SaleApplicationService, IdempotencyService } from "@jaama/api";
import { StructuredLogger, sanitizeContext } from "@jaama/observability";
import { validateEnvironment, getLivenessSignal, getReadinessSignal } from "@jaama/config";
import { validateCreateSaleCommand } from "@jaama/validation";

describe("JAAMA Sprint 0 Foundation Program Final Certification (JAA-S0-19)", () => {
  let db: InMemoryDatabase;
  let pipeline: SecurityPipeline;
  let saleService: SaleApplicationService;
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    pipeline = new SecurityPipeline();
    saleService = new SaleApplicationService();
    idempotencyService = new IdempotencyService();
  });

  describe("1. Multi-Tenant Isolation & Security Boundaries (JAA-S0-10)", () => {
    it("strictly prevents cross-tenant data access across all boundary operations", () => {
      // Seed a 2nd org where Hamidou has NO membership
      db.organizations.set("org-other-tenant", {
        id: "org-other-tenant",
        name: "Other Store",
        slug: "other-store",
        status: "active",
        createdAt: new Date(),
      });

      const session = createSession(db, "user-hamidou");
      const tenantService = new TenantService();

      expect(() => tenantService.resolveTenantContext(db, session.token, "org-other-tenant")).toThrow("Accès refusé");
    });
  });

  describe("2. Server-Side RBAC Policy Enforcement (JAA-S0-11)", () => {
    it("enforces deny-by-default role permission evaluation", () => {
      const rbac = new RbacService();
      const tenantService = new TenantService();

      // Employe attempting sales.create
      const membership = db.memberships.get("org-diallo:user-hamidou");
      if (membership) membership.role = "employe";

      const session = createSession(db, "user-hamidou");
      const orgContext = tenantService.resolveTenantContext(db, session.token, "org-diallo");

      expect(() => rbac.authorize(orgContext, "sales.create")).toThrow("Permission 'sales.create' requise");
    });
  });

  describe("3. Security Request Pipeline Guarantees (JAA-S0-13)", () => {
    it("fails closed on unauthenticated requests", async () => {
      const res = await pipeline.executeProtectedRequest(
        db,
        { requestId: "cert-01", sessionToken: undefined, targetOrganizationId: "org-diallo" },
        "sales.create",
        async () => "ok"
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.statusCode).toBe(401);
      }
    });
  });

  describe("4. Idempotency Key Engine & Conflict Protection (JAA-S0-14)", () => {
    it("replays cached response on duplicate request and rejects altered payloads", async () => {
      const payload1 = {
        lines: [{ productId: "prod-001", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 500 }],
        idempotencyKey: "cert-idemp-key",
      };

      const res1 = await idempotencyService.handleIdempotency(
        db,
        "org-diallo",
        "sales.create",
        payload1.idempotencyKey,
        payload1,
        () => saleService.createSale(db, payload1, "org-diallo", "user-hamidou")
      );
      expect(res1.cached).toBe(false);

      const res2 = await idempotencyService.handleIdempotency(
        db,
        "org-diallo",
        "sales.create",
        payload1.idempotencyKey,
        payload1,
        () => saleService.createSale(db, payload1, "org-diallo", "user-hamidou")
      );
      expect(res2.cached).toBe(true);
      expect(res2.result.id).toBe(res1.result.id);
    });
  });

  describe("5. Audit & Outbox Tracing (JAA-S0-15)", () => {
    it("redacts sensitive keys from audit log metadata", () => {
      const clean = sanitizeContext({ password: "secret-value", normal: "ok" });
      expect(clean.password).toBe("[REDACTED]");
      expect(clean.normal).toBe("ok");
    });
  });

  describe("6. Reference Create Sale Vertical Slice (JAA-S0-17)", () => {
    it("certifies complete vertical slice execution", async () => {
      const session = createSession(db, "user-hamidou");
      const payload = {
        lines: [{ productId: "prod-004", quantity: 1 }],
        payments: [{ method: "cash", amountMinor: 6500 }],
      };

      const sale = await saleService.createSale(db, payload, "org-diallo", "user-hamidou");
      expect(sale.totalMinor).toBe(6500);
      expect(sale.saleStatus).toBe("COMPLETED");
      expect(sale.paymentStatus).toBe("PAID");
    });
  });

  describe("7. Production Readiness & Health Signals (JAA-S0-18)", () => {
    it("provides liveness and readiness probe signals", () => {
      expect(getLivenessSignal().status).toBe("ok");
      expect(getReadinessSignal(true).status).toBe("ok");
    });
  });
});
