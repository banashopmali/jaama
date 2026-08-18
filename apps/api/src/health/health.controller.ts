import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { prisma } from "@jaama/database";
import { getLivenessSignal, getReadinessSignal } from "@jaama/config";

@Controller("health")
export class HealthController {
  @Get("liveness")
  public getLiveness() {
    return getLivenessSignal();
  }

  @Get("readiness")
  public async getReadiness(@Res() res: Response) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const signal = getReadinessSignal(true);
      return res.status(HttpStatus.OK).json(signal);
    } catch {
      const signal = getReadinessSignal(false);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(signal);
    }
  }
}
