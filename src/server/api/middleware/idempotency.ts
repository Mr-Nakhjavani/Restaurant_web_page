import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Context } from "hono";
import { prisma } from "../../db";
import { ApiError } from "../../errors";
import type { AppEnv } from "../types";

const TTL_HOURS = 24;

function scopeFor(c: Context<AppEnv>, route: string) {
  const p = c.get("principal");
  const who = p.kind === "api_key" ? `key:${p.id}` : p.kind === "session" ? `user:${p.userId}` : "public";
  return `${route}|${who}`;
}

/**
 * Wrap a create operation with Idempotency-Key semantics:
 *  - same key + same body  → the stored response is replayed (header Idempotent-Replayed: true)
 *  - same key + other body → 422 IDEMPOTENCY_KEY_REUSED
 *  - key still processing  → 409 IDEMPOTENCY_REQUEST_IN_PROGRESS
 * Only successful (2xx) results are stored; failures can be retried with the same key.
 */
export async function withIdempotency<T extends object>(
  c: Context<AppEnv>,
  route: string,
  body: unknown,
  run: () => Promise<{ status: 200 | 201; body: T }>,
): Promise<Response> {
  const key = c.req.header("idempotency-key")?.trim();
  if (!key) {
    const r = await run();
    return c.json(r.body, r.status);
  }
  if (key.length < 8 || key.length > 128) throw new ApiError("VALIDATION_ERROR", "Idempotency-Key must be 8–128 characters.", { field: "Idempotency-Key" });
  const scope = scopeFor(c, route);
  const requestHash = createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
  const now = c.get("now");
  await prisma.idempotencyRecord.deleteMany({ where: { scope, key, expiresAt: { lt: new Date() } } });
  const inserted = await prisma.idempotencyRecord.createMany({
    data: [{ scope, key, requestHash, state: "processing", expiresAt: now.plus({ hours: TTL_HOURS }).toJSDate() }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) {
    const existing = await prisma.idempotencyRecord.findUnique({ where: { scope_key: { scope, key } } });
    if (!existing) throw new ApiError("IDEMPOTENCY_REQUEST_IN_PROGRESS");
    if (existing.requestHash !== requestHash) throw new ApiError("IDEMPOTENCY_KEY_REUSED");
    if (existing.state !== "completed") throw new ApiError("IDEMPOTENCY_REQUEST_IN_PROGRESS");
    c.header("Idempotent-Replayed", "true");
    return c.json(existing.responseBody as T, (existing.responseStatus ?? 200) as 200 | 201);
  }
  try {
    const r = await run();
    await prisma.idempotencyRecord.update({
      where: { scope_key: { scope, key } },
      data: { state: "completed", responseStatus: r.status, responseBody: r.body as unknown as Prisma.InputJsonValue },
    });
    return c.json(r.body, r.status);
  } catch (e) {
    await prisma.idempotencyRecord.delete({ where: { scope_key: { scope, key } } }).catch(() => undefined);
    throw e;
  }
}
