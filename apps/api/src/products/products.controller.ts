import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { ProductsService } from "./products.service";

@Controller("api/v1/products")
@UseGuards(AuthTenantGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission("products.read")
  public async listProducts(
    @Req() req: any,
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("status") status?: string
  ) {
    return this.productsService.listProducts(req.userContext, { search, category, status });
  }

  @Get(":id")
  @RequirePermission("products.read")
  public async getProduct(@Req() req: any, @Param("id") id: string) {
    return this.productsService.getProduct(req.userContext, id);
  }

  @Post()
  @RequirePermission("products.manage")
  public async createProduct(@Req() req: any, @Body() dto: any) {
    return this.productsService.createProduct(req.userContext, dto);
  }

  @Put(":id")
  @RequirePermission("products.manage")
  public async updateProduct(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    return this.productsService.updateProduct(req.userContext, id, dto);
  }

  @Delete(":id")
  @RequirePermission("products.manage")
  public async archiveProduct(@Req() req: any, @Param("id") id: string) {
    return this.productsService.archiveProduct(req.userContext, id);
  }
}
