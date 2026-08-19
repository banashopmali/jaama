import { PrismaClient } from "@prisma/client";
import { Organization } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaOrganizationRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public async findById(id: string): Promise<Organization | null> {
    const org = await this.db.organization.findUnique({ where: { id } });
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status as "active" | "suspended",
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
