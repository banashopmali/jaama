import { PrismaClient } from "@prisma/client";
import { IdempotencyRecord } from "@jaama/types";
import { prisma as defaultPrisma } from "../prisma.service";

export class PrismaIdempotencyRepository {
  public constructor(private db: PrismaClient = defaultPrisma) {}

  public async findRecord(
    organizationId: string,
    operation: string,
    idempotencyKey: string,
    tx: PrismaClient = this.db
  ): Promise<IdempotencyRecord | null> {
    const record = await tx.idempotencyRecord.findUnique({
      where: {
        organizationId_operation_idempotencyKey: {
          organizationId,
          operation,
          idempotencyKey,
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      organizationId: record.organizationId,
      operation: record.operation,
      idempotencyKey: record.idempotencyKey,
      requestHash: record.requestHash,
      status: record.status as "PROCESSING" | "COMPLETED",
      responseJson: record.responseJson ?? undefined,
      createdAt: record.createdAt,
    };
  }

  public async createProcessingRecord(
    organizationId: string,
    operation: string,
    idempotencyKey: string,
    requestHash: string,
    tx: PrismaClient = this.db
  ): Promise<IdempotencyRecord> {
    const record = await tx.idempotencyRecord.create({
      data: {
        organizationId,
        operation,
        idempotencyKey,
        requestHash,
        status: "PROCESSING",
      },
    });

    return {
      id: record.id,
      organizationId: record.organizationId,
      operation: record.operation,
      idempotencyKey: record.idempotencyKey,
      requestHash: record.requestHash,
      status: "PROCESSING",
      createdAt: record.createdAt,
    };
  }

  public async completeRecord(
    organizationId: string,
    operation: string,
    idempotencyKey: string,
    responseJson: string,
    tx: PrismaClient = this.db
  ): Promise<void> {
    await tx.idempotencyRecord.update({
      where: {
        organizationId_operation_idempotencyKey: {
          organizationId,
          operation,
          idempotencyKey,
        },
      },
      data: {
        status: "COMPLETED",
        responseJson,
      },
    });
  }
}
