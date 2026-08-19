import { AuthService, RegisterDto, LoginDto } from "./auth.service";
export declare class AuthController {
    private service;
    constructor(authService?: AuthService);
    register(body: RegisterDto): Promise<{
        user: import("@jaama/types").User;
        session: import("@jaama/types").Session;
    }>;
    login(body: LoginDto): Promise<{
        user: import("@jaama/types").User;
        session: import("@jaama/types").Session;
    }>;
    logout(req: any): Promise<{
        success: boolean;
    }>;
    getMe(req: any): Promise<{
        session: import("@jaama/types").Session;
        user: import("@jaama/types").User;
    }>;
}
