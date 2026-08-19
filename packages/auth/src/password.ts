import * as argon2 from "argon2";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Authoritative Password Hashing Engine (@jaama/auth / JAA-S0-09)
 * Primary: Argon2id (strongest modern key derivation strategy)
 * Secondary / Legacy Fallback: PBKDF2-SHA256 with timing-safe verification
 */

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length < 8) {
    throw new Error("Le mot de passe doit comporter au moins 8 caractères.");
  }
  return argon2.hash(password, { type: argon2.argon2id });
}

export function hashPasswordPbkdf2(password: string): string {
  if (!password || password.trim().length < 8) {
    throw new Error("Le mot de passe doit comporter au moins 8 caractères.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return `${derived}:${salt}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  try {
    if (storedHash.startsWith("$argon2id$")) {
      return await argon2.verify(storedHash, password);
    }

    // PBKDF2 fallback with timing-safe comparison
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;

    const [expectedHashHex, saltHex] = parts;
    const computedHash = pbkdf2Sync(password, saltHex, 100000, 32, "sha256");
    const expectedHash = Buffer.from(expectedHashHex, "hex");

    if (computedHash.length !== expectedHash.length) return false;
    return timingSafeEqual(computedHash, expectedHash);
  } catch {
    return false;
  }
}
