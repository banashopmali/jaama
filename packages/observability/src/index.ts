// Authoritative Observability & Audit Log Exports (@jaama/observability)

import { sanitizeContext } from "./logger";

export * from "./logger";

export function logSecurityAudit(event: string, meta: Record<string, unknown> = {}) {
  const safeMeta = sanitizeContext(meta);
  if (process.env.NODE_ENV !== "test") {
    console.log(`[SECURITY AUDIT] ${event}`, JSON.stringify(safeMeta));
  }
}
