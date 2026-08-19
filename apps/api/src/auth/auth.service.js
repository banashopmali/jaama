"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.LoginDto = exports.RegisterDto = void 0;
exports.generateCsprngSessionToken = generateCsprngSessionToken;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const database_1 = require("@jaama/database");
const auth_1 = require("@jaama/auth");
class RegisterDto {
    email;
    name;
    password;
}
exports.RegisterDto = RegisterDto;
class LoginDto {
    email;
    password;
}
exports.LoginDto = LoginDto;
/**
 * Generates a cryptographically secure 256-bit entropy bearer token (CSPRNG).
 */
function generateCsprngSessionToken() {
    return (0, crypto_1.randomBytes)(32).toString("base64url");
}
let AuthService = class AuthService {
    sessionRepo = new database_1.PrismaSessionRepository(database_1.prisma);
    async register(dto, prismaClient = database_1.prisma) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        if (!normalizedEmail || !dto.name || !dto.password || dto.password.length < 8) {
            throw new common_1.BadRequestException("Données d'inscription invalides. Le mot de passe doit comporter 8 caractères minimum.");
        }
        const existingUser = await prismaClient.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            throw new common_1.BadRequestException("Cet adresse email est déjà utilisée.");
        }
        const passwordHash = await (0, auth_1.hashPassword)(dto.password);
        const userId = `user-${(0, crypto_1.randomUUID)()}`;
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
        const token = generateCsprngSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const session = await this.sessionRepo.createSession(userRow.id, token, expiresAt);
        return {
            user: {
                id: userRow.id,
                email: userRow.email,
                name: userRow.name,
                status: userRow.status,
                createdAt: userRow.createdAt,
            },
            session,
        };
    }
    async login(dto, prismaClient = database_1.prisma) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        const GENERIC_ERROR = "Identifiants invalides.";
        const userRow = await prismaClient.user.findUnique({
            where: { email: normalizedEmail },
            include: { credential: true },
        });
        if (!userRow || userRow.status === "disabled" || !userRow.credential) {
            throw new common_1.UnauthorizedException(GENERIC_ERROR);
        }
        const valid = await (0, auth_1.verifyPassword)(dto.password, userRow.credential.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException(GENERIC_ERROR);
        }
        const token = generateCsprngSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const session = await this.sessionRepo.createSession(userRow.id, token, expiresAt);
        return {
            user: {
                id: userRow.id,
                email: userRow.email,
                name: userRow.name,
                status: userRow.status,
                createdAt: userRow.createdAt,
            },
            session,
        };
    }
    async logout(token) {
        if (!token)
            return false;
        return this.sessionRepo.revokeSession(token);
    }
    async validateToken(token) {
        if (!token)
            return null;
        const session = await this.sessionRepo.findByToken(token);
        if (!session)
            return null;
        const userRow = await database_1.prisma.user.findUnique({ where: { id: session.userId } });
        if (!userRow || userRow.status === "disabled")
            return null;
        return {
            session,
            user: {
                id: userRow.id,
                email: userRow.email,
                name: userRow.name,
                status: userRow.status,
                createdAt: userRow.createdAt,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
