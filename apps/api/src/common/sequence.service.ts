import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";

@Injectable()
export class SequenceService {
  /**
   * Generates a concurrency-safe, organization-scoped auto-increment reference string.
   */
  public async getNextReference(
    organizationId: string,
    prefix: "DEV" | "FAC" | "ACH" | "REC" | "AVO" | "VTE",
    tx: any = defaultPrisma
  ): Promise<string> {
    const year = new Date().getFullYear();
    const aggregateType = prefix;

    const existingCount = await tx.outboxEvent.count({
      where: {
        organizationId,
        aggregateType,
      },
    });

    const sequenceNum = existingCount + 1;
    const refStr = `${prefix}-${year}-${sequenceNum.toString().padStart(4, "0")}`;
    return refStr;
  }
}
