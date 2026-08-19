import { Controller, Post, Get, Body, Req, Res, UnauthorizedException, Optional } from "@nestjs/common";
import { AuthService, RegisterDto, LoginDto } from "./auth.service";

export function extractTokenFromReq(req: any): string {
  if (req.cookies && req.cookies.jaama_session) {
    return req.cookies.jaama_session;
  }
  const cookieHeader = req.headers["cookie"];
  if (typeof cookieHeader === "string") {
    const match = cookieHeader.match(/jaama_session=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  const authHeader = req.headers["authorization"] || req.headers["x-session-token"];
  if (typeof authHeader === "string") {
    return authHeader.replace(/^Bearer\s+/i, "").trim();
  }
  return "";
}

@Controller("api/v1/auth")
export class AuthController {
  private service: AuthService;

  public constructor(@Optional() authService?: AuthService) {
    this.service = authService || new AuthService();
  }

  @Post("register")
  public async register(@Body() body: RegisterDto) {
    return this.service.register(body);
  }

  @Post("login")
  public async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.service.login(body);
    const token = result.session.token;

    res.cookie("jaama_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post("logout")
  public async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const token = extractTokenFromReq(req);
    const revoked = await this.service.logout(token);

    res.cookie("jaama_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return { success: revoked };
  }

  @Get("me")
  public async getMe(@Req() req: any) {
    const token = extractTokenFromReq(req);
    const ctx = await this.service.validateToken(token);
    if (!ctx) {
      throw new UnauthorizedException("Session invalide ou expirée.");
    }

    const { prisma: defaultPrisma, PrismaMembershipRepository } = await import("@jaama/database");
    const { getRolePermissions } = await import("@jaama/auth");
    const membershipRepo = new PrismaMembershipRepository(defaultPrisma);

    const orgId = (req.headers["x-organization-id"] || req.query?.organizationId) as string | undefined;

    if (orgId) {
      const membership = await membershipRepo.findByOrganizationAndUser(orgId, ctx.user.id);
      if (membership && membership.status === "active") {
        return {
          ...ctx,
          organizationId: orgId,
          role: membership.role,
          permissions: getRolePermissions(membership.role as any),
        };
      }
    }

    const activeMemberships = await defaultPrisma.membership.findMany({
      where: { userId: ctx.user.id, status: "active" },
      take: 1,
    });

    if (activeMemberships.length > 0) {
      const activeMem = activeMemberships[0];
      return {
        ...ctx,
        organizationId: activeMem.organizationId,
        role: activeMem.role,
        permissions: getRolePermissions(activeMem.role as any),
      };
    }

    return ctx;
  }
}
