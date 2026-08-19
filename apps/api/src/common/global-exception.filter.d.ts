import { ExceptionFilter, ArgumentsHost } from "@nestjs/common";
export declare function sanitizeLogMessage(input: string): string;
export declare class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
}
