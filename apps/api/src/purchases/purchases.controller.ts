import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Optional,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { PurchasesService, CreatePurchaseDto, ReceivePurchaseDto } from "./purchases.service";

@Controller("api/v1/purchases")
@UseGuards(AuthTenantGuard)
export class PurchasesController {
  private readonly purchasesService: PurchasesService;

  constructor(@Optional() purchasesService?: PurchasesService) {
    this.purchasesService = purchasesService || new PurchasesService();
  }


  @Get()
  @RequirePermission("purchases.read")
  public async listPurchases(@Req() req: any) {
    return this.purchasesService.listPurchases(req.userContext);
  }

  @Get(":id")
  @RequirePermission("purchases.read")
  public async getPurchase(@Req() req: any, @Param("id") id: string) {
    return this.purchasesService.getPurchase(req.userContext, id);
  }

  @Post()
  @RequirePermission("purchases.manage")
  public async createPurchase(@Req() req: any, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.createPurchase(req.userContext, dto);
  }

  @Post(":id/receive")
  @RequirePermission("purchases.receive")
  public async receivePurchase(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: ReceivePurchaseDto
  ) {
    return this.purchasesService.receivePurchase(req.userContext, id, dto);
  }
}
