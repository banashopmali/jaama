import { Permission, Role } from "@jaama/types";
import { OrganizationContext } from "./tenant.service";

// Authoritative RBAC Policy Mapping for JAAMA (JAA-S0-11 / JAA-S1-01..20)

export const ALL_PERMISSIONS: Permission[] = [
  "sales.read",
  "sales.create",
  "sales.manage",
  "products.read",
  "products.manage",
  "inventory.read",
  "inventory.adjust",
  "customers.read",
  "customers.manage",
  "payments.read",
  "payments.record",
  "quotes.read",
  "quotes.manage",
  "invoices.read",
  "invoices.manage",
  "expenses.read",
  "expenses.manage",
  "suppliers.read",
  "suppliers.manage",
  "purchases.read",
  "purchases.manage",
  "purchases.receive",
  "organization.manage",
  "members.read",
  "members.manage",
  "reports.read",
  "imports.manage",
  "exports.read",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS],
  vendeur: [
    "sales.read",
    "sales.create",
    "products.read",
    "inventory.read",
    "customers.read",
    "customers.manage",
    "payments.read",
    "payments.record",
    "quotes.read",
    "quotes.manage",
  ],
  comptable: [
    "sales.read",
    "products.read",
    "inventory.read",
    "customers.read",
    "payments.read",
    "payments.record",
    "quotes.read",
    "quotes.manage",
    "invoices.read",
    "invoices.manage",
    "expenses.read",
    "expenses.manage",
    "suppliers.read",
    "suppliers.manage",
    "purchases.read",
    "reports.read",
    "exports.read",
  ],
  employe: [
    "sales.read",
    "products.read",
    "inventory.read",
    "customers.read",
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
