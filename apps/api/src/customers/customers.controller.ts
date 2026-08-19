import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission, AuthenticatedRequest } from "../common/auth-tenant.guard";
import { CustomersService, CreateCustomerDto, UpdateCustomerDto } from "./customers.service";

@Controller("api/v1/customers")
@UseGuards(AuthTenantGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermission("customers.manage")
  public async createCustomer(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto
  ) {
    return this.customersService.createCustomer(req.userContext, dto);
  }

  @Get()
  @RequirePermission("customers.read")
  public async listCustomers(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.customersService.listCustomers(req.userContext, {
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("customers.read")
  public async getCustomerDetail(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.customersService.getCustomerDetail(req.userContext, id);
  }

  @Put(":id")
  @RequirePermission("customers.manage")
  public async updateCustomer(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto
  ) {
    return this.customersService.updateCustomer(req.userContext, id, dto);
  }

  @Patch(":id/archive")
  @RequirePermission("customers.manage")
  public async archiveCustomer(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.customersService.archiveCustomer(req.userContext, id);
  }
}
