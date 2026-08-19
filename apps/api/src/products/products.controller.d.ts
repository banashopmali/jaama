import { AuthenticatedRequest } from "../common/auth-tenant.guard";
import { ProductsService, CreateProductDto, UpdateProductDto } from "./products.service";
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    createProduct(req: AuthenticatedRequest, dto: CreateProductDto): Promise<import("@jaama/types").Product>;
    listProducts(req: AuthenticatedRequest, category?: string, status?: string, search?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    getProduct(req: AuthenticatedRequest, id: string): Promise<any>;
    updateProduct(req: AuthenticatedRequest, id: string, dto: UpdateProductDto): Promise<import("@jaama/types").Product>;
    archiveProduct(req: AuthenticatedRequest, id: string): Promise<import("@jaama/types").Product>;
}
