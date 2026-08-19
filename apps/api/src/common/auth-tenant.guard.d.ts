import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Permission, UserContext } from "@jaama/types";
export interface AuthenticatedRequest extends Request {
    userContext: UserContext;
}
export declare const PERMISSION_KEY = "requiredPermission";
export declare const RequirePermission: (permission: Permission) => import("@nestjs/common").CustomDecorator<string>;
export declare class AuthTenantGuard implements CanActivate {
    private sessionRepo;
    private membershipRepo;
    private orgRepo;
    private reflector;
    constructor(reflector?: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
