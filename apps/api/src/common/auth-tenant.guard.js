"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTenantGuard = exports.RequirePermission = exports.PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const database_1 = require("@jaama/database");
const auth_1 = require("@jaama/auth");
exports.PERMISSION_KEY = "requiredPermission";
const RequirePermission = (permission) => (0, common_1.SetMetadata)(exports.PERMISSION_KEY, permission);
exports.RequirePermission = RequirePermission;
let AuthTenantGuard = class AuthTenantGuard {
    sessionRepo = new database_1.PrismaSessionRepository(database_1.prisma);
    membershipRepo = new database_1.PrismaMembershipRepository(database_1.prisma);
    orgRepo = new database_1.PrismaOrganizationRepository(database_1.prisma);
    reflector;
    constructor(reflector) {
        this.reflector = reflector || new core_1.Reflector();
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        // 1. AUTHENTICATION (Bearer token from Authorization header or x-session-token)
        const authHeader = request.headers["authorization"] || request.headers["x-session-token"];
        const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
        if (!token) {
            throw new common_1.UnauthorizedException("Authentification requise. Jeton de session manquant.");
        }
        const session = await this.sessionRepo.findByToken(token);
        if (!session) {
            throw new common_1.UnauthorizedException("Session invalide, expirée ou compte désactivé.");
        }
        // 2. TENANT RESOLUTION
        const targetOrgId = (request.headers["x-organization-id"] || request.body?.organizationId);
        if (!targetOrgId) {
            throw new common_1.BadRequestException("L'identifiant de l'organisation cible est requis (X-Organization-ID).");
        }
        const organization = await this.orgRepo.findById(targetOrgId);
        if (!organization || organization.status !== "active") {
            throw new common_1.ForbiddenException("Organisation introuvable ou inactive.");
        }
        // 3. MEMBERSHIP VALIDATION
        const membership = await this.membershipRepo.findByOrganizationAndUser(targetOrgId, session.userId);
        if (!membership || membership.status !== "active") {
            throw new common_1.ForbiddenException("Accès refusé : Aucun membre actif trouvé dans cette organisation.");
        }
        // 4. RBAC EVALUATION
        const requiredPermission = this.reflector.getAllAndOverride(exports.PERMISSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (requiredPermission && !(0, auth_1.hasPermission)(membership.role, requiredPermission)) {
            throw new common_1.ForbiddenException(`Accès refusé : Permission '${requiredPermission}' requise.`);
        }
        // 5. ATTACH CANONICAL USER CONTEXT
        const userContext = {
            actorId: session.userId,
            organizationId: organization.id,
            membershipId: membership.id,
            permissions: requiredPermission ? [requiredPermission] : [],
        };
        request.userContext = userContext;
        return true;
    }
};
exports.AuthTenantGuard = AuthTenantGuard;
exports.AuthTenantGuard = AuthTenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [core_1.Reflector])
], AuthTenantGuard);
