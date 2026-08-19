import { PrismaClient } from "@prisma/client";
import { Membership } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaMembershipRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public async findByOrganizationAndUser(organizationId: string, userId: string): Promise<Membership | null> {
    const membership = await this.db.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership) return null;

    return {
      id: membership.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
      role: membership.role as any,
      status: membership.status as "active" | "disabled",
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }
}
