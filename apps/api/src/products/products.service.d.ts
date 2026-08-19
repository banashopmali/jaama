import { Product, UserContext } from "@jaama/types";
export interface CreateProductDto {
    sku: string;
    name: string;
    category: string;
    unitPriceMinor: number;
    costMinor?: number;
    description?: string;
    barcode?: string;
    lowStockThreshold?: number;
    initialStock?: number;
}
export interface UpdateProductDto {
    name?: string;
    sku?: string;
    category?: string;
    unitPriceMinor?: number;
    costMinor?: number;
    description?: string;
    barcode?: string;
    lowStockThreshold?: number;
    status?: "active" | "inactive" | "archived";
}
export interface ListProductsQuery {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class ProductsService {
    createProduct(userContext: UserContext, dto: CreateProductDto, prismaClient?: import("@jaama/database").PrismaService): Promise<Product>;
    updateProduct(userContext: UserContext, productId: string, dto: UpdateProductDto, prismaClient?: import("@jaama/database").PrismaService): Promise<Product>;
    getProduct(userContext: UserContext, productId: string, prismaClient?: import("@jaama/database").PrismaService): Promise<any>;
    listProducts(userContext: UserContext, query?: ListProductsQuery, prismaClient?: import("@jaama/database").PrismaService): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    archiveProduct(userContext: UserContext, productId: string, prismaClient?: import("@jaama/database").PrismaService): Promise<Product>;
}
