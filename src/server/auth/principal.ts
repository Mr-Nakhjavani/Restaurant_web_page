import type { Channel } from "@/domain/types";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { hashApiKey, type ApiKeyScope } from "./api-keys";
import { readCookie, SESSION_COOKIE, verifySession } from "./session";

export type Principal =
  | { kind: "anonymous" }
  | { kind: "api_key"; id: string; name: string; scopes: ApiKeyScope[] }
  | { kind: "session"; userId: string; email: string; name: string; role: "admin" | "staff" };

export type Capability = "agent" | "staff" | "admin";

export function hasCapability(p: Principal, cap: Capability): boolean {
  if (p.kind === "anonymous") return false;
  if (p.kind === "session") return cap === "admin" ? p.role === "admin" : cap === "staff" ? true : false;
  if (p.scopes.includes("admin")) return true;
  if (cap === "staff") return p.scopes.includes("staff");
  return p.scopes.includes(cap);
}

export function requireCapability(p: Principal, cap: Capability) {
  if (p.kind === "anonymous") throw new ApiError("AUTHENTICATION_REQUIRED");
  if (!hasCapability(p, cap)) throw new ApiError("FORBIDDEN", `This action requires the “${cap}” role or scope.`);
}

export function isStaff(p: Principal) {
  return hasCapability(p, "staff");
}

export function channelFor(p: Principal): Channel {
  if (p.kind === "session") return "staff";
  if (p.kind === "api_key") return p.scopes.includes("agent") ? "phone" : "staff";
  return "website";
}

export function sourceFor(p: Principal): string {
  if (p.kind === "session") return `staff:${p.email}`;
  if (p.kind === "api_key") return `api_key:${p.name}`;
  return "website";
}

export function actorName(p: Principal): string {
  if (p.kind === "session") return p.email;
  if (p.kind === "api_key") return `api_key:${p.name}`;
  return "customer";
}

/** Resolve the caller from `Authorization: Bearer <key>` / `X-API-Key` or the admin session cookie. */
export async function resolvePrincipal(headers: Headers): Promise<Principal> {
  const auth = headers.get("authorization");
  const rawKey = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : headers.get("x-api-key")?.trim();
  if (rawKey) {
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(rawKey) } });
    if (!key || key.revokedAt) throw new ApiError("INVALID_API_KEY");
    // best-effort usage tracking, at most once a minute
    if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
      prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    }
    return { kind: "api_key", id: key.id, name: key.name, scopes: key.scopes as ApiKeyScope[] };
  }
  const token = readCookie(headers.get("cookie"), SESSION_COOKIE);
  if (token) {
    const claims = await verifySession(token);
    if (claims) return { kind: "session", userId: claims.sub, email: claims.email, name: claims.name, role: claims.role };
  }
  return { kind: "anonymous" };
}
