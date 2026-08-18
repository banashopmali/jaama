import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { createApiErrorEnvelope } from "@jaama/validation";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || "req-unknown";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "Une erreur interne est survenue.";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();
      code = typeof res === "object" && res.error ? String(res.error).toUpperCase().replace(/\s+/g, "_") : "HTTP_ERROR";
      message = typeof res === "object" && res.message ? (Array.isArray(res.message) ? res.message.join(", ") : res.message) : exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      if (message.includes("Stock disponible insuffisant") || message.includes("Stock insuffisant")) {
        status = HttpStatus.BAD_REQUEST;
        code = "SALE_STOCK_UNAVAILABLE";
      } else if (message.includes("Conflit d'idempotence")) {
        status = HttpStatus.CONFLICT;
        code = "IDEMPOTENCY_CONFLICT";
      } else if (message.includes("Accès refusé") || message.includes("Permission")) {
        status = HttpStatus.FORBIDDEN;
        code = "PERMISSION_DENIED";
      } else if (message.includes("Authentification requise") || message.includes("Session invalide")) {
        status = HttpStatus.UNAUTHORIZED;
        code = "AUTHENTICATION_REQUIRED";
      } else if (message.includes("Organisation introuvable")) {
        status = HttpStatus.NOT_FOUND;
        code = "TENANT_NOT_FOUND";
      } else {
        status = HttpStatus.BAD_REQUEST;
        code = "BAD_REQUEST";
      }
    }

    // Production error normalization (never expose SQL, stack traces, or secrets)
    response.status(status).json(createApiErrorEnvelope(code, message, requestId));
  }
}
