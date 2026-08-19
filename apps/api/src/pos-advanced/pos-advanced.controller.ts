import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission, AuthenticatedRequest } from "../common/auth-tenant.guard";
import { PosAdvancedService, RecordSalePaymentDto, ReturnSaleDto } from "./pos-advanced.service";

@Controller("api/v1/pos")
@UseGuards(AuthTenantGuard)
export class PosAdvancedController {
  constructor(private readonly posAdvancedService: PosAdvancedService) {}

  @Post("sales/:id/payments")
  @RequirePermission("sales.manage")
  public async recordSalePayment(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: RecordSalePaymentDto
  ) {
    return this.posAdvancedService.recordSalePayment(req.userContext, id, dto);
  }

  @Post("sales/:id/return")
  @RequirePermission("sales.manage")
  public async returnSale(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: ReturnSaleDto
  ) {
    return this.posAdvancedService.returnSale(req.userContext, id, dto);
  }

  @Get("sales/:id/receipt-text")
  @RequirePermission("sales.read")
  public async getReceiptText(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    const text = await this.posAdvancedService.generateReceiptText(req.userContext, id);
    return { receiptText: text };
  }
}
