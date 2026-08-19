import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { NotificationsService } from "./notifications.service";

@Controller("api/v1/notifications")
@UseGuards(AuthTenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission("products.read")
  public async getNotifications(@Req() req: any) {
    return this.notificationsService.getNotifications(req.userContext);
  }
}
