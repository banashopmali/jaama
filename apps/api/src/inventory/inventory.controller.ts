import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { InventoryService } from "./inventory.service";

@Controller("api/v1/inventory")
@UseGuards(AuthTenantGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("balances")
  @RequirePermission("inventory.read")
  public async getBalances(@Req() req: any) {
    return this.inventoryService.listInventory(req.userContext);
  }

  @Get("movements/:productId")
  @RequirePermission("inventory.read")
  public async getMovementsHistory(
    @Req() req: any,
    @Param("productId") productId: string
  ) {
    return this.inventoryService.getStockMovements(req.userContext, productId);
  }

  @Post("adjustments")
  @RequirePermission("inventory.adjust")
  public async recordAdjustment(
    @Req() req: any,
    @Body() dto: any
  ) {
    return this.inventoryService.recordAdjustment(req.userContext, dto);
  }
}
