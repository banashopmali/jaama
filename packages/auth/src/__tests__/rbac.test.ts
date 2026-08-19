import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { RbacService, hasPermission } from "../rbac.service";
import { TenantService } from "../tenant.service";
import { createSession } from "../session";

describe("JAAMA Authorization & RBAC Foundation (JAA-S0-11)", () => {
  let db: InMemoryDatabase;
  let tenantService: TenantService;
  let rbacService: RbacService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    tenantService = new TenantService();
    rbacService = new RbacService();
  });

  describe("Role & Permission Mapping Invariants", () => {
    it("assigns full administrative capabilities to owner and admin roles", () => {
      expect(hasPermission("admin", "sales.create")).toBe(true);
      expect(hasPermission("admin", "products.manage")).toBe(true);
      expect(hasPermission("admin", "organization.manage")).toBe(true);
      expect(hasPermission("owner", "members.manage")).toBe(true);
    });

    it("assigns point-of-sale execution capabilities to vendeur role", () => {
      expect(hasPermission("vendeur", "sales.create")).toBe(true);
      expect(hasPermission("vendeur", "sales.read")).toBe(true);
      expect(hasPermission("vendeur", "payments.record")).toBe(true);
      expect(hasPermission("vendeur", "products.manage")).toBe(false);
      expect(hasPermission("vendeur", "organization.manage")).toBe(false);
    });

    it("denies mutation permissions to generic employe role", () => {
      expect(hasPermission("employe", "sales.read")).toBe(true);
      expect(hasPermission("employe", "sales.create")).toBe(false);
      expect(hasPermission("employe", "payments.record")).toBe(false);
    });
  });

  describe("Server-Side RBAC Authorization Enforcement", () => {
    it("allows authorized admin Hamidou to execute sales.create", () => {
      const session = createSession(db, "user-hamidou");
      const orgContext = tenantService.resolveTenantContext(db, session.token, "org-diallo");

      expect(() => rbacService.authorize(orgContext, "sales.create")).not.toThrow();
    });

    it("allows authorized vendeur to execute sales.create", () => {
      // Set Hamidou role to vendeur
      const membership = db.memberships.get("org-diallo:user-hamidou");
      if (membership) membership.role = "vendeur";

      const session = createSession(db, "user-hamidou");
      const orgContext = tenantService.resolveTenantContext(db, session.token, "org-diallo");

      expect(() => rbacService.authorize(orgContext, "sales.create")).not.toThrow();
    });

    it("REJECTS employe role attempting to execute sales.create with clear error", () => {
      // Set Hamidou role to employe
      const membership = db.memberships.get("org-diallo:user-hamidou");
      if (membership) membership.role = "employe";

      const session = createSession(db, "user-hamidou");
      const orgContext = tenantService.resolveTenantContext(db, session.token, "org-diallo");

      expect(() => rbacService.authorize(orgContext, "sales.create")).toThrow(
        "Accès refusé : Permission 'sales.create' requise."
      );
    });
  });
});
