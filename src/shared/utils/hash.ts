import { createHash } from "node:crypto";

export function createPayloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(normalizeForHash(payload))).digest("hex");
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeForHash(value[key]);
    }

    return normalized;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
