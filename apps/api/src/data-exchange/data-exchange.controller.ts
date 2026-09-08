import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Header,
  Optional,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { DataExchangeService, ImportProductItem, ImportCustomerItem } from "./data-exchange.service";

@Controller("api/v1")
@UseGuards(AuthTenantGuard)
export class DataExchangeController {
  private readonly dataExchangeService: DataExchangeService;

  constructor(@Optional() dataExchangeService?: DataExchangeService) {
    this.dataExchangeService = dataExchangeService || new DataExchangeService();
  }

  @Get("products/export")
  @RequirePermission("exports.read")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="produits-jaama.csv"')
  public async exportProducts(@Req() req: any) {
    return this.dataExchangeService.exportProductsCsv(req.userContext);
  }

  @Get("data-exchange/products/export-csv")
  @RequirePermission("exports.read")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="produits-jaama.csv"')
  public async exportProductsCsvAlias(@Req() req: any) {
    return this.dataExchangeService.exportProductsCsv(req.userContext);
  }

  @Post("imports/products/preview")
  @RequirePermission("imports.manage")
  @UseInterceptors(FileInterceptor("file"))
  public async previewProductsImport(
    @Req() req: any,
    @UploadedFile() file?: any,
    @Body("csvContent") csvContentBody?: string
  ) {
    const csvText = file ? file.buffer.toString("utf-8") : csvContentBody || "";
    const fileName = file ? file.originalname : "products.csv";
    return this.dataExchangeService.previewProductsImport(req.userContext, csvText, fileName);
  }

  @Post("imports/products/:batchId/confirm")
  @RequirePermission("imports.manage")
  public async confirmProductsImport(
    @Req() req: any,
    @Param("batchId") batchId: string,
    @Body("idempotencyKey") idempotencyKey: string
  ) {
    return this.dataExchangeService.confirmProductsImport(req.userContext, batchId, idempotencyKey);
  }

  @Post("imports/customers/preview")
  @RequirePermission("imports.manage")
  @UseInterceptors(FileInterceptor("file"))
  public async previewCustomersImport(
    @Req() req: any,
    @UploadedFile() file?: any,
    @Body("csvContent") csvContentBody?: string
  ) {
    const csvText = file ? file.buffer.toString("utf-8") : csvContentBody || "";
    const fileName = file ? file.originalname : "customers.csv";
    return this.dataExchangeService.previewCustomersImport(req.userContext, csvText, fileName);
  }

  @Post("imports/customers/:batchId/confirm")
  @RequirePermission("imports.manage")
  public async confirmCustomersImport(
    @Req() req: any,
    @Param("batchId") batchId: string,
    @Body("idempotencyKey") idempotencyKey: string
  ) {
    return this.dataExchangeService.confirmCustomersImport(req.userContext, batchId, idempotencyKey);
  }

  @Post("products/import")
  @RequirePermission("imports.manage")
  public async importProducts(
    @Req() req: any,
    @Body("items") items: ImportProductItem[],
    @Body("idempotencyKey") idempotencyKey?: string
  ) {
    return this.dataExchangeService.importProductsBulk(req.userContext, items, idempotencyKey);
  }

  @Post("data-exchange/products/import")
  @RequirePermission("imports.manage")
  public async importProductsAlias(
    @Req() req: any,
    @Body("items") items: ImportProductItem[],
    @Body("idempotencyKey") idempotencyKey?: string
  ) {
    return this.dataExchangeService.importProductsBulk(req.userContext, items, idempotencyKey);
  }

  @Get("customers/export")
  @RequirePermission("exports.read")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="clients-jaama.csv"')
  public async exportCustomers(@Req() req: any) {
    return this.dataExchangeService.exportCustomersCsv(req.userContext);
  }

  @Post("customers/import")
  @RequirePermission("imports.manage")
  public async importCustomers(
    @Req() req: any,
    @Body("items") items: ImportCustomerItem[],
    @Body("idempotencyKey") idempotencyKey?: string
  ) {
    return this.dataExchangeService.importCustomersBulk(req.userContext, items, idempotencyKey);
  }
}
