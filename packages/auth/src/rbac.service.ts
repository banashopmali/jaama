import { Permission, Role } from "@jaama/types";
import { OrganizationContext } from "./tenant.service";

// Authoritative RBAC Policy Mapping for JAAMA (JAA-S0-11)

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "sales.read",
    "sales.create",
    "products.read",
    "products.manage",
    "inventory.read",
    "inventory.adjust",
    "payments.read",
    "payments.record",
    "organization.manage",
    "members.manage",
    "reports.read",
  ],
  admin: [
    "sales.read",
    "sales.create",
    "products.read",
    "products.manage",
    "inventory.read",
    "inventory.adjust",
    "payments.read",
    "payments.record",
    "organization.manage",
    "members.manage",
    "reports.read",
  ],
  vendeur: [
    "sales.read",
    "sales.create",
    "products.read",
    "payments.read",
    "payments.record",
  ],
  comptable: [
    "sales.read",
    "products.read",
    "payments.read",
    "payments.record",
    "reports.read",
  ],
  employe: [
    "sales.read",
    "products.read",
    "inventory.read",
  ],
};

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: Role, requiredPermission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(requiredPermission);
}

export class RbacService {
  /**
   * Authorizes a request against target organization context and required permission.
   * Throws deterministic error if permission is missing.
   */
  public authorize(orgContext: OrganizationContext, requiredPermission: Permission): void {
    if (!orgContext || !orgContext.membership) {
      throw new Error("Accès refusé : Contexte membre introuvable.");
    }

    const { role, status } = orgContext.membership;
    if (status !== "active") {
      throw new Error("Accès refusé : Membre inactif.");
    }

    if (!hasPermission(role, requiredPermission)) {
      throw new Error(`Accès refusé : Permission '${requiredPermission}' requise.`);
    }
  }
}
