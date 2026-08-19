import { User, Session } from "@jaama/types";
export declare class RegisterDto {
    email: string;
    name: string;
    password: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
/**
 * Generates a cryptographically secure 256-bit entropy bearer token (CSPRNG).
 */
export declare function generateCsprngSessionToken(): string;
export declare class AuthService {
    private sessionRepo;
    register(dto: RegisterDto, prismaClient?: import("@jaama/database").PrismaService): Promise<{
        user: User;
        session: Session;
    }>;
    login(dto: LoginDto, prismaClient?: import("@jaama/database").PrismaService): Promise<{
        user: User;
        session: Session;
    }>;
    logout(token: string): Promise<boolean>;
    validateToken(token: string): Promise<{
        session: Session;
        user: User;
    } | null>;
}
