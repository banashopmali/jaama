import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { CustomersService } from "./customers.service";

@Controller("api/v1/customers")
@UseGuards(AuthTenantGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission("customers.read")
  public async listCustomers(@Req() req: any) {
    return this.customersService.listCustomers(req.userContext);
  }

  @Get(":id")
  @RequirePermission("customers.read")
  public async getCustomer(@Req() req: any, @Param("id") id: string) {
    return this.customersService.getCustomerDetail(req.userContext, id);
  }

  @Post()
  @RequirePermission("customers.manage")
  public async createCustomer(@Req() req: any, @Body() dto: any) {
    return this.customersService.createCustomer(req.userContext, dto);
  }

  @Put(":id")
  @RequirePermission("customers.manage")
  public async updateCustomer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    return this.customersService.updateCustomer(req.userContext, id, dto);
  }
}
