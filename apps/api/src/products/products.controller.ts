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
import { ProductsService, CreateProductDto, UpdateProductDto } from "./products.service";

@Controller("api/v1/products")
@UseGuards(AuthTenantGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermission("products.manage")
  public async createProduct(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductDto
  ) {
    const product = await this.productsService.createProduct(req.userContext, dto);
    return product;
  }

  @Get()
  @RequirePermission("products.read")
  public async listProducts(
    @Req() req: AuthenticatedRequest,
    @Query("category") category?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.productsService.listProducts(req.userContext, {
      category,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @RequirePermission("products.read")
  public async getProduct(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.productsService.getProduct(req.userContext, id);
  }

  @Put(":id")
  @RequirePermission("products.manage")
  public async updateProduct(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.productsService.updateProduct(req.userContext, id, dto);
  }

  @Patch(":id/archive")
  @RequirePermission("products.manage")
  public async archiveProduct(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.productsService.archiveProduct(req.userContext, id);
  }
}
