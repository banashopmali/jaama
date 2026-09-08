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
import { ExpensesService } from "./expenses.service";

@Controller("api/v1/expenses")
@UseGuards(AuthTenantGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @RequirePermission("expenses.read")
  public async listExpenses(@Req() req: any) {
    return this.expensesService.listExpenses(req.userContext);
  }

  @Get(":id")
  @RequirePermission("expenses.read")
  public async getExpense(@Req() req: any, @Param("id") id: string) {
    return this.expensesService.getExpense(req.userContext, id);
  }

  @Post()
  @RequirePermission("expenses.manage")
  public async createExpense(@Req() req: any, @Body() dto: any) {
    return this.expensesService.createExpense(req.userContext, dto);
  }
}
