import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { AuthService } from "../auth.service";
import { hashPassword, verifyPassword } from "../password";

describe("JAAMA Identity & Authentication Foundation (JAA-S0-09)", () => {
  let db: InMemoryDatabase;
  let authService: AuthService;

  beforeEach(() => {
    db = seedInMemoryDatabase();
    authService = new AuthService();
  });

  describe("Password Security Contracts", () => {
    it("hashes passwords securely using salted key derivation", () => {
      const hash = hashPassword("SecretP@ss123");
      expect(hash).not.toBe("SecretP@ss123");
      expect(hash.includes(":")).toBe(true);

      expect(verifyPassword("SecretP@ss123", hash)).toBe(true);
      expect(verifyPassword("WrongP@ssword", hash)).toBe(false);
    });
  });

  describe("Auth Service Integration", () => {
    it("registers a new user and returns active session", async () => {
      const { user, session } = await authService.registerUser(db, {
        email: "moussa@diallo.com",
        name: "Moussa Diallo",
        password: "Password123!",
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("moussa@diallo.com");
      expect(session.token).toBeDefined();

      const currentUser = authService.getCurrentUser(db, session.token);
      expect(currentUser?.id).toBe(user.id);
    });

    it("authenticates existing seeded user (Hamidou)", async () => {
      // Register password credential for seeded user Hamidou
      db.credentials.set("user-hamidou", {
        userId: "user-hamidou",
        passwordHash: hashPassword("HamidouPass123!"),
      });

      const { user, session } = await authService.loginUser(db, {
        email: "hamidou@diallo.com",
        password: "HamidouPass123!",
      });

      expect(user.id).toBe("user-hamidou");
      expect(session.token).toBeDefined();
    });

    it("rejects invalid password with generic error message", async () => {
      db.credentials.set("user-hamidou", {
        userId: "user-hamidou",
        passwordHash: hashPassword("HamidouPass123!"),
      });

      await expect(
        authService.loginUser(db, {
          email: "hamidou@diallo.com",
          password: "WrongPassword!",
        })
      ).rejects.toThrow("Identifiants invalides.");
    });

    it("rejects non-existent email with exact same generic error message", async () => {
      await expect(
        authService.loginUser(db, {
          email: "nonexistent@diallo.com",
          password: "HamidouPass123!",
        })
      ).rejects.toThrow("Identifiants invalides.");
    });

    it("revokes session on logout", async () => {
      db.credentials.set("user-hamidou", {
        userId: "user-hamidou",
        passwordHash: hashPassword("HamidouPass123!"),
      });

      const { session } = await authService.loginUser(db, {
        email: "hamidou@diallo.com",
        password: "HamidouPass123!",
      });

      expect(authService.getCurrentUser(db, session.token)).not.toBeNull();

      authService.logoutUser(db, session.token);

      expect(authService.getCurrentUser(db, session.token)).toBeNull();
    });

    it("rejects disabled account login", async () => {
      const user = db.users.get("user-hamidou");
      if (user) user.status = "disabled";

      db.credentials.set("user-hamidou", {
        userId: "user-hamidou",
        passwordHash: hashPassword("HamidouPass123!"),
      });

      await expect(
        authService.loginUser(db, {
          email: "hamidou@diallo.com",
          password: "HamidouPass123!",
        })
      ).rejects.toThrow("Identifiants invalides.");
    });
  });
});
