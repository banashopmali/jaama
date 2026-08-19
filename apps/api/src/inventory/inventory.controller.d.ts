import { AuthenticatedRequest } from "../common/auth-tenant.guard";
import { InventoryService, RecordStockAdjustmentDto } from "./inventory.service";
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    listInventory(req: AuthenticatedRequest, status?: "normal" | "low" | "out_of_stock", category?: string, search?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    recordAdjustment(req: AuthenticatedRequest, dto: RecordStockAdjustmentDto): Promise<{
        balance: import("@jaama/types").InventoryBalance;
        movement: import("@jaama/types").StockMovement;
    }>;
    getStockMovements(req: AuthenticatedRequest, productId?: string, limit?: string): Promise<import("@jaama/types").StockMovement[]>;
}
