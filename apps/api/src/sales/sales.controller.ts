import { Controller, Post, Body, Req, UseGuards, Get, Param, NotFoundException, Optional } from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { SalesService } from "./sales.service";
import { UserContext } from "@jaama/types";

@Controller("api/v1/sales")
@UseGuards(AuthTenantGuard)
export class SalesController {
  private service: SalesService;

  public constructor(@Optional() salesService?: SalesService) {
    this.service = salesService || new SalesService();
  }

  @Post()
  @RequirePermission("sales.create")
  public async createSale(@Req() req: any, @Body() body: any) {
    const userContext = req.userContext as UserContext;
    return this.service.createSale(userContext, body);
  }

  @Get(":id")
  @RequirePermission("sales.read")
  public async getSale(@Req() req: any, @Param("id") id: string) {
    const userContext = req.userContext as UserContext;
    const sale = await this.service.getSale(userContext, id);
    if (!sale) {
      throw new NotFoundException("Vente introuvable.");
    }
    return sale;
  }
}
