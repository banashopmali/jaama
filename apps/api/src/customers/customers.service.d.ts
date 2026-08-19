import { Customer, UserContext } from "@jaama/types";
export interface CreateCustomerDto {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    type?: "walk_in" | "registered";
}
export interface UpdateCustomerDto {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    status?: "active" | "archived";
    type?: "walk_in" | "registered";
}
export interface ListCustomersQuery {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
}
export declare class CustomersService {
    createCustomer(userContext: UserContext, dto: CreateCustomerDto, prismaClient?: import("@jaama/database").PrismaService): Promise<Customer>;
    updateCustomer(userContext: UserContext, customerId: string, dto: UpdateCustomerDto, prismaClient?: import("@jaama/database").PrismaService): Promise<Customer>;
    getCustomerDetail(userContext: UserContext, customerId: string, prismaClient?: import("@jaama/database").PrismaService): Promise<any>;
    listCustomers(userContext: UserContext, query?: ListCustomersQuery, prismaClient?: import("@jaama/database").PrismaService): Promise<{
        data: Customer[];
        total: number;
        page: number;
        limit: number;
    }>;
    archiveCustomer(userContext: UserContext, customerId: string, prismaClient?: import("@jaama/database").PrismaService): Promise<Customer>;
}
