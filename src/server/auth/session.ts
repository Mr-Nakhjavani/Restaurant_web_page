import { jwtVerify, SignJWT } from "jose";
import { getConfig } from "../config";

export const SESSION_COOKIE = "bg_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
  role: "admin" | "staff";
}

const secret = () => new TextEncoder().encode(getConfig().ADMIN_SESSION_SECRET);

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("bayt-al-ghaf")
    .setAudience("bayt-al-ghaf-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "bayt-al-ghaf", audience: "bayt-al-ghaf-admin" });
    if (typeof payload.sub !== "string" || (payload.role !== "admin" && payload.role !== "staff")) return null;
    return { sub: payload.sub, email: String(payload.email), name: String(payload.name), role: payload.role };
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
