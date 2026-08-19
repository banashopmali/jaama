import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Optional,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { PaymentsService, RecordPaymentDto } from "./payments.service";

@Controller("api/v1")
@UseGuards(AuthTenantGuard)
export class PaymentsController {
  private readonly paymentsService: PaymentsService;

  constructor(@Optional() paymentsService?: PaymentsService) {
    this.paymentsService = paymentsService || new PaymentsService();
  }


  @Get("payments/receivables")
  @RequirePermission("payments.read")
  public async listReceivables(
    @Req() req: any,
    @Query("search") search?: string,
    @Query("customerId") customerId?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    return this.paymentsService.listReceivables(req.userContext, {
      search,
      customerId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get("sales/:saleId/payments")
  @RequirePermission("payments.read")
  public async getSalePayments(
    @Req() req: any,
    @Param("saleId") saleId: string
  ) {
    return this.paymentsService.getSalePayments(req.userContext, saleId);
  }

  @Post("sales/:saleId/payments")
  @RequirePermission("payments.record")
  public async recordSalePayment(
    @Req() req: any,
    @Param("saleId") saleId: string,
    @Body() dto: RecordPaymentDto
  ) {
    return this.paymentsService.recordSalePayment(req.userContext, saleId, dto);
  }

  @Post("payments")
  @RequirePermission("payments.record")
  public async recordPayment(
    @Req() req: any,
    @Body() dto: RecordPaymentDto & { saleId?: string }
  ) {
    const saleId = dto.saleId || req.params?.saleId;
    if (!saleId) {
      const { BadRequestException } = await import("@nestjs/common");
      throw new BadRequestException("L'identifiant de la vente (saleId) est obligatoire.");
    }
    return this.paymentsService.recordSalePayment(req.userContext, saleId, dto);
  }
}

