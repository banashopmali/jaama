import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission, AuthenticatedRequest } from "../common/auth-tenant.guard";
import { SuppliersService, CreateSupplierDto, UpdateSupplierDto } from "./suppliers.service";

@Controller("api/v1/suppliers")
@UseGuards(AuthTenantGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermission("suppliers.manage")
  public async createSupplier(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSupplierDto
  ) {
    return this.suppliersService.createSupplier(req.userContext, dto);
  }

  @Get()
  @RequirePermission("suppliers.read")
  public async listSuppliers(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.suppliersService.listSuppliers(req.userContext, {
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("suppliers.read")
  public async getSupplier(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.suppliersService.getSupplier(req.userContext, id);
  }

  @Patch(":id")
  @RequirePermission("suppliers.manage")
  public async updateSupplier(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateSupplierDto
  ) {
    return this.suppliersService.updateSupplier(req.userContext, id, dto);
  }

  @Delete(":id")
  @RequirePermission("suppliers.manage")
  public async archiveSupplier(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.suppliersService.archiveSupplier(req.userContext, id);
  }
}
