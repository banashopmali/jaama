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
import { InvoicesService, CreateInvoiceDto } from "./invoices.service";

@Controller("api/v1/invoices")
@UseGuards(AuthTenantGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermission("invoices.manage")
  public async createInvoice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvoiceDto
  ) {
    return this.invoicesService.createInvoice(req.userContext, dto);
  }

  @Post("from-quote/:quoteId")
  @RequirePermission("invoices.manage")
  public async convertQuoteToInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("quoteId") quoteId: string,
    @Body("dueDate") dueDate?: string
  ) {
    return this.invoicesService.convertQuoteToInvoice(req.userContext, quoteId, dueDate);
  }

  @Get()
  @RequirePermission("invoices.read")
  public async listInvoices(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("customerId") customerId?: string,
    @Query("saleId") saleId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.invoicesService.listInvoices(req.userContext, {
      status,
      customerId,
      saleId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("invoices.read")
  public async getInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.invoicesService.getInvoice(req.userContext, id);
  }
}
