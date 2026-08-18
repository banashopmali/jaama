import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { TenantService } from "../tenant.service";
import { createSession } from "../session";

describe("JAAMA Organizations & Multi-Tenancy Security Foundation (JAA-S0-10)", () => {
  let db: InMemoryDatabase;
  let tenantService: TenantService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    tenantService = new TenantService();
  });

  describe("Tenant Context Resolution & Multi-Org Support", () => {
    it("resolves valid tenant context for user with active membership in Diallo Commerce", () => {
      const session = createSession(db, "user-hamidou");
      const context = tenantService.resolveTenantContext(db, session.token, "org-diallo");

      expect(context.organizationId).toBe("org-diallo");
      expect(context.organization.name).toBe("Diallo Commerce");
      expect(context.membership.role).toBe("admin");
      expect(context.user.email).toBe("hamidou@diallo.com");
    });

    it("supports multi-org user with different memberships across organizations", () => {
      // Create second organization (Mali Tech)
      db.organizations.set("org-mali-tech", {
        id: "org-mali-tech",
        name: "Mali Tech",
        slug: "mali-tech",
        status: "active",
        createdAt: new Date(),
      });

      // Add Hamidou as vendeur in Mali Tech
      db.memberships.set("org-mali-tech:user-hamidou", {
        id: "mem-hamidou-malitech",
        organizationId: "org-mali-tech",
        userId: "user-hamidou",
        role: "vendeur",
        status: "active",
        createdAt: new Date(),
      });

      const session = createSession(db, "user-hamidou");

      const dialloContext = tenantService.resolveTenantContext(db, session.token, "org-diallo");
      expect(dialloContext.membership.role).toBe("admin");

      const maliTechContext = tenantService.resolveTenantContext(db, session.token, "org-mali-tech");
      expect(maliTechContext.membership.role).toBe("vendeur");
    });
  });

  describe("Negative Cross-Tenant Security Invariants (P0)", () => {
    it("REJECTS user attempting to access organization where they have NO membership", () => {
      // Create User B (Awa) in Org B (Mali Tech)
      db.users.set("user-awa", {
        id: "user-awa",
        email: "awa@malitech.com",
        name: "Awa Traoré",
        status: "active",
        createdAt: new Date(),
      });

      db.organizations.set("org-mali-tech", {
        id: "org-mali-tech",
        name: "Mali Tech",
        slug: "mali-tech",
        status: "active",
        createdAt: new Date(),
      });

      db.memberships.set("org-mali-tech:user-awa", {
        id: "mem-awa-malitech",
        organizationId: "org-mali-tech",
        userId: "user-awa",
        role: "admin",
        status: "active",
        createdAt: new Date(),
      });

      // Awa logs in and gets session
      const sessionAwa = createSession(db, "user-awa");

      // Awa attempts to access Diallo Commerce (Org A)
      expect(() =>
        tenantService.resolveTenantContext(db, sessionAwa.token, "org-diallo")
      ).toThrow("Accès refusé : Aucun membre actif trouvé dans cette organisation.");
    });

    it("REJECTS user with disabled membership in target organization", () => {
      const membership = db.memberships.get("org-diallo:user-hamidou");
      if (membership) membership.status = "disabled";

      const session = createSession(db, "user-hamidou");

      expect(() =>
        tenantService.resolveTenantContext(db, session.token, "org-diallo")
      ).toThrow("Accès refusé : Aucun membre actif trouvé dans cette organisation.");
    });

    it("REJECTS request targeting suspended/disabled organization", () => {
      const org = db.organizations.get("org-diallo");
      if (org) org.status = "suspended";

      const session = createSession(db, "user-hamidou");

      expect(() =>
        tenantService.resolveTenantContext(db, session.token, "org-diallo")
      ).toThrow("Organisation introuvable ou inactive.");
    });
  });
});
