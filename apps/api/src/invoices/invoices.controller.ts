import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { InvoicesService } from "./invoices.service";

@Controller("api/v1/invoices")
@UseGuards(AuthTenantGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission("invoices.read")
  public async listInvoices(@Req() req: any) {
    return this.invoicesService.listInvoices(req.userContext);
  }

  @Get(":id")
  @RequirePermission("invoices.read")
  public async getInvoice(@Req() req: any, @Param("id") id: string) {
    return this.invoicesService.getInvoice(req.userContext, id);
  }

  @Post("from-quote/:quoteId")
  @RequirePermission("invoices.manage")
  public async convertQuoteToInvoice(
    @Req() req: any,
    @Param("quoteId") quoteId: string
  ) {
    return this.invoicesService.convertQuoteToInvoice(req.userContext, quoteId);
  }
}
