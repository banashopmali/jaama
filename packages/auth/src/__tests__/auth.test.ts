import { describe, it, expect } from "vitest";
import { hashPassword, hashPasswordPbkdf2, verifyPassword } from "../password";

describe("JAAMA Identity & Password Hashing Contracts (JAA-S0-09)", () => {
  it("hashes passwords securely using Argon2id", async () => {
    const raw = "Password123!";
    const hash = await hashPassword(raw);

    expect(hash).toContain("$argon2id$");
    expect(hash).not.toBe(raw);

    const valid = await verifyPassword(raw, hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("WrongPassword!", hash);
    expect(invalid).toBe(false);
  });

  it("verifies PBKDF2 fallback hashes using timing-safe comparison", async () => {
    const raw = "Password123!";
    const pbkdf2Hash = hashPasswordPbkdf2(raw);

    const valid = await verifyPassword(raw, pbkdf2Hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("WrongPassword!", pbkdf2Hash);
    expect(invalid).toBe(false);
  });
});
