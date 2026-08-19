"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@jaama/database");
let CustomersService = class CustomersService {
    async createCustomer(userContext, dto, prismaClient = database_1.prisma) {
        const organizationId = userContext.organizationId;
        if (!dto.name || dto.name.trim().length === 0) {
            throw new common_1.BadRequestException("Le nom du client est obligatoire.");
        }
        return prismaClient.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: {
                    organizationId,
                    name: dto.name.trim(),
                    phone: dto.phone ? dto.phone.trim() : null,
                    email: dto.email ? dto.email.trim().toLowerCase() : null,
                    address: dto.address ? dto.address.trim() : null,
                    notes: dto.notes ? dto.notes.trim() : null,
                    type: dto.type || "registered",
                    status: "active",
                },
            });
            await tx.auditEvent.create({
                data: {
                    organizationId,
                    actorId: userContext.actorId,
                    action: "customer.create",
                    resourceType: "customer",
                    resourceId: customer.id,
                    metadataJson: JSON.stringify({ name: customer.name, phone: customer.phone }),
                },
            });
            await tx.outboxEvent.create({
                data: {
                    organizationId,
                    eventType: "CustomerCreated",
                    aggregateType: "Customer",
                    aggregateId: customer.id,
                    payloadJson: JSON.stringify({ customerId: customer.id, name: customer.name }),
                },
            });
            return customer;
        });
    }
    async updateCustomer(userContext, customerId, dto, prismaClient = database_1.prisma) {
        const organizationId = userContext.organizationId;
        return prismaClient.$transaction(async (tx) => {
            const existing = await tx.customer.findUnique({
                where: {
                    organizationId_id: {
                        organizationId,
                        id: customerId,
                    },
                },
            });
            if (!existing) {
                throw new common_1.NotFoundException("Client introuvable.");
            }
            const updated = await tx.customer.update({
                where: {
                    organizationId_id: {
                        organizationId,
                        id: customerId,
                    },
                },
                data: {
                    ...(dto.name !== undefined && { name: dto.name.trim() }),
                    ...(dto.phone !== undefined && { phone: dto.phone ? dto.phone.trim() : null }),
                    ...(dto.email !== undefined && { email: dto.email ? dto.email.trim().toLowerCase() : null }),
                    ...(dto.address !== undefined && { address: dto.address }),
                    ...(dto.notes !== undefined && { notes: dto.notes }),
                    ...(dto.status !== undefined && { status: dto.status }),
                    ...(dto.type !== undefined && { type: dto.type }),
                },
            });
            await tx.auditEvent.create({
                data: {
                    organizationId,
                    actorId: userContext.actorId,
                    action: "customer.update",
                    resourceType: "customer",
                    resourceId: customerId,
                    metadataJson: JSON.stringify({ updatedFields: Object.keys(dto) }),
                },
            });
            return updated;
        });
    }
    async getCustomerDetail(userContext, customerId, prismaClient = database_1.prisma) {
        const organizationId = userContext.organizationId;
        const customer = await prismaClient.customer.findUnique({
            where: {
                organizationId_id: {
                    organizationId,
                    id: customerId,
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException("Client introuvable.");
        }
        // Authoritative Read Model Summary derived from Sales
        const sales = await prismaClient.sale.findMany({
            where: {
                organizationId,
                customerId,
            },
            select: {
                id: true,
                reference: true,
                totalMinor: true,
                paidMinor: true,
                remainingMinor: true,
                paymentStatus: true,
                saleStatus: true,
                occurredAt: true,
            },
            orderBy: { occurredAt: "desc" },
        });
        const salesCount = sales.length;
        const salesTotalMinor = sales.reduce((acc, s) => acc + s.totalMinor, 0);
        const paidMinor = sales.reduce((acc, s) => acc + s.paidMinor, 0);
        const outstandingMinor = sales.reduce((acc, s) => acc + s.remainingMinor, 0);
        return {
            ...customer,
            summary: {
                salesCount,
                salesTotalMinor,
                paidMinor,
                outstandingMinor,
            },
            recentSales: sales.slice(0, 10),
        };
    }
    async listCustomers(userContext, query = {}, prismaClient = database_1.prisma) {
        const organizationId = userContext.organizationId;
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = { organizationId };
        if (query.status) {
            where.status = query.status;
        }
        else {
            where.status = "active"; // Active by default
        }
        if (query.search && query.search.trim().length > 0) {
            const term = query.search.trim();
            where.OR = [
                { name: { contains: term, mode: "insensitive" } },
                { phone: { contains: term, mode: "insensitive" } },
                { email: { contains: term, mode: "insensitive" } },
            ];
        }
        const [customers, total] = await Promise.all([
            prismaClient.customer.findMany({
                where,
                orderBy: { name: "asc" },
                skip,
                take: limit,
            }),
            prismaClient.customer.count({ where }),
        ]);
        return {
            data: customers,
            total,
            page,
            limit,
        };
    }
    async archiveCustomer(userContext, customerId, prismaClient = database_1.prisma) {
        return this.updateCustomer(userContext, customerId, { status: "archived" }, prismaClient);
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)()
], CustomersService);
