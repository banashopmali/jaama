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
import { SuppliersService } from "./suppliers.service";

@Controller("api/v1/suppliers")
@UseGuards(AuthTenantGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission("suppliers.read")
  public async listSuppliers(@Req() req: any) {
    return this.suppliersService.listSuppliers(req.userContext);
  }

  @Get(":id")
  @RequirePermission("suppliers.read")
  public async getSupplier(@Req() req: any, @Param("id") id: string) {
    return this.suppliersService.getSupplier(req.userContext, id);
  }

  @Post()
  @RequirePermission("suppliers.manage")
  public async createSupplier(@Req() req: any, @Body() dto: any) {
    return this.suppliersService.createSupplier(req.userContext, dto);
  }

  @Put(":id")
  @RequirePermission("suppliers.manage")
  public async updateSupplier(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    return this.suppliersService.updateSupplier(req.userContext, id, dto);
  }
}
