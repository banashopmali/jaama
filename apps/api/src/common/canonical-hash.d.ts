/**
 * Produces a deterministic canonical SHA-256 hash for idempotency payloads.
 * Sorts object keys recursively and sorts array elements to eliminate property order ambiguity.
 */
export declare function hashCanonicalPayload(payload: unknown): string;
