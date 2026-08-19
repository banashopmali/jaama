import { PrismaClient } from "@prisma/client";

export class PrismaService extends PrismaClient {
  private static instance: PrismaService;

  public constructor() {
    super({
      log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }
}

export const prisma = PrismaService.getInstance();
