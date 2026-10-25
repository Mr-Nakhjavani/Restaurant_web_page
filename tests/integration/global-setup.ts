/**
 * Prepares the dedicated integration-test database: applies migrations, empties
 * every table and seeds the canonical reference data. Refuses to run against a
 * database whose name does not end in "_test".
 */
import { execSync } from "node:child_process";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://bayt:bayt_dev_password@localhost:5433/bayt_al_ghaf_test?schema=public";
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) throw new Error(`Refusing to reset "${dbName}": integration tests only run against a *_test database.`);
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  process.env.DATABASE_URL = url;
  // Global setup runs outside the test workers, so mirror the seed-related env from vitest.config.ts.
  process.env.SEED_ADMIN_EMAIL ??= "admin@baytalghaf.example";
  process.env.SEED_ADMIN_PASSWORD ??= "Test-Admin-Password-1";
  process.env.SEED_STAFF_EMAIL ??= "staff@baytalghaf.example";
  process.env.SEED_STAFF_PASSWORD ??= "Test-Staff-Password-1";
  process.env.SEED_AGENT_API_KEY ??= "bg_test_agent_key_0123456789";
  const { resetDatabase } = await import("./db-reset");
  await resetDatabase();
}
