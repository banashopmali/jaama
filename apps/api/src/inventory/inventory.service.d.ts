import { InventoryBalance, StockMovement, StockMovementType, UserContext } from "@jaama/types";
export interface RecordStockAdjustmentDto {
    productId: string;
    movementType: StockMovementType;
    quantityDelta: number;
    reference?: string;
}
export interface ListInventoryQuery {
    status?: "normal" | "low" | "out_of_stock";
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class InventoryService {
    recordAdjustment(userContext: UserContext, dto: RecordStockAdjustmentDto, prismaClient?: import("@jaama/database").PrismaService): Promise<{
        balance: InventoryBalance;
        movement: StockMovement;
    }>;
    listInventory(userContext: UserContext, query?: ListInventoryQuery, prismaClient?: import("@jaama/database").PrismaService): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    getStockMovements(userContext: UserContext, productId?: string, limit?: number, prismaClient?: import("@jaama/database").PrismaService): Promise<StockMovement[]>;
}
