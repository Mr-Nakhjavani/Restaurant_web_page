import { prisma } from "@/server/db";

const TABLES = [
  "OrderEvent",
  "OrderItem",
  "Order",
  "BulkQuote",
  "ReservationEvent",
  "Reservation",
  "IdempotencyRecord",
  "AuditLog",
  "ApiKey",
  "AdminUser",
  "MenuItemIngredient",
  "MenuItemSauce",
  "MenuItem",
  "MenuCategory",
  "SauceIngredient",
  "SauceComponent",
  "Sauce",
  "Ingredient",
  "SpecialPeriod",
  "Closure",
  "DiningTable",
  "Settings",
];

/** Truncate everything in the *_test database and re-seed canonical reference data + accounts. */
export async function resetDatabase() {
  const db = (await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`)[0].current_database;
  if (!db.endsWith("_test") && !db.endsWith("_e2e")) throw new Error(`Refusing to truncate ${db}`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  const { seedReferenceData, seedAccounts } = await import("../../prisma/seed");
  await seedReferenceData();
  await seedAccounts();
}

/** Remove transactional data only (orders, reservations, quotes…) between test files. */
export async function clearTransactions() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "OrderEvent", "OrderItem", "Order", "BulkQuote", "ReservationEvent", "Reservation", "IdempotencyRecord" RESTART IDENTITY CASCADE`);
}
