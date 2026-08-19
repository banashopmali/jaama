import { describe, it, expect } from "vitest";
import { getLivenessSignal, getReadinessSignal, validateEnvironment } from "../index";

describe("JAAMA Environment & Production Readiness Foundation (JAA-S0-18)", () => {
  it("parses valid development environment configuration with fallback defaults", () => {
    const config = validateEnvironment({ NODE_ENV: "development", PORT: "3001" });
    expect(config.nodeEnv).toBe("development");
    expect(config.port).toBe(3001);
    expect(config.sessionSecret).toBeDefined();
  });

  it("fails fast in production mode if SESSION_SECRET is missing or unsafe", () => {
    expect(() =>
      validateEnvironment({ NODE_ENV: "production", DATABASE_URL: "postgresql://localhost:5432/db", SESSION_SECRET: "short" })
    ).toThrow("SESSION_SECRET");
  });

  it("returns liveness and readiness health signals accurately", () => {
    const liveness = getLivenessSignal();
    expect(liveness.status).toBe("ok");
    expect(liveness.timestamp).toBeDefined();

    const readyOk = getReadinessSignal(true);
    expect(readyOk.status).toBe("ok");
    expect(readyOk.services?.database).toBe("ok");

    const readyDegraded = getReadinessSignal(false);
    expect(readyDegraded.status).toBe("degraded");
    expect(readyDegraded.services?.database).toBe("down");
  });
});
