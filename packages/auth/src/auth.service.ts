import { InMemoryDatabase } from "@jaama/database";
import { User, Session } from "@jaama/types";
import { hashPassword, verifyPassword } from "./password";
import { createSession, validateSession } from "./session";

export interface RegisterUserDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Registers a new User identity securely.
   */
  public async registerUser(
    db: InMemoryDatabase,
    dto: RegisterUserDto
  ): Promise<{ user: User; session: Session }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check email uniqueness
    for (const u of db.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        throw new Error("Cet adresse email est déjà utilisée.");
      }
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      name: dto.name.trim(),
      status: "active",
      createdAt: new Date(),
    };

    db.users.set(userId, newUser);
    db.credentials.set(userId, {
      userId,
      passwordHash: await hashPassword(dto.password),
    });

    const session = createSession(db, userId);
    return { user: newUser, session };
  }

  /**
   * Authenticates user using generic error messages to prevent email enumeration.
   */
  public async loginUser(
    db: InMemoryDatabase,
    dto: LoginUserDto
  ): Promise<{ user: User; session: Session }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const GENERIC_ERROR = "Identifiants invalides.";

    let targetUser: User | null = null;
    for (const u of db.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser || targetUser.status === "disabled") {
      throw new Error(GENERIC_ERROR);
    }

    const credential = db.credentials.get(targetUser.id);
    if (!credential) {
      throw new Error(GENERIC_ERROR);
    }

    const isMatch = await verifyPassword(dto.password, credential.passwordHash);
    if (!isMatch) {
      throw new Error(GENERIC_ERROR);
    }

    const session = createSession(db, targetUser.id);
    return { user: targetUser, session };
  }

  /**
   * Validates active session token and returns current user context.
   */
  public getCurrentUser(db: InMemoryDatabase, token: string): User | null {
    const sessionContext = validateSession(db, token);
    return sessionContext ? sessionContext.user : null;
  }

  /**
   * Revokes session token on logout.
   */
  public logoutUser(db: InMemoryDatabase, token: string): void {
    db.sessions.delete(token);
  }
}
