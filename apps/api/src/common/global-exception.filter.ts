import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { createApiErrorEnvelope } from "@jaama/validation";
import { logger } from "@jaama/observability";

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

    // Known safe HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();
      message = typeof res === "object" && res.message ? (Array.isArray(res.message) ? res.message.join(", ") : res.message) : exception.message;

      if (typeof res === "object" && res.code) {
        code = res.code;
      } else if (status === HttpStatus.UNAUTHORIZED) {
        code = "AUTHENTICATION_REQUIRED";
      } else if (status === HttpStatus.FORBIDDEN) {
        code = "PERMISSION_DENIED";
      } else if (status === HttpStatus.NOT_FOUND) {
        code = "NOT_FOUND";
      } else if (status === HttpStatus.CONFLICT) {
        code = "IDEMPOTENCY_CONFLICT";
      } else if (status === HttpStatus.BAD_REQUEST) {
        if (message.includes("dépasser")) {
          code = "OVERPAYMENT_NOT_ALLOWED";
        } else if (message.includes("Stock")) {
          code = "SALE_STOCK_UNAVAILABLE";
        } else {
          code = "BAD_REQUEST";
        }
      } else {
        code = typeof res === "object" && res.error ? String(res.error).toUpperCase().replace(/\s+/g, "_") : "HTTP_ERROR";
      }
    } else if (exception instanceof Error) {
      const errMsg = exception.message || "";

      if (errMsg.includes("Stock disponible insuffisant") || errMsg.includes("Stock insuffisant")) {
        status = HttpStatus.BAD_REQUEST;
        code = "SALE_STOCK_UNAVAILABLE";
        message = errMsg;
      } else if (errMsg.includes("Le montant total des règlements ne peut dépasser")) {
        status = HttpStatus.BAD_REQUEST;
        code = "OVERPAYMENT_NOT_ALLOWED";
        message = errMsg;
      } else if (errMsg.includes("Conflit d'idempotence") || errMsg.includes("en cours de traitement")) {
        status = HttpStatus.CONFLICT;
        code = "IDEMPOTENCY_CONFLICT";
        message = errMsg;
      } else if (errMsg.includes("Accès refusé") || errMsg.includes("Permission")) {
        status = HttpStatus.FORBIDDEN;
        code = "PERMISSION_DENIED";
        message = errMsg;
      } else if (errMsg.includes("Authentification requise") || errMsg.includes("Session invalide")) {
        status = HttpStatus.UNAUTHORIZED;
        code = "AUTHENTICATION_REQUIRED";
        message = errMsg;
      } else if (errMsg.includes("Organisation introuvable")) {
        status = HttpStatus.NOT_FOUND;
        code = "TENANT_NOT_FOUND";
        message = errMsg;
      } else if (
        errMsg.includes("données") ||
        errMsg.includes("dépasser") ||
        errMsg.includes("spécifier") ||
        errMsg.includes("entier") ||
        errMsg.includes("quantité")
      ) {
        status = HttpStatus.BAD_REQUEST;
        code = "BAD_REQUEST";
        message = errMsg;
      } else {
        // UNKNOWN INFRASTRUCTURE / DATABASE ERROR: MUST NEVER LEAK INTERNAL EXCEPTION MESSAGE!
        console.error("FILTER CAUGHT UNHANDLED EXCEPTION:", exception);
        logger.error(`[GlobalExceptionFilter] Infrastructure error suppressed`, {
          context: { requestId, error: errMsg, stack: (exception as any)?.stack },
        });
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        code = "INTERNAL_SERVER_ERROR";
        message = "Une erreur interne est survenue.";
      }
    }

    // Production error normalization (never expose SQL, Prisma internals, or secrets)
    response.status(status).json(createApiErrorEnvelope(code, message, requestId));
  }
}
