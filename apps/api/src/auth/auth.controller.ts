import { Controller, Post, Get, Body, Req, UnauthorizedException, Optional } from "@nestjs/common";
import { AuthService, RegisterDto, LoginDto } from "./auth.service";

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
  public async login(@Body() body: LoginDto) {
    return this.service.login(body);
  }

  @Post("logout")
  public async logout(@Req() req: any) {
    const authHeader = req.headers["authorization"] || req.headers["x-session-token"];
    const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    const revoked = await this.service.logout(token);
    return { success: revoked };
  }

  @Get("me")
  public async getMe(@Req() req: any) {
    const authHeader = req.headers["authorization"] || req.headers["x-session-token"];
    const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    const ctx = await this.service.validateToken(token);
    if (!ctx) {
      throw new UnauthorizedException("Session invalide ou expirée.");
    }
    return ctx;
  }
}
