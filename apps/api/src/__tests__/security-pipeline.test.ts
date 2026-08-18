import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { createSession } from "@jaama/auth";
import { SecurityPipeline } from "../pipeline/security-pipeline";
import { SaleApplicationService } from "../services/sale-application.service";

describe("JAAMA Security Request Pipeline Integration (JAA-S0-13)", () => {
  let db: InMemoryDatabase;
  let pipeline: SecurityPipeline;
  let saleService: SaleApplicationService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    pipeline = new SecurityPipeline();
    saleService = new SaleApplicationService();
  });

  it("REJECTS unauthenticated request with 401 AUTHENTICATION_REQUIRED", async () => {
    const result = await pipeline.executeProtectedRequest(
      db,
      { requestId: "req-anon", sessionToken: undefined, targetOrganizationId: "org-diallo" },
      "sales.create",
      async () => "data"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(401);
      expect(result.errorEnvelope.error.code).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("REJECTS cross-tenant request with 403 TENANT_ACCESS_DENIED when user has no membership in target org", async () => {
    // Register User Awa in Org Mali Tech
    db.users.set("user-awa", { id: "user-awa", email: "awa@malitech.com", name: "Awa", status: "active", createdAt: new Date() });
    db.organizations.set("org-mali-tech", { id: "org-mali-tech", name: "Mali Tech", slug: "mali-tech", status: "active", createdAt: new Date() });
    db.memberships.set("org-mali-tech:user-awa", { id: "mem-awa", organizationId: "org-mali-tech", userId: "user-awa", role: "admin", status: "active", createdAt: new Date() });

    const sessionAwa = createSession(db, "user-awa");

    const result = await pipeline.executeProtectedRequest(
      db,
      { requestId: "req-cross", sessionToken: sessionAwa.token, targetOrganizationId: "org-diallo" },
      "sales.create",
      async () => "data"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(403);
      expect(result.errorEnvelope.error.code).toBe("TENANT_ACCESS_DENIED");
    }
  });

  it("REJECTS request when role lacks required permission (sales.create for employe)", async () => {
    // Change Hamidou role to employe
    const membership = db.memberships.get("org-diallo:user-hamidou");
    if (membership) membership.role = "employe";

    const session = createSession(db, "user-hamidou");

    const result = await pipeline.executeProtectedRequest(
      db,
      { requestId: "req-rbac", sessionToken: session.token, targetOrganizationId: "org-diallo" },
      "sales.create",
      async () => "data"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(403);
      expect(result.errorEnvelope.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("ALLOWS valid request for authorized seller through full security pipeline", async () => {
    const session = createSession(db, "user-hamidou");

    const payload = {
      lines: [{ productId: "prod-001", quantity: 2 }],
      payments: [{ method: "cash", amountMinor: 1000 }],
    };

    const result = await pipeline.executeProtectedRequest(
      db,
      { requestId: "req-valid", sessionToken: session.token, targetOrganizationId: "org-diallo" },
      "sales.create",
      async (ctx) => {
        return saleService.createSale(db, payload, ctx.organizationId, ctx.actorId);
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.userContext.actorId).toBe("user-hamidou");
      expect(result.userContext.organizationId).toBe("org-diallo");
      expect(result.data.totalMinor).toBe(1000);
      expect(result.data.saleStatus).toBe("COMPLETED");
    }
  });
});
