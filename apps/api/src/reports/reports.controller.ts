import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { ReportsService } from "./reports.service";

@Controller("api/v1/reports")
@UseGuards(AuthTenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("sales")
  @RequirePermission("reports.read")
  public async getSalesReport(
    @Req() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.reportsService.getSalesReport(req.userContext, startDate, endDate);
  }

  @Get("anomalies")
  @RequirePermission("reports.read")
  public async getAnomalies(@Req() req: any) {
    return this.reportsService.auditStockAnomalies(req.userContext);
  }
}
