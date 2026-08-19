import { Controller, Post, Body, Req, UseGuards, Get, Param, Query, NotFoundException, Optional } from "@nestjs/common";
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

  @Get()
  @RequirePermission("sales.read")
  public async listSales(
    @Req() req: any,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("customerId") customerId?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("sellerUserId") sellerUserId?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    const userContext = req.userContext as UserContext;
    return this.service.listSales(userContext, {
      search,
      startDate,
      endDate,
      customerId,
      paymentStatus,
      sellerUserId,
      paymentMethod,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
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
