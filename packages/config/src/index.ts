// Authoritative Typed Environment Configuration & Operational Readiness (@jaama/config)

export interface EnvironmentConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  corsAllowedOrigins: string[];
}

export function validateEnvironment(env: Record<string, string | undefined> = process.env): EnvironmentConfig {
  const nodeEnv = (env.NODE_ENV as "development" | "test" | "production") || "development";
  const port = parseInt(env.PORT || "3001", 10);
  const databaseUrl = env.DATABASE_URL || "postgresql://jaama_user:jaama_pass@localhost:5432/jaama_db";
  const sessionSecret = env.SESSION_SECRET || (nodeEnv === "production" ? "" : "default-dev-session-secret-change-in-prod-32bytes");
  const corsOrigins = env.CORS_ALLOWED_ORIGINS ? env.CORS_ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"];

  if (nodeEnv === "production") {
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      throw new Error("L'environnement de production exige 'SESSION_SECRET' d'au moins 32 caractères.");
    }
    if (!env.DATABASE_URL) {
      throw new Error("L'environnement de production exige 'DATABASE_URL'.");
    }
  }

  return {
    nodeEnv,
    port: isNaN(port) ? 3001 : port,
    databaseUrl,
    sessionSecret,
    corsAllowedOrigins: corsOrigins,
  };
}

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  services?: Record<string, "ok" | "down">;
}

export function getLivenessSignal(): HealthStatus {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}

export function getReadinessSignal(dbHealthy: boolean = true): HealthStatus {
  return {
    status: dbHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? "ok" : "down",
    },
  };
}
