import { randomBytes } from "crypto";
import { PrismaSessionRepository, InMemoryDatabase } from "@jaama/database";
import { Session, User } from "@jaama/types";

export interface SessionStorePort {
  createSession(userId: string, durationMs?: number): Promise<Session>;
  getSession(token: string): Promise<Session | null>;
  revokeSession(token: string): Promise<boolean>;
}

export class PostgresSessionService implements SessionStorePort {
  private repo = new PrismaSessionRepository();

  public async createSession(userId: string, durationMs: number = 24 * 60 * 60 * 1000): Promise<Session> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + durationMs);
    return this.repo.createSession(userId, token, expiresAt);
  }

  public async getSession(token: string): Promise<Session | null> {
    if (!token) return null;
    return this.repo.findByToken(token);
  }

  public async revokeSession(token: string): Promise<boolean> {
    if (!token) return false;
    return this.repo.revokeSession(token);
  }
}

// In-Memory Session Fallback helper for fast unit tests
export function createSession(
  db: InMemoryDatabase,
  userId: string,
  durationMs: number = 24 * 60 * 60 * 1000
): Session {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + durationMs);
  const session: Session = {
    id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    token,
    expiresAt,
    createdAt: new Date(),
  };

  db.sessions.set(token, session);
  return session;
}

export function validateSession(db: InMemoryDatabase, token: string): { session: Session; user: User } | null {
  const rawSession = db.sessions.get(token);
  if (!rawSession || rawSession.expiresAt < new Date()) {
    return null;
  }
  const user = db.users.get(rawSession.userId);
  if (!user || user.status !== "active") {
    return null;
  }

  const session: Session = {
    id: (rawSession as any).id || `sess-${token.substring(0, 8)}`,
    token: rawSession.token,
    userId: rawSession.userId,
    expiresAt: rawSession.expiresAt,
    createdAt: (rawSession as any).createdAt || new Date(),
  };

  return { session, user };
}
