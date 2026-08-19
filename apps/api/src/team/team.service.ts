import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { hashPassword } from "@jaama/auth";
import * as crypto from "crypto";

export class InviteMemberDto {
  email!: string;
  role!: "owner" | "admin" | "employe" | "comptable" | "vendeur";
  name?: string;
}

export class UpdateMemberRoleDto {
  role!: "owner" | "admin" | "employe" | "comptable" | "vendeur";
}

export class AcceptInviteDto {
  token!: string;
  name?: string;
  password?: string;
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
      // 1. Check if active membership already exists
      const existingUser = await tx.user.findUnique({ where: { email: emailClean } });
      if (existingUser) {
        const existingMembership = await tx.membership.findUnique({
          where: {
            organizationId_userId: {
              organizationId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMembership && existingMembership.status === "active") {
          throw new BadRequestException("Cet utilisateur est déjà membre actif de l'organisation.");
        }
      }

      // 2. Generate CSPRNG token & tokenHash
      const plaintextToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(plaintextToken).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const validRoles = ["owner", "admin", "vendeur", "comptable", "employe"];
      const finalRole = validRoles.includes(dto.role) ? dto.role : "vendeur";

      const invitation = await tx.organizationInvitation.create({
        data: {
          organizationId,
          email: emailClean,
          role: finalRole as any,
          tokenHash,
          expiresAt,
          invitedByUserId: userContext.actorId,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "member.invite",
          resourceType: "organization_invitation",
          resourceId: invitation.id,
          metadataJson: JSON.stringify({ email: emailClean, role: dto.role }),
        },
      });

      return {
        id: invitation.id,
        email: emailClean,
        role: dto.role,
        expiresAt,
        inviteToken: plaintextToken,
      };
    });
  }

  public async acceptInvite(dto: AcceptInviteDto & { inviteToken?: string }, prismaClient = defaultPrisma): Promise<any> {
    const tokenVal = dto.token || dto.inviteToken;
    if (!tokenVal || !tokenVal.trim()) {
      throw new BadRequestException("Jeton d'invitation manquant.");
    }

    const tokenHash = crypto.createHash("sha256").update(tokenVal.trim()).digest("hex");

    return prismaClient.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation) {
        throw new NotFoundException("Invitation introuvable ou jeton invalide.");
      }

      if (invitation.acceptedAt) {
        throw new BadRequestException("Cette invitation a déjà été acceptée.");
      }

      if (invitation.expiresAt < new Date()) {
        throw new BadRequestException("Cette invitation a expiré.");
      }

      // Find or create User
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (!user) {
        const userName = dto.name ? dto.name.trim() : invitation.email.split("@")[0];
        user = await tx.user.create({
          data: {
            email: invitation.email,
            name: userName,
          },
        });

        const rawPassword = dto.password || "JaamaDefaultPassword2026!";
        const passwordHash = await hashPassword(rawPassword);
        await tx.credential.create({
          data: {
            userId: user.id,
            passwordHash,
          },
        });
      }

      // Upsert Membership
      const membership = await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
        create: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          status: "active",
        },
        update: {
          role: invitation.role,
          status: "active",
        },
      });

      // Mark invitation as accepted
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          organizationId: invitation.organizationId,
          actorId: user.id,
          action: "member.accept_invite",
          resourceType: "organization_invitation",
          resourceId: invitation.id,
          metadataJson: JSON.stringify({ userId: user.id, role: invitation.role }),
        },
      });

      return {
        status: "SUCCESS",
        organizationId: invitation.organizationId,
        userId: user.id,
        membershipId: membership.id,
        role: membership.role,
        membership,
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
