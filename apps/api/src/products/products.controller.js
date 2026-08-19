"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const auth_tenant_guard_1 = require("../common/auth-tenant.guard");
const products_service_1 = require("./products.service");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async createProduct(req, dto) {
        const product = await this.productsService.createProduct(req.userContext, dto);
        return product;
    }
    async listProducts(req, category, status, search, page, limit) {
        return this.productsService.listProducts(req.userContext, {
            category,
            status,
            search,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async getProduct(req, id) {
        return this.productsService.getProduct(req.userContext, id);
    }
    async updateProduct(req, id, dto) {
        return this.productsService.updateProduct(req.userContext, id, dto);
    }
    async archiveProduct(req, id) {
        return this.productsService.archiveProduct(req.userContext, id);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, auth_tenant_guard_1.RequirePermission)("products.manage"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Get)(),
    (0, auth_tenant_guard_1.RequirePermission)("products.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("category")),
    __param(2, (0, common_1.Query)("status")),
    __param(3, (0, common_1.Query)("search")),
    __param(4, (0, common_1.Query)("page")),
    __param(5, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "listProducts", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, auth_tenant_guard_1.RequirePermission)("products.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, auth_tenant_guard_1.RequirePermission)("products.manage"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Patch)(":id/archive"),
    (0, auth_tenant_guard_1.RequirePermission)("products.manage"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "archiveProduct", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)("api/v1/products"),
    (0, common_1.UseGuards)(auth_tenant_guard_1.AuthTenantGuard),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
