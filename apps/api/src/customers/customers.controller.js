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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const auth_tenant_guard_1 = require("../common/auth-tenant.guard");
const customers_service_1 = require("./customers.service");
let CustomersController = class CustomersController {
    customersService;
    constructor(customersService) {
        this.customersService = customersService;
    }
    async createCustomer(req, dto) {
        return this.customersService.createCustomer(req.userContext, dto);
    }
    async listCustomers(req, search, status, page, limit) {
        return this.customersService.listCustomers(req.userContext, {
            search,
            status,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async getCustomerDetail(req, id) {
        return this.customersService.getCustomerDetail(req.userContext, id);
    }
    async updateCustomer(req, id, dto) {
        return this.customersService.updateCustomer(req.userContext, id, dto);
    }
    async archiveCustomer(req, id) {
        return this.customersService.archiveCustomer(req.userContext, id);
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Post)(),
    (0, auth_tenant_guard_1.RequirePermission)("customers.manage"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Get)(),
    (0, auth_tenant_guard_1.RequirePermission)("customers.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("search")),
    __param(2, (0, common_1.Query)("status")),
    __param(3, (0, common_1.Query)("page")),
    __param(4, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "listCustomers", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, auth_tenant_guard_1.RequirePermission)("customers.read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerDetail", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, auth_tenant_guard_1.RequirePermission)("customers.manage"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Patch)(":id/archive"),
    (0, auth_tenant_guard_1.RequirePermission)("customers.manage"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "archiveCustomer", null);
exports.CustomersController = CustomersController = __decorate([
    (0, common_1.Controller)("api/v1/customers"),
    (0, common_1.UseGuards)(auth_tenant_guard_1.AuthTenantGuard),
    __metadata("design:paramtypes", [customers_service_1.CustomersService])
], CustomersController);
