import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission, AuthenticatedRequest } from "../common/auth-tenant.guard";
import { InventoryService, RecordStockAdjustmentDto } from "./inventory.service";

@Controller("api/v1/inventory")
@UseGuards(AuthTenantGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermission("inventory.read")
  public async listInventory(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: "normal" | "low" | "out_of_stock",
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.inventoryService.listInventory(req.userContext, {
      status,
      category,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post("adjustments")
  @RequirePermission("inventory.adjust")
  public async recordAdjustment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RecordStockAdjustmentDto
  ) {
    return this.inventoryService.recordAdjustment(req.userContext, dto);
  }

  @Get("movements")
  @RequirePermission("inventory.read")
  public async getStockMovements(
    @Req() req: AuthenticatedRequest,
    @Query("productId") productId?: string,
    @Query("limit") limit?: string
  ) {
    return this.inventoryService.getStockMovements(
      req.userContext,
      productId,
      limit ? parseInt(limit, 10) : 50
    );
  }
}
