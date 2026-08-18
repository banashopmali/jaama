import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { prisma as defaultPrisma, PrismaSessionRepository } from "@jaama/database";
import { hashPassword, verifyPassword } from "@jaama/auth";
import { User, Session } from "@jaama/types";

export class RegisterDto {
  email!: string;
  name!: string;
  password!: string;
}

export class LoginDto {
  email!: string;
  password!: string;
}

@Injectable()
export class AuthService {
  private sessionRepo = new PrismaSessionRepository(defaultPrisma);

  public async register(dto: RegisterDto, prismaClient = defaultPrisma): Promise<{ user: User; session: Session }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    if (!normalizedEmail || !dto.name || !dto.password || dto.password.length < 8) {
      throw new BadRequestException("Données d'inscription invalides. Le mot de passe doit comporter 8 caractères minimum.");
    }

    const existingUser = await prismaClient.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new BadRequestException("Cet adresse email est déjà utilisée.");
    }

    const passwordHash = await hashPassword(dto.password);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const userRow = await prismaClient.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          name: dto.name.trim(),
          status: "active",
        },
      });

      await tx.credential.create({
        data: {
          id: `cred-${userId}`,
          userId: u.id,
          passwordHash,
        },
      });

      return u;
    });

    const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await this.sessionRepo.createSession(userRow.id, token, expiresAt);

    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        status: userRow.status as any,
        createdAt: userRow.createdAt,
      },
      session,
    };
  }

  public async login(dto: LoginDto, prismaClient = defaultPrisma): Promise<{ user: User; session: Session }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const GENERIC_ERROR = "Identifiants invalides.";

    const userRow = await prismaClient.user.findUnique({
      where: { email: normalizedEmail },
      include: { credential: true },
    });

    if (!userRow || userRow.status === "disabled" || !userRow.credential) {
      throw new UnauthorizedException(GENERIC_ERROR);
    }

    const valid = await verifyPassword(dto.password, userRow.credential.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(GENERIC_ERROR);
    }

    const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await this.sessionRepo.createSession(userRow.id, token, expiresAt);

    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        status: userRow.status as any,
        createdAt: userRow.createdAt,
      },
      session,
    };
  }

  public async logout(token: string): Promise<boolean> {
    if (!token) return false;
    return this.sessionRepo.revokeSession(token);
  }

  public async validateToken(token: string): Promise<{ session: Session; user: User } | null> {
    if (!token) return null;
    const session = await this.sessionRepo.findByToken(token);
    if (!session) return null;

    const userRow = await defaultPrisma.user.findUnique({ where: { id: session.userId } });
    if (!userRow || userRow.status === "disabled") return null;

    return {
      session,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        status: userRow.status as any,
        createdAt: userRow.createdAt,
      },
    };
  }
}
