import { InMemoryDatabase } from "@jaama/database";
import { Membership, Organization, User, UserContext } from "@jaama/types";
import { validateSession } from "./session";

export interface OrganizationContext {
  organizationId: string;
  organization: Organization;
  membership: Membership;
  user: User;
}

export class TenantService {
  /**
   * Resolves and validates authoritative tenant context for an authenticated session request.
   */
  public resolveTenantContext(
    db: InMemoryDatabase,
    sessionToken: string,
    targetOrganizationId: string
  ): OrganizationContext {
    if (!sessionToken) {
      throw new Error("Authentification requise.");
    }

    const sessionContext = validateSession(db, sessionToken);
    if (!sessionContext) {
      throw new Error("Session invalide ou expirée.");
    }

    const { user } = sessionContext;
    if (user.status !== "active") {
      throw new Error("Compte utilisateur désactivé.");
    }

    const organization = db.organizations.get(targetOrganizationId);
    if (!organization || organization.status !== "active") {
      throw new Error("Organisation introuvable ou inactive.");
    }

    const membershipKey = `${targetOrganizationId}:${user.id}`;
    const membership = db.memberships.get(membershipKey);

    if (!membership || membership.status !== "active") {
      throw new Error("Accès refusé : Aucun membre actif trouvé dans cette organisation.");
    }

    return {
      organizationId: organization.id,
      organization,
      membership,
      user,
    };
  }

  /**
   * Builds canonical UserContext for permissions evaluation.
   */
  public createUserContext(
    orgContext: OrganizationContext,
    permissions: any[]
  ): UserContext {
    return {
      actorId: orgContext.user.id,
      organizationId: orgContext.organizationId,
      membershipId: orgContext.membership.id,
      permissions,
    };
  }
}
