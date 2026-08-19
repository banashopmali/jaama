"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashCanonicalPayload = hashCanonicalPayload;
const crypto_1 = require("crypto");
/**
 * Produces a deterministic canonical SHA-256 hash for idempotency payloads.
 * Sorts object keys recursively and sorts array elements to eliminate property order ambiguity.
 */
function hashCanonicalPayload(payload) {
    const normalized = normalizeValue(payload);
    const jsonString = JSON.stringify(normalized);
    return (0, crypto_1.createHash)("sha256").update(jsonString).digest("hex");
}
function normalizeValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (Array.isArray(value)) {
        const normalizedArray = value.map(normalizeValue);
        // Deterministic sort for arrays of objects with 'productId' or 'method'
        return normalizedArray.sort((a, b) => {
            const keyA = String(a?.productId || a?.method || JSON.stringify(a));
            const keyB = String(b?.productId || b?.method || JSON.stringify(b));
            return keyA.localeCompare(keyB);
        });
    }
    if (typeof value === "object") {
        const sortedObj = {};
        const keys = Object.keys(value).sort();
        for (const key of keys) {
            sortedObj[key] = normalizeValue(value[key]);
        }
        return sortedObj;
    }
    return value;
}
