import { SalesService } from "./sales.service";
export declare class SalesController {
    private service;
    constructor(salesService?: SalesService);
    createSale(req: any, body: any): Promise<import("@jaama/types").Sale>;
    getSale(req: any, id: string): Promise<import("@jaama/types").Sale>;
}
