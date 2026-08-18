import { InMemoryDatabase } from "@jaama/database";
import { AuthService, RbacService, TenantService } from "@jaama/auth";
import { Permission, UserContext } from "@jaama/types";
import { createApiErrorEnvelope, ApiErrorEnvelope } from "@jaama/validation";

export interface PipelineRequestContext {
  requestId: string;
  sessionToken?: string;
  targetOrganizationId?: string;
}

export interface PipelineSuccessResult<T> {
  success: true;
  userContext: UserContext;
  data: T;
}

export interface PipelineErrorResult {
  success: false;
  statusCode: number;
  errorEnvelope: ApiErrorEnvelope;
}

export class SecurityPipeline {
  private authService = new AuthService();
  private tenantService = new TenantService();
  private rbacService = new RbacService();

  /**
   * Processes a protected business request through the locked security request pipeline.
   */
  public async executeProtectedRequest<T>(
    db: InMemoryDatabase,
    reqContext: PipelineRequestContext,
    requiredPermission: Permission,
    handler: (userContext: UserContext) => Promise<T>
  ): Promise<PipelineSuccessResult<T> | PipelineErrorResult> {
    const requestId = reqContext.requestId || `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      // 1. AUTHENTICATION
      if (!reqContext.sessionToken) {
        return {
          success: false,
          statusCode: 401,
          errorEnvelope: createApiErrorEnvelope("AUTHENTICATION_REQUIRED", "Authentification requise pour effectuer cette opération.", requestId),
        };
      }

      // 2. TENANT RESOLUTION & MEMBERSHIP VALIDATION
      if (!reqContext.targetOrganizationId) {
        return {
          success: false,
          statusCode: 400,
          errorEnvelope: createApiErrorEnvelope("TENANT_REQUIRED", "L'identifiant de l'organisation cible est requis.", requestId),
        };
      }

      let orgContext;
      try {
        orgContext = this.tenantService.resolveTenantContext(
          db,
          reqContext.sessionToken,
          reqContext.targetOrganizationId
        );
      } catch (err: any) {
        return {
          success: false,
          statusCode: 403,
          errorEnvelope: createApiErrorEnvelope("TENANT_ACCESS_DENIED", err.message || "Accès refusé au tenant cible.", requestId),
        };
      }

      // 3. RBAC & POLICY ENFORCEMENT
      try {
        this.rbacService.authorize(orgContext, requiredPermission);
      } catch (err: any) {
        return {
          success: false,
          statusCode: 403,
          errorEnvelope: createApiErrorEnvelope("PERMISSION_DENIED", err.message || "Permission manquante.", requestId),
        };
      }

      // 4. BUILD CANONICAL USER CONTEXT
      const userContext = this.tenantService.createUserContext(orgContext, [requiredPermission]);

      // 5. EXECUTE BUSINESS HANDLER
      const data = await handler(userContext);

      return {
        success: true,
        userContext,
        data,
      };
    } catch (err: any) {
      // Production error normalization (no stack traces, no internal leaks)
      return {
        success: false,
        statusCode: 400,
        errorEnvelope: createApiErrorEnvelope("BUSINESS_RULE_VIOLATION", err.message || "Erreur lors du traitement de la requête.", requestId),
      };
    }
  }
}
