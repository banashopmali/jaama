import { randomBytes } from "crypto";
import { InMemoryDatabase } from "@jaama/database";
import { User } from "@jaama/types";

export interface SessionInfo {
  token: string;
  userId: string;
  expiresAt: Date;
}

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function createSession(
  db: InMemoryDatabase,
  userId: string,
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): SessionInfo {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  const session: SessionInfo = { token, userId, expiresAt };
  db.sessions.set(token, session);
  return session;
}

export function validateSession(
  db: InMemoryDatabase,
  token: string
): { user: User; session: SessionInfo } | null {
  if (!token) return null;
  const session = db.sessions.get(token);
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    db.sessions.delete(token);
    return null;
  }

  const user = db.users.get(session.userId);
  if (!user || user.status === "disabled") {
    db.sessions.delete(token);
    return null;
  }

  return { user, session };
}

export function revokeSession(db: InMemoryDatabase, token: string): void {
  db.sessions.delete(token);
}
