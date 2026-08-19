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
import { ExpensesService, CreateExpenseDto } from "./expenses.service";

@Controller("api/v1/expenses")
@UseGuards(AuthTenantGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermission("expenses.manage")
  public async createExpense(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateExpenseDto
  ) {
    return this.expensesService.createExpense(req.userContext, dto);
  }

  @Get()
  @RequirePermission("expenses.read")
  public async listExpenses(
    @Req() req: AuthenticatedRequest,
    @Query("category") category?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.expensesService.listExpenses(req.userContext, {
      category,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("expenses.read")
  public async getExpense(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.expensesService.getExpense(req.userContext, id);
  }
}
