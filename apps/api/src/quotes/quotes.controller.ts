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
import { QuotesService } from "./quotes.service";

@Controller("api/v1/quotes")
@UseGuards(AuthTenantGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @RequirePermission("quotes.read")
  public async listQuotes(@Req() req: any) {
    return this.quotesService.listQuotes(req.userContext);
  }

  @Get(":id")
  @RequirePermission("quotes.read")
  public async getQuote(@Req() req: any, @Param("id") id: string) {
    return this.quotesService.getQuote(req.userContext, id);
  }

  @Post()
  @RequirePermission("quotes.manage")
  public async createQuote(@Req() req: any, @Body() dto: any) {
    return this.quotesService.createQuote(req.userContext, dto);
  }
}
