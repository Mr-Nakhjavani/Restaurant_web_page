import type { Context } from "hono";
import { rateLimit } from "../middleware/rate-limit";
import type { AppEnv } from "../types";
import type { VerificationInput } from "../../auth/verification";

export const readLimit = rateLimit({ name: "read", limit: 240, windowMs: 60_000, keyLimit: 1200 });
export const writeLimit = rateLimit({ name: "write", limit: 30, windowMs: 60_000, keyLimit: 300 });
export const lookupLimit = rateLimit({ name: "lookup", limit: 60, windowMs: 60_000, keyLimit: 600 });
export const loginLimit = rateLimit({ name: "login", limit: 10, windowMs: 15 * 60_000, keyLimit: 10 });

export function verificationFrom(c: Context<AppEnv>): VerificationInput {
  return {
    phone: c.req.header("x-customer-phone") ?? null,
    accessToken: c.req.header("x-access-token") ?? null,
  };
}

type Security = Record<string, string[]>[];
export const SECURED_CUSTOMER: Security = [{ CustomerPhone: [] }, { AccessToken: [] }, { ApiKey: [] }];
export const OPTIONAL_KEY: Security = [{}, { ApiKey: [] }];
export const STAFF_ONLY: Security = [{ ApiKey: [] }, { AdminSession: [] }];
