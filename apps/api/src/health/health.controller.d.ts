export declare class HealthController {
    getLiveness(): import("@jaama/config").HealthStatus;
    getReadiness(res: any): Promise<any>;
}
