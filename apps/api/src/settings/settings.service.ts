import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface UpdateSettingsDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  logoUrl?: string;
}

@Injectable()
export class SettingsService {
  public async getSettings(userContext: UserContext, prismaClient = defaultPrisma) {
    const organizationId = userContext.organizationId;
    const org = await prismaClient.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException("Organisation introuvable.");
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      country: "ML",
      currency: "XOF",
      createdAt: org.createdAt,
    };
  }

  public async updateSettings(
    userContext: UserContext,
    dto: UpdateSettingsDto,
    prismaClient = defaultPrisma
  ) {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "organization.update_settings",
          resourceType: "organization",
          resourceId: organizationId,
          metadataJson: JSON.stringify({ updatedFields: Object.keys(dto) }),
        },
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        country: dto.country || "ML",
        currency: dto.currency || "XOF",
      };
    });
  }
}
