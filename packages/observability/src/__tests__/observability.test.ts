import { describe, it, expect } from "vitest";
import { StructuredLogger, sanitizeContext } from "../logger";

describe("JAAMA Observability & Audit Log Security Foundation (JAA-S0-15)", () => {
  it("automatically redacts sensitive keys (passwords, tokens, keys)", () => {
    const raw = {
      username: "hamidou",
      password: "Password123!",
      sessionToken: "secret-token-value",
      nested: {
        apiKey: "sk-12345",
        amount: 75000,
      },
    };

    const clean = sanitizeContext(raw);

    expect(clean.username).toBe("hamidou");
    expect(clean.password).toBe("[REDACTED]");
    expect(clean.sessionToken).toBe("[REDACTED]");
    expect((clean.nested as any).apiKey).toBe("[REDACTED]");
    expect((clean.nested as any).amount).toBe(75000);
  });

  it("formats structured log JSON payload correctly", () => {
    const logger = new StructuredLogger();
    const payload = logger.info("Vente enregistrée avec succès", {
      requestId: "req-100",
      organizationId: "org-diallo",
      actorId: "user-hamidou",
      action: "sales.create",
      context: { totalMinor: 75000 },
    });

    expect(payload.level).toBe("info");
    expect(payload.message).toBe("Vente enregistrée avec succès");
    expect(payload.requestId).toBe("req-100");
    expect(payload.organizationId).toBe("org-diallo");
    expect(payload.actorId).toBe("user-hamidou");
    expect(payload.timestamp).toBeDefined();
    expect(payload.context?.totalMinor).toBe(75000);
  });
});
