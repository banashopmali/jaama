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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const auth_tenant_guard_1 = require("../common/auth-tenant.guard");
const sales_service_1 = require("./sales.service");
let SalesController = class SalesController {
    service;
    constructor(salesService) {
        this.service = salesService || new sales_service_1.SalesService();
    }
    async createSale(req, body) {
        const userContext = req.userContext;
        return this.service.createSale(userContext, body);
    }
    async getSale(req, id) {
        const userContext = req.userContext;
        const sale = await this.service.getSale(userContext, id);
        if (!sale) {
            throw new common_1.NotFoundException("Vente introuvable.");
        }
        return sale;
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Post)(),
    (0, auth_tenant_guard_1.RequirePermission)("sales.create"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createSale", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, auth_tenant_guard_1.RequirePermission)("sales.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getSale", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.Controller)("api/v1/sales"),
    (0, common_1.UseGuards)(auth_tenant_guard_1.AuthTenantGuard),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
