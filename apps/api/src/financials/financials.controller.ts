import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { FinancialsService } from "./financials.service";

@Controller("api/v1/financials")
@UseGuards(AuthTenantGuard)
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  @Get("cashflow")
  @RequirePermission("sales.read")
  public async getCashflow(
    @Req() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.financialsService.getCashflowSummary(req.userContext, startDate, endDate);
  }
}
