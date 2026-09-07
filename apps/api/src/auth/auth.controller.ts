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
  public async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: any) {
    const result = await this.service.register(body);
    const token = result.session.token;

    res.cookie("jaama_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt,
      },
    };
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

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt,
      },
    };
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

    let targetMembership: any = null;
    if (orgId) {
      const m = await membershipRepo.findByOrganizationAndUser(orgId, ctx.user.id);
      if (m && m.status === "active") {
        targetMembership = m;
      }
    }

    if (!targetMembership) {
      const activeMemberships = await defaultPrisma.membership.findMany({
        where: { userId: ctx.user.id, status: "active" },
        orderBy: { createdAt: "asc" },
        take: 1,
      });
      if (activeMemberships.length > 0) {
        targetMembership = activeMemberships[0];
      }
    }

    if (!targetMembership) {
      return {
        user: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
        },
        organization: null,
        organizationId: null,
        role: null,
        permissions: [],
      };
    }

    const organization = await defaultPrisma.organization.findUnique({
      where: { id: targetMembership.organizationId },
    });

    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            status: organization.status,
          }
        : null,
      organizationId: targetMembership.organizationId,
      role: targetMembership.role,
      permissions: getRolePermissions(targetMembership.role as any),
    };
  }
}
