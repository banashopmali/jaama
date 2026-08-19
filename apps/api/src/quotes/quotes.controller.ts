import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission, AuthenticatedRequest } from "../common/auth-tenant.guard";
import { QuotesService, CreateQuoteDto } from "./quotes.service";

@Controller("api/v1/quotes")
@UseGuards(AuthTenantGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @RequirePermission("quotes.manage")
  public async createQuote(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateQuoteDto
  ) {
    return this.quotesService.createQuote(req.userContext, dto);
  }

  @Get()
  @RequirePermission("quotes.read")
  public async listQuotes(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("customerId") customerId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.quotesService.listQuotes(req.userContext, {
      status,
      customerId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("quotes.read")
  public async getQuote(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.quotesService.getQuote(req.userContext, id);
  }

  @Patch(":id/status")
  @RequirePermission("quotes.manage")
  public async updateQuoteStatus(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body("status") status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"
  ) {
    return this.quotesService.updateQuoteStatus(req.userContext, id, status);
  }
}
