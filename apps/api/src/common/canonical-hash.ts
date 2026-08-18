import { createHash } from "crypto";

/**
 * Produces a deterministic canonical SHA-256 hash for idempotency payloads.
 * Sorts object keys recursively and sorts array elements to eliminate property order ambiguity.
 */
export function hashCanonicalPayload(payload: unknown): string {
  const normalized = normalizeValue(payload);
  const jsonString = JSON.stringify(normalized);
  return createHash("sha256").update(jsonString).digest("hex");
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const normalizedArray = value.map(normalizeValue);
    // Deterministic sort for arrays of objects with 'productId' or 'method'
    return normalizedArray.sort((a: any, b: any) => {
      const keyA = String(a?.productId || a?.method || JSON.stringify(a));
      const keyB = String(b?.productId || b?.method || JSON.stringify(b));
      return keyA.localeCompare(keyB);
    });
  }

  if (typeof value === "object") {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(value as object).sort();
    for (const key of keys) {
      sortedObj[key] = normalizeValue((value as Record<string, unknown>)[key]);
    }
    return sortedObj;
  }

  return value;
}
