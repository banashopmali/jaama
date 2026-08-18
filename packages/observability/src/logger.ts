export type LogLevel = "info" | "warn" | "error" | "audit";

export interface LogPayload {
  level: LogLevel;
  message: string;
  requestId?: string;
  organizationId?: string;
  actorId?: string;
  action?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const SENSITIVE_KEYS = ["password", "token", "authorization", "secret", "key", "passwordHash", "credential"];

export function sanitizeContext(context: Record<string, unknown> = {}): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(context)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()));
    if (isSensitive) {
      clean[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      clean[k] = sanitizeContext(v as Record<string, unknown>);
    } else {
      clean[k] = v;
    }
  }

  return clean;
}

export class StructuredLogger {
  public log(level: LogLevel, message: string, meta: { requestId?: string; organizationId?: string; actorId?: string; action?: string; context?: Record<string, unknown> } = {}): LogPayload {
    const sanitized = meta.context ? sanitizeContext(meta.context) : undefined;
    const payload: LogPayload = {
      level,
      message,
      requestId: meta.requestId,
      organizationId: meta.organizationId,
      actorId: meta.actorId,
      action: meta.action,
      context: sanitized,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify(payload));
    }

    return payload;
  }

  public info(message: string, meta?: any): LogPayload {
    return this.log("info", message, meta);
  }

  public warn(message: string, meta?: any): LogPayload {
    return this.log("warn", message, meta);
  }

  public error(message: string, meta?: any): LogPayload {
    return this.log("error", message, meta);
  }

  public audit(message: string, meta?: any): LogPayload {
    return this.log("audit", message, meta);
  }
}

export const logger = new StructuredLogger();
