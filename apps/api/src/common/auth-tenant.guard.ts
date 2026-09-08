import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, BadRequestException, SetMetadata, Optional } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PrismaSessionRepository, PrismaMembershipRepository, PrismaOrganizationRepository, prisma } from "@jaama/database";
import { hasPermission } from "@jaama/auth";
import { Permission, Role, UserContext } from "@jaama/types";

export interface AuthenticatedRequest extends Request {
  userContext: UserContext;
}

export const PERMISSION_KEY = "requiredPermission";
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class AuthTenantGuard implements CanActivate {
  private sessionRepo = new PrismaSessionRepository(prisma);
  private membershipRepo = new PrismaMembershipRepository(prisma);
  private orgRepo = new PrismaOrganizationRepository(prisma);
  private reflector: Reflector;

  public constructor(@Optional() reflector?: Reflector) {
    this.reflector = reflector || new Reflector();
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // 1. AUTHENTICATION (HttpOnly cookie, Authorization header, or x-session-token)
    let token = "";
    if ((request as any).cookies && (request as any).cookies.jaama_session) {
      token = (request as any).cookies.jaama_session;
    }
    if (!token && typeof request.headers["cookie"] === "string") {
      const match = request.headers["cookie"].match(/jaama_session=([^;]+)/);
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
      }
    }
    if (!token) {
      const authHeader = request.headers["authorization"] || request.headers["x-session-token"];
      token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    }

    if (!token) {
      throw new UnauthorizedException("Authentification requise. Jeton de session manquant.");
    }

    const session = await this.sessionRepo.findByToken(token);
    if (!session) {
      throw new UnauthorizedException("Session invalide, expirée ou compte désactivé.");
    }

    // 2. TENANT RESOLUTION
    const targetOrgId = (request.headers["x-organization-id"] || request.body?.organizationId) as string;
    if (!targetOrgId) {
      throw new BadRequestException("L'identifiant de l'organisation cible est requis (X-Organization-ID).");
    }

    const organization = await this.orgRepo.findById(targetOrgId);
    if (!organization || organization.status !== "active") {
      throw new ForbiddenException("Organisation introuvable ou inactive.");
    }

    // 3. MEMBERSHIP VALIDATION
    const membership = await this.membershipRepo.findByOrganizationAndUser(targetOrgId, session.userId);
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("Accès refusé : Aucun membre actif trouvé dans cette organisation.");
    }

    // 4. RBAC EVALUATION
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermission && !hasPermission(membership.role as Role, requiredPermission)) {
      throw new ForbiddenException(`Accès refusé : Permission '${requiredPermission}' requise.`);
    }

    // 5. ATTACH CANONICAL USER CONTEXT
    const userContext: UserContext = {
      actorId: session.userId,
      organizationId: organization.id,
      membershipId: membership.id,
      permissions: requiredPermission ? [requiredPermission] : [],
    };

    request.userContext = userContext;
    return true;
  }
}
