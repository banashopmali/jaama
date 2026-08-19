import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { SearchService } from "./search.service";

@Controller("api/v1/search")
@UseGuards(AuthTenantGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermission("products.read")
  public async search(@Req() req: any, @Query("q") q: string) {
    return this.searchService.searchAll(req.userContext, q);
  }
}
