import { createHash, randomBytes } from "node:crypto";

export const API_KEY_SCOPES = ["agent", "staff", "admin"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** New secret API key, e.g. bg_live_3fK9…; only its SHA-256 hash is stored. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `bg_live_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
