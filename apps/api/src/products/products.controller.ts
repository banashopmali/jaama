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
  Optional,
  Header,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { ProductsService } from "./products.service";

@Controller("api/v1/products")
@UseGuards(AuthTenantGuard)
export class ProductsController {
  private readonly productsService: ProductsService;

  constructor(@Optional() productsService?: ProductsService) {
    this.productsService = productsService || new ProductsService();
  }


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

  @Get("export")
  @RequirePermission("exports.read")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="produits-jaama.csv"')
  public async exportProductsCsv(@Req() req: any) {
    const { DataExchangeService } = await import("../data-exchange/data-exchange.service");
    const service = new DataExchangeService();
    return service.exportProductsCsv(req.userContext);
  }

  @Post("import")
  @RequirePermission("imports.manage")
  public async importProductsCsv(@Req() req: any, @Body("items") items: any[]) {
    const { DataExchangeService } = await import("../data-exchange/data-exchange.service");
    const service = new DataExchangeService();
    return service.importProductsBulk(req.userContext, items);
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
