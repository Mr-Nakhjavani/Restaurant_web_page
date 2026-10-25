import type { MiddlewareHandler } from "hono";
import { getConfig } from "../../config";
import { ApiError } from "../../errors";
import type { AppEnv } from "../types";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateLimitRule {
  name: string;
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
  /** Higher allowance for authenticated API keys (e.g. the voice agent). */
  keyLimit?: number;
}

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/**
 * Fixed-window in-memory rate limiter keyed by API key or client IP.
 * Per-process only — use a shared store (e.g. Redis) when running several instances.
 */
export function rateLimit(rule: RateLimitRule): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!getConfig().RATE_LIMIT_ENABLED) return next();
    const principal = c.get("principal");
    const identity = principal.kind === "api_key" ? `key:${principal.id}` : principal.kind === "session" ? `user:${principal.userId}` : `ip:${c.get("clientIp")}`;
    const limit = principal.kind === "anonymous" ? rule.limit : (rule.keyLimit ?? rule.limit * 5);
    const now = Date.now();
    sweep(now);
    const key = `${rule.name}|${identity}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rule.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, limit - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    c.header("RateLimit-Limit", String(limit));
    c.header("RateLimit-Remaining", String(remaining));
    c.header("RateLimit-Reset", String(resetSeconds));
    if (bucket.count > limit) {
      c.header("Retry-After", String(resetSeconds));
      throw new ApiError("RATE_LIMITED", `Too many requests. Try again in ${resetSeconds} seconds.`, { retryAfterSeconds: resetSeconds, limit, policy: rule.name });
    }
    await next();
  };
}

export function resetRateLimits() {
  buckets.clear();
}
