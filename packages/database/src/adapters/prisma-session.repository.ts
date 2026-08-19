import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { Session } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaSessionRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  public async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const tokenHash = this.hashToken(token);
    const created = await this.db.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      token,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
  }

  public async findByToken(token: string): Promise<Session | null> {
    const tokenHash = this.hashToken(token);
    const session = await this.db.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || session.user.status !== "active") {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  public async revokeSession(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    try {
      await this.db.session.delete({ where: { tokenHash } });
      return true;
    } catch {
      return false;
    }
  }
}
