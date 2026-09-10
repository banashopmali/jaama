import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { createApiErrorEnvelope } from "@jaama/validation";
import { logger } from "@jaama/observability";

export function sanitizeLogMessage(input: string): string {
  if (!input) return input;
  let sanitized = input;
  // Redact database & service URIs containing credentials
  sanitized = sanitized.replace(
    /[a-z0-9+.-]+:\/\/[^\s:@]+:[^\s:@]+@[^\s:@/]+(?::\d+)?\/[^\s'"]+/gi,
    "postgresql://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]/[REDACTED_DB]"
  );
  // Redact Bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._~+-]+/gi, "Bearer [REDACTED_TOKEN]");
  // Redact inline passwords and secrets
  sanitized = sanitized.replace(/(password|secret|token|authorization|cred|key)=([^\s&]+)/gi, "$1=[REDACTED]");
  return sanitized;
}

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
    } else if (
      (exception as any)?.name === "PaymentDomainError" ||
      ((exception as any)?.code && [
        "INVALID_STATE_TRANSITION",
        "PROVIDER_NOT_CONFIGURED",
        "PROVIDER_UNAVAILABLE",
        "INVALID_SIGNATURE",
        "IDEMPOTENCY_CONFLICT",
        "AMOUNT_MISMATCH",
        "CURRENCY_MISMATCH",
        "PAYMENT_INTENT_EXPIRED",
        "PAYMENT_INTENT_ALREADY_PAID",
        "TENANT_MISMATCH",
        "UNAUTHORIZED_PROVIDER_ACTION",
        "PROVIDER_ERROR",
      ].includes((exception as any)?.code))
    ) {
      const pde = exception as any;
      code = pde.code || "PAYMENT_DOMAIN_ERROR";
      message = pde.message || "Payment domain error";
      if (code === "IDEMPOTENCY_CONFLICT") {
        status = HttpStatus.CONFLICT;
      } else if (code === "INVALID_SIGNATURE") {
        status = HttpStatus.UNAUTHORIZED;
      } else if (code === "UNAUTHORIZED_PROVIDER_ACTION") {
        status = HttpStatus.FORBIDDEN;
      } else if (code === "TENANT_MISMATCH") {
        status = HttpStatus.NOT_FOUND;
      } else {
        status = HttpStatus.BAD_REQUEST;
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
        errMsg.includes("quantité") ||
        errMsg.includes("Client introuvable")
      ) {
        status = HttpStatus.BAD_REQUEST;
        code = "BAD_REQUEST";
        message = errMsg;
      } else {
        // UNKNOWN INFRASTRUCTURE / DATABASE ERROR: MUST NEVER LEAK INTERNAL EXCEPTION MESSAGE OR SECRETS!
        if (process.env.NODE_ENV !== "production") {
          console.error("FILTER CAUGHT UNHANDLED EXCEPTION:", sanitizeLogMessage(errMsg));
        }
        logger.error(`[GlobalExceptionFilter] Infrastructure error suppressed`, {
          context: {
            requestId,
            error: sanitizeLogMessage(errMsg),
            stack: sanitizeLogMessage((exception as any)?.stack || ""),
          },
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
