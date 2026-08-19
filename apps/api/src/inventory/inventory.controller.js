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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const auth_tenant_guard_1 = require("../common/auth-tenant.guard");
const inventory_service_1 = require("./inventory.service");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async listInventory(req, status, category, search, page, limit) {
        return this.inventoryService.listInventory(req.userContext, {
            status,
            category,
            search,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async recordAdjustment(req, dto) {
        return this.inventoryService.recordAdjustment(req.userContext, dto);
    }
    async getStockMovements(req, productId, limit) {
        return this.inventoryService.getStockMovements(req.userContext, productId, limit ? parseInt(limit, 10) : 50);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_tenant_guard_1.RequirePermission)("inventory.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("category")),
    __param(3, (0, common_1.Query)("search")),
    __param(4, (0, common_1.Query)("page")),
    __param(5, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listInventory", null);
__decorate([
    (0, common_1.Post)("adjustments"),
    (0, auth_tenant_guard_1.RequirePermission)("inventory.adjust"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "recordAdjustment", null);
__decorate([
    (0, common_1.Get)("movements"),
    (0, auth_tenant_guard_1.RequirePermission)("inventory.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("productId")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockMovements", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)("api/v1/inventory"),
    (0, common_1.UseGuards)(auth_tenant_guard_1.AuthTenantGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
