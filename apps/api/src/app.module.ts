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
import { CorrelationMiddleware } from "./common/correlation.middleware";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { AuthTenantGuard } from "./common/auth-tenant.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // 100 requests per minute per IP
      },
    ]),
    ProductsModule,
    InventoryModule,
    CustomersModule,
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
