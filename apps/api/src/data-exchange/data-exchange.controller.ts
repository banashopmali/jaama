import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Header,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { DataExchangeService, ImportProductItem } from "./data-exchange.service";

@Controller("api/v1/data-exchange")
@UseGuards(AuthTenantGuard)
export class DataExchangeController {
  constructor(private readonly dataExchangeService: DataExchangeService) {}

  @Get("products/export-csv")
  @RequirePermission("exports.read")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="produits-jaama.csv"')
  public async exportProductsCsv(@Req() req: any) {
    return this.dataExchangeService.exportProductsCsv(req.userContext);
  }

  @Post("products/import")
  @RequirePermission("imports.manage")
  public async importProducts(
    @Req() req: any,
    @Body("items") items: ImportProductItem[]
  ) {
    return this.dataExchangeService.importProductsBulk(req.userContext, items);
  }
}
