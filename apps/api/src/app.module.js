"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const health_controller_1 = require("./health/health.controller");
const sales_controller_1 = require("./sales/sales.controller");
const sales_service_1 = require("./sales/sales.service");
const auth_controller_1 = require("./auth/auth.controller");
const auth_service_1 = require("./auth/auth.service");
const products_module_1 = require("./products/products.module");
const inventory_module_1 = require("./inventory/inventory.module");
const customers_module_1 = require("./customers/customers.module");
const correlation_middleware_1 = require("./common/correlation.middleware");
const global_exception_filter_1 = require("./common/global-exception.filter");
const auth_tenant_guard_1 = require("./common/auth-tenant.guard");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(correlation_middleware_1.CorrelationMiddleware).forRoutes("*");
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100, // 100 requests per minute per IP
                },
            ]),
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            customers_module_1.CustomersModule,
        ],
        controllers: [health_controller_1.HealthController, sales_controller_1.SalesController, auth_controller_1.AuthController],
        providers: [
            sales_service_1.SalesService,
            auth_service_1.AuthService,
            auth_tenant_guard_1.AuthTenantGuard,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
        ],
    })
], AppModule);
