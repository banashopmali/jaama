import { Sale, UserContext } from "@jaama/types";
export declare class SalesService {
    /**
     * Executes atomic CreateSale mutation in PostgreSQL.
     */
    createSale(userContext: UserContext, commandInput: unknown, prismaClient?: import("@jaama/database").PrismaService): Promise<Sale>;
    getSale(userContext: UserContext, saleId: string, prismaClient?: import("@jaama/database").PrismaService): Promise<Sale | null>;
}
