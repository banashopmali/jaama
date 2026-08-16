export function logSecurityAudit(event: string, meta: Record<string, unknown> = {}) {
  // Safe logging with automatic sensitive data redaction
  const safeMeta = { ...meta };
  delete safeMeta.password;
  delete safeMeta.token;
  delete safeMeta.secret;
  console.log(`[SECURITY AUDIT] ${event}`, JSON.stringify(safeMeta));
}
