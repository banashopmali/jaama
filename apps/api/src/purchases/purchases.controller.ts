import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission, AuthenticatedRequest } from "../common/auth-tenant.guard";
import { PurchasesService, CreatePurchaseDto, ReceivePurchaseDto } from "./purchases.service";

@Controller("api/v1/purchases")
@UseGuards(AuthTenantGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @RequirePermission("purchases.manage")
  public async createPurchase(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePurchaseDto
  ) {
    return this.purchasesService.createPurchase(req.userContext, dto);
  }

  @Post(":id/receive")
  @RequirePermission("purchases.manage")
  public async receivePurchase(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: ReceivePurchaseDto
  ) {
    return this.purchasesService.receivePurchase(req.userContext, id, dto);
  }

  @Get()
  @RequirePermission("purchases.read")
  public async listPurchases(
    @Req() req: AuthenticatedRequest,
    @Query("supplierId") supplierId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.purchasesService.listPurchases(req.userContext, {
      supplierId,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("purchases.read")
  public async getPurchase(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.purchasesService.getPurchase(req.userContext, id);
  }
}
