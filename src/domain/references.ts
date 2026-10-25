import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";

export const REFERENCE_PREFIXES = {
  order: "ORD",
  bulkOrder: "CAT",
  reservation: "RES",
  quote: "QTE",
} as const;
export type ReferenceKind = keyof typeof REFERENCE_PREFIXES;

/** Human- and voice-friendly reference: prefix + 6 digits, e.g. ORD-482913. */
export function generateReference(kind: ReferenceKind): string {
  return `${REFERENCE_PREFIXES[kind]}-${String(randomInt(100000, 1000000))}`;
}

/**
 * Normalise a reference typed or spoken by a customer: case-insensitive,
 * tolerant of spaces/dashes and of a missing prefix ("ord 482 913" → "ORD-482913").
 */
export function normaliseReference(input: string, kind: ReferenceKind | ReferenceKind[]): string | null {
  const kinds = Array.isArray(kind) ? kind : [kind];
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^([A-Z]{3})?(\d{6})$/.exec(compact);
  if (!m) return null;
  const prefix = m[1];
  if (prefix) {
    const match = kinds.find((k) => REFERENCE_PREFIXES[k] === prefix);
    if (!match) return null;
    return `${prefix}-${m[2]}`;
  }
  return `${REFERENCE_PREFIXES[kinds[0]]}-${m[2]}`;
}

export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
