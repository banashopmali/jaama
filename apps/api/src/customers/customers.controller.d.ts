import { AuthenticatedRequest } from "../common/auth-tenant.guard";
import { CustomersService, CreateCustomerDto, UpdateCustomerDto } from "./customers.service";
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    createCustomer(req: AuthenticatedRequest, dto: CreateCustomerDto): Promise<import("@jaama/types").Customer>;
    listCustomers(req: AuthenticatedRequest, search?: string, status?: string, page?: string, limit?: string): Promise<{
        data: import("@jaama/types").Customer[];
        total: number;
        page: number;
        limit: number;
    }>;
    getCustomerDetail(req: AuthenticatedRequest, id: string): Promise<any>;
    updateCustomer(req: AuthenticatedRequest, id: string, dto: UpdateCustomerDto): Promise<import("@jaama/types").Customer>;
    archiveCustomer(req: AuthenticatedRequest, id: string): Promise<import("@jaama/types").Customer>;
}
