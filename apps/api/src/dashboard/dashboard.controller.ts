import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { DashboardService } from "./dashboard.service";

@Controller("api/v1/dashboard")
@UseGuards(AuthTenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @RequirePermission("sales.read")
  public async getSummary(
    @Req() req: any,
    @Query("period") period?: "today" | "7d" | "30d"
  ): Promise<any> {
    return this.dashboardService.getSummary(req.userContext, period || "today");
  }
}
