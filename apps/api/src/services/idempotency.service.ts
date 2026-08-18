import { createHash } from "crypto";
import { InMemoryDatabase } from "@jaama/database";
import { IdempotencyRecord } from "@jaama/types";

export class IdempotencyService {
  public computeHash(payload: unknown): string {
    const jsonStr = JSON.stringify(payload || {});
    return createHash("sha256").update(jsonStr).digest("hex");
  }

  /**
   * Checks or registers idempotency record before executing mutation.
   */
  public async handleIdempotency<T>(
    db: InMemoryDatabase,
    organizationId: string,
    operation: string,
    idempotencyKey: string | undefined,
    payload: unknown,
    executeMutation: () => Promise<T>
  ): Promise<{ result: T; cached: boolean }> {
    if (!idempotencyKey) {
      const result = await executeMutation();
      return { result, cached: false };
    }

    const key = `${organizationId}:${operation}:${idempotencyKey}`;
    const requestHash = this.computeHash(payload);
    const existing = db.idempotencyRecords.get(key);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new Error("Conflit d'idempotence : La même clé a été soumise avec une charge différente.");
      }
      if (existing.status === "COMPLETED" && existing.responseJson) {
        const cachedResult = JSON.parse(existing.responseJson) as T;
        return { result: cachedResult, cached: true };
      }
      if (existing.status === "PROCESSING") {
        throw new Error("Requête idempotente en cours de traitement.");
      }
    }

    // Mark as PROCESSING
    const record: IdempotencyRecord = {
      id: `idemp-${Date.now()}`,
      organizationId,
      operation,
      idempotencyKey,
      requestHash,
      status: "PROCESSING",
      createdAt: new Date(),
    };
    db.idempotencyRecords.set(key, record);

    try {
      const result = await executeMutation();
      record.status = "COMPLETED";
      record.responseJson = JSON.stringify(result);
      db.idempotencyRecords.set(key, record);
      return { result, cached: false };
    } catch (err) {
      db.idempotencyRecords.delete(key);
      throw err;
    }
  }
}
