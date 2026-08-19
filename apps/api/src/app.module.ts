import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { HealthController } from "./health/health.controller";
import { SalesController } from "./sales/sales.controller";
import { SalesService } from "./sales/sales.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ProductsModule } from "./products/products.module";
import { InventoryModule } from "./inventory/inventory.module";
import { CustomersModule } from "./customers/customers.module";
import { QuotesModule } from "./quotes/quotes.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PaymentsModule } from "./payments/payments.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { PosAdvancedModule } from "./pos-advanced/pos-advanced.module";
import { FinancialsModule } from "./financials/financials.module";
import { ReportsModule } from "./reports/reports.module";
import { DataExchangeModule } from "./data-exchange/data-exchange.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SearchModule } from "./search/search.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { TeamModule } from "./team/team.module";
import { SettingsModule } from "./settings/settings.module";
import { ReconciliationModule } from "./reconciliation/reconciliation.module";
import { CorrelationMiddleware } from "./common/correlation.middleware";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { AuthTenantGuard } from "./common/auth-tenant.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DataExchangeModule,
    ProductsModule,
    InventoryModule,
    CustomersModule,
    QuotesModule,
    InvoicesModule,
    PaymentsModule,
    ExpensesModule,
    SuppliersModule,
    PurchasesModule,
    PosAdvancedModule,
    FinancialsModule,
    ReportsModule,
    DashboardModule,
    SearchModule,
    NotificationsModule,
    TeamModule,
    SettingsModule,
    ReconciliationModule,
  ],
  controllers: [HealthController, SalesController, AuthController],
  providers: [
    SalesService,
    AuthService,
    AuthTenantGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes("*");
  }
}
