/**
 * Resets a *_test or *_e2e database: applies migrations, truncates all tables and seeds
 * canonical reference data and accounts. Refuses to touch any other database.
 *   DATABASE_URL=postgresql://…/bayt_al_ghaf_e2e npx tsx scripts/reset-test-db.ts
 */
import { execSync } from "node:child_process";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const db = new URL(url).pathname.replace(/^\//, "");
  if (!/_(test|e2e)$/.test(db)) throw new Error(`Refusing to reset "${db}" — only *_test or *_e2e databases.`);
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
  const { resetDatabase } = await import("../tests/integration/db-reset");
  await resetDatabase();
  const { prisma } = await import("@/server/db");
  await prisma.$disconnect();
  console.log(`reset ${db}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
