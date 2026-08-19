import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { ReconciliationService } from "./reconciliation.service";

@Controller("api/v1/reconciliation")
@UseGuards(AuthTenantGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get("check")
  @RequirePermission("organization.manage")
  public async runDiagnosticCheck(@Req() req: any) {
    return this.reconciliationService.runDiagnosticCheck(req.userContext);
  }
}
