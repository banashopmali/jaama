import { Controller, Get, Put, Body, Req, UseGuards } from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { SettingsService, UpdateSettingsDto } from "./settings.service";

@Controller("api/v1/organization/settings")
@UseGuards(AuthTenantGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission("products.read")
  public async getSettings(@Req() req: any) {
    return this.settingsService.getSettings(req.userContext);
  }

  @Put()
  @RequirePermission("organization.manage")
  public async updateSettings(@Req() req: any, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(req.userContext, dto);
  }
}
