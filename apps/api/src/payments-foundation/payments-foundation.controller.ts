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
import { PaymentIntentService } from "./payment-intent.service";
import type {
  CreatePaymentIntentDto,
  CreatePaymentAttemptDto,
} from "./payment-intent.service";
import { SettlementService } from "./settlement.service";
import type {
  CreateSettlementDto,
  ReconcileTransactionDto,
} from "./settlement.service";
import type { SettlementStatus } from "./provider.interface";

@Controller("api/v1/payments-foundation")
@UseGuards(AuthTenantGuard)
export class PaymentsFoundationController {
  constructor(
    @Optional() private readonly intentService?: PaymentIntentService,
    @Optional() private readonly settlementService?: SettlementService
  ) {}

  @Post("intents")
  @RequirePermission("payments.record")
  public async createIntent(@Req() req: any, @Body() dto: CreatePaymentIntentDto) {
    return this.intentService!.createPaymentIntent(req.userContext, dto);
  }

  @Get("intents/:id")
  @RequirePermission("payments.read")
  public async getIntent(@Req() req: any, @Param("id") id: string) {
    return this.intentService!.getPaymentIntent(req.userContext, id);
  }

  @Post("intents/:id/attempts")
  @RequirePermission("payments.record")
  public async createAttempt(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: CreatePaymentAttemptDto
  ) {
    return this.intentService!.createPaymentAttempt(req.userContext, id, dto);
  }

  @Post("intents/:id/cancel")
  @RequirePermission("payments.record")
  public async cancelIntent(@Req() req: any, @Param("id") id: string) {
    return this.intentService!.cancelPaymentIntent(req.userContext, id);
  }

  @Post("settlements")
  @RequirePermission("payments.record")
  public async createSettlement(@Req() req: any, @Body() dto: CreateSettlementDto) {
    return this.settlementService!.createSettlement(req.userContext, dto);
  }

  @Get("settlements")
  @RequirePermission("payments.read")
  public async listSettlements(@Req() req: any) {
    return this.settlementService!.listSettlements(req.userContext);
  }

  @Post("settlements/:id/status")
  @RequirePermission("payments.record")
  public async updateSettlementStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { status: SettlementStatus; settledAmountMinor?: number }
  ) {
    return this.settlementService!.updateSettlementStatus(
      req.userContext,
      id,
      body.status,
      body.settledAmountMinor
    );
  }

  @Post("reconcile")
  @RequirePermission("payments.record")
  public async reconcileRecord(@Req() req: any, @Body() dto: ReconcileTransactionDto) {
    return this.settlementService!.reconcileRecord(req.userContext, dto);
  }
}
