import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";
import * as crypto from "crypto";

export interface InviteMemberDto {
  email: string;
  role: "owner" | "admin" | "employe" | "comptable" | "vendeur";
  name?: string;
}

export interface UpdateMemberRoleDto {
  role: "owner" | "admin" | "employe" | "comptable" | "vendeur";
}

@Injectable()
export class TeamService {
  public async listMembers(userContext: UserContext, prismaClient = defaultPrisma): Promise<any[]> {
    const organizationId = userContext.organizationId;
    const members = await prismaClient.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
    }));
  }

  public async inviteMember(
    userContext: UserContext,
    dto: InviteMemberDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const emailClean = dto.email.trim().toLowerCase();

    if (!emailClean || !emailClean.includes("@")) {
      throw new BadRequestException("Adresse email invalide.");
    }

    return prismaClient.$transaction(async (tx) => {
      // 1. Find or create user
      let user = await tx.user.findUnique({ where: { email: emailClean } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: emailClean,
            name: dto.name ? dto.name.trim() : emailClean.split("@")[0],
          },
        });
        await tx.credential.create({
          data: {
            userId: user.id,
            passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$invitedUserFallbackPlaceholderToken$",
          },
        });
      }

      // 2. Check existing membership
      const existingMembership = await tx.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new BadRequestException("Cet utilisateur est déjà membre de l'organisation.");
      }

      // 3. Generate CSPRNG token for invitation
      const inviteToken = crypto.randomBytes(32).toString("hex");

      const membership = await tx.membership.create({
        data: {
          organizationId,
          userId: user.id,
          role: dto.role as any,
          status: "INVITED",
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "member.invite",
          resourceType: "membership",
          resourceId: membership.id,
          metadataJson: JSON.stringify({ email: emailClean, role: dto.role }),
        },
      });

      return {
        id: membership.id,
        userId: user.id,
        email: emailClean,
        role: dto.role,
        status: "INVITED",
        inviteToken,
      };
    });
  }

  public async updateMemberRole(
    userContext: UserContext,
    membershipId: string,
    dto: UpdateMemberRoleDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: { id: membershipId },
      });

      if (!membership || membership.organizationId !== organizationId) {
        throw new NotFoundException("Membre introuvable dans cette organisation.");
      }

      // Last owner protection
      if (membership.role === "owner" && dto.role !== "owner") {
        const ownerCount = await tx.membership.count({
          where: { organizationId, role: "owner", status: "active" },
        });

        if (ownerCount <= 1) {
          throw new ForbiddenException("Impossible de rétrograder le dernier propriétaire de l'entreprise.");
        }
      }

      const updated = await tx.membership.update({
        where: { id: membershipId },
        data: { role: dto.role as any },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "member.update_role",
          resourceType: "membership",
          resourceId: membershipId,
          metadataJson: JSON.stringify({ oldRole: membership.role, newRole: dto.role }),
        },
      });

      return updated;
    });
  }

  public async deactivateMember(
    userContext: UserContext,
    membershipId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    return prismaClient.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: { id: membershipId },
      });

      if (!membership || membership.organizationId !== organizationId) {
        throw new NotFoundException("Membre introuvable.");
      }

      if (membership.role === "owner") {
        const ownerCount = await tx.membership.count({
          where: { organizationId, role: "owner", status: "active" },
        });

        if (ownerCount <= 1) {
          throw new ForbiddenException("Impossible de désactiver le dernier propriétaire de l'entreprise.");
        }
      }

      const updated = await tx.membership.update({
        where: { id: membershipId },
        data: { status: "disabled" },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "member.deactivate",
          resourceType: "membership",
          resourceId: membershipId,
          metadataJson: JSON.stringify({ userId: membership.userId }),
        },
      });

      return updated;
    });
  }
}
