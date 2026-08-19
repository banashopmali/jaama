"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
exports.sanitizeLogMessage = sanitizeLogMessage;
const common_1 = require("@nestjs/common");
const validation_1 = require("@jaama/validation");
const observability_1 = require("@jaama/observability");
function sanitizeLogMessage(input) {
    if (!input)
        return input;
    let sanitized = input;
    // Redact database & service URIs containing credentials
    sanitized = sanitized.replace(/[a-z0-9+.-]+:\/\/[^\s:@]+:[^\s:@]+@[^\s:@/]+(?::\d+)?\/[^\s'"]+/gi, "postgresql://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]/[REDACTED_DB]");
    // Redact Bearer tokens
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._~+-]+/gi, "Bearer [REDACTED_TOKEN]");
    // Redact inline passwords and secrets
    sanitized = sanitized.replace(/(password|secret|token|authorization|cred|key)=([^\s&]+)/gi, "$1=[REDACTED]");
    return sanitized;
}
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = request.requestId || "req-unknown";
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = "INTERNAL_SERVER_ERROR";
        let message = "Une erreur interne est survenue.";
        // Known safe HTTP exceptions
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            message = typeof res === "object" && res.message ? (Array.isArray(res.message) ? res.message.join(", ") : res.message) : exception.message;
            if (typeof res === "object" && res.code) {
                code = res.code;
            }
            else if (status === common_1.HttpStatus.UNAUTHORIZED) {
                code = "AUTHENTICATION_REQUIRED";
            }
            else if (status === common_1.HttpStatus.FORBIDDEN) {
                code = "PERMISSION_DENIED";
            }
            else if (status === common_1.HttpStatus.NOT_FOUND) {
                code = "NOT_FOUND";
            }
            else if (status === common_1.HttpStatus.CONFLICT) {
                code = "IDEMPOTENCY_CONFLICT";
            }
            else if (status === common_1.HttpStatus.BAD_REQUEST) {
                if (message.includes("dépasser")) {
                    code = "OVERPAYMENT_NOT_ALLOWED";
                }
                else if (message.includes("Stock")) {
                    code = "SALE_STOCK_UNAVAILABLE";
                }
                else {
                    code = "BAD_REQUEST";
                }
            }
            else {
                code = typeof res === "object" && res.error ? String(res.error).toUpperCase().replace(/\s+/g, "_") : "HTTP_ERROR";
            }
        }
        else if (exception instanceof Error) {
            const errMsg = exception.message || "";
            if (errMsg.includes("Stock disponible insuffisant") || errMsg.includes("Stock insuffisant")) {
                status = common_1.HttpStatus.BAD_REQUEST;
                code = "SALE_STOCK_UNAVAILABLE";
                message = errMsg;
            }
            else if (errMsg.includes("Le montant total des règlements ne peut dépasser")) {
                status = common_1.HttpStatus.BAD_REQUEST;
                code = "OVERPAYMENT_NOT_ALLOWED";
                message = errMsg;
            }
            else if (errMsg.includes("Conflit d'idempotence") || errMsg.includes("en cours de traitement")) {
                status = common_1.HttpStatus.CONFLICT;
                code = "IDEMPOTENCY_CONFLICT";
                message = errMsg;
            }
            else if (errMsg.includes("Accès refusé") || errMsg.includes("Permission")) {
                status = common_1.HttpStatus.FORBIDDEN;
                code = "PERMISSION_DENIED";
                message = errMsg;
            }
            else if (errMsg.includes("Authentification requise") || errMsg.includes("Session invalide")) {
                status = common_1.HttpStatus.UNAUTHORIZED;
                code = "AUTHENTICATION_REQUIRED";
                message = errMsg;
            }
            else if (errMsg.includes("Organisation introuvable")) {
                status = common_1.HttpStatus.NOT_FOUND;
                code = "TENANT_NOT_FOUND";
                message = errMsg;
            }
            else if (errMsg.includes("données") ||
                errMsg.includes("dépasser") ||
                errMsg.includes("spécifier") ||
                errMsg.includes("entier") ||
                errMsg.includes("quantité") ||
                errMsg.includes("Client introuvable")) {
                status = common_1.HttpStatus.BAD_REQUEST;
                code = "BAD_REQUEST";
                message = errMsg;
            }
            else {
                // UNKNOWN INFRASTRUCTURE / DATABASE ERROR: MUST NEVER LEAK INTERNAL EXCEPTION MESSAGE OR SECRETS!
                if (process.env.NODE_ENV !== "production") {
                    console.error("FILTER CAUGHT UNHANDLED EXCEPTION:", sanitizeLogMessage(errMsg));
                }
                observability_1.logger.error(`[GlobalExceptionFilter] Infrastructure error suppressed`, {
                    context: {
                        requestId,
                        error: sanitizeLogMessage(errMsg),
                        stack: sanitizeLogMessage(exception?.stack || ""),
                    },
                });
                status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                code = "INTERNAL_SERVER_ERROR";
                message = "Une erreur interne est survenue.";
            }
        }
        // Production error normalization (never expose SQL, Prisma internals, or secrets)
        response.status(status).json((0, validation_1.createApiErrorEnvelope)(code, message, requestId));
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
