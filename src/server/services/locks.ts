import type { PrismaClient } from "@prisma/client";
import type { Tx } from "../db";

/**
 * Run `fn` in a transaction while holding PostgreSQL transaction-scoped advisory
 * locks for the given keys (e.g. "reservations:2026-10-30"). Concurrent writers
 * for the same date are serialised; locks are released at commit/rollback.
 * Keys are sorted to avoid deadlocks when several dates are locked.
 */
export async function withDateLocks<T>(db: PrismaClient, keys: string[], fn: (tx: Tx) => Promise<T>): Promise<T> {
  const sorted = [...new Set(keys)].sort();
  return db.$transaction(
    async (tx) => {
      for (const key of sorted) {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${key}))) AS l`;
      }
      return fn(tx);
    },
    { maxWait: 10_000, timeout: 20_000, isolationLevel: "ReadCommitted" },
  );
}
