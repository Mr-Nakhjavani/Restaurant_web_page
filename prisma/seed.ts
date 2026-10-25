/**
 * Seed the database from the canonical data in src/data.
 *
 *   npm run db:seed                 reference data + accounts (+ sample bookings when the DB has none)
 *   npm run db:seed -- --no-sample  reference data + accounts only
 *
 * Reference data (menu, ingredients, sauces, settings, calendar, tables) is overwritten
 * with the canonical values. Operational state (sold-out flags) and all orders,
 * reservations and API keys are preserved.
 */
import { config } from "dotenv";
config({ quiet: true });

import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "@/server/db";
import {
  closures,
  defaultSettings,
  diningTables,
  ingredients,
  menuCategories,
  menuItems,
  restaurantProfile,
  sauces,
  specialPeriods,
} from "@/data";
import { validateCanonicalData } from "@/data/validate";
import { hashPassword } from "@/server/auth/password";
import { hashApiKey } from "@/server/auth/api-keys";
import type { Principal } from "@/server/auth/principal";
import { RESTAURANT_TZ, addDays, toLocalDate } from "@/domain/time";
import { createReservation } from "@/server/services/reservation-service";
import { createOrder } from "@/server/services/order-service";
import { createBulkOrder, quoteBulkOrder } from "@/server/services/bulk-service";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function seedReferenceData() {
  const problems = validateCanonicalData();
  if (problems.length) {
    throw new Error(`Canonical data is invalid; refusing to seed:\n - ${problems.join("\n - ")}`);
  }
  await prisma.$transaction(
    async (tx) => {
      await tx.settings.upsert({
        where: { id: "default" },
        create: { id: "default", data: json(defaultSettings), profile: json(restaurantProfile), updatedBy: "seed" },
        update: { data: json(defaultSettings), profile: json(restaurantProfile), updatedBy: "seed", version: { increment: 1 } },
      });
      for (const c of menuCategories) {
        await tx.menuCategory.upsert({ where: { id: c.id }, create: c, update: c });
      }
      for (const i of ingredients) {
        const data = { name: i.name, arabicName: i.arabicName ?? null, aliases: i.aliases ?? [], description: i.description, diet: i.diet, allergens: i.allergens, mayContain: i.mayContain ?? [], notes: i.notes ?? null };
        await tx.ingredient.upsert({ where: { id: i.id }, create: { id: i.id, ...data }, update: data });
      }
      for (const s of sauces) {
        const data = {
          slug: s.slug,
          name: s.name,
          arabicName: s.arabicName ?? null,
          aliases: s.aliases ?? [],
          kind: s.kind,
          houseSpecial: s.houseSpecial,
          description: s.description,
          flavourProfile: s.flavourProfile,
          spiceLevel: s.spiceLevel,
          batchYield: s.batchYield,
          preparation: s.preparation,
          servedTemperature: s.servedTemperature,
          crossContactNotes: s.crossContactNotes,
          mayContain: s.mayContain ?? [],
          sidePriceFils: s.sidePriceFils,
        };
        await tx.sauce.upsert({ where: { id: s.id }, create: { id: s.id, ...data }, update: data });
      }
      for (const s of sauces) {
        await tx.sauceIngredient.deleteMany({ where: { sauceId: s.id } });
        await tx.sauceComponent.deleteMany({ where: { sauceId: s.id } });
        await tx.sauceIngredient.createMany({ data: s.ingredients.map((i, position) => ({ sauceId: s.id, ingredientId: i.ingredientId, quantity: i.quantity, position })) });
        if (s.includesSauces?.length) {
          await tx.sauceComponent.createMany({ data: s.includesSauces.map((n) => ({ sauceId: s.id, componentId: n.sauceId, quantity: n.quantity })) });
        }
      }
      for (const item of menuItems) {
        const data = {
          slug: item.slug,
          name: item.name,
          arabicName: item.arabicName,
          aliases: item.aliases,
          categoryId: item.categoryId,
          kind: item.kind,
          shortDescription: item.shortDescription,
          description: item.description,
          priceFils: item.priceFils,
          portion: json(item.portion),
          cookingMethod: item.cookingMethod,
          preparationStyle: item.preparationStyle,
          spiceLevel: item.spiceLevel,
          spiceAdjustment: json(item.spiceAdjustment),
          prepTimeMinutes: item.prepTimeMinutes,
          kitchenPortions: item.kitchenPortions,
          customizations: json(item.customizations),
          mayContain: item.mayContain,
          crossContactNotes: item.crossContactNotes,
          fulfilment: json(item.fulfilment),
          bulk: json(item.bulk),
          maxPerOrder: item.maxPerOrder,
          dailyLimit: item.dailyLimit,
          availabilityRules: json(item.availabilityRules),
          availabilityNote: item.availabilityNote,
          pairings: item.pairings,
          customerQA: json(item.customerQA),
          featured: item.featured,
          signature: item.signature,
          groupMeal: item.groupMeal,
          imageSrc: item.image.src,
          imageAlt: item.image.alt,
          sortOrder: item.sortOrder,
        };
        await tx.menuItem.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
        await tx.menuItemIngredient.deleteMany({ where: { itemId: item.id } });
        await tx.menuItemSauce.deleteMany({ where: { itemId: item.id } });
        await tx.menuItemIngredient.createMany({
          data: item.ingredients.map((i, position) => ({ itemId: item.id, ingredientId: i.ingredientId, quantity: i.quantity, removable: !!i.removable, note: i.note ?? null, position })),
        });
        if (item.sauces.length) {
          await tx.menuItemSauce.createMany({ data: item.sauces.map((s, position) => ({ itemId: item.id, sauceId: s.sauceId, role: s.role, note: s.note ?? null, position })) });
        }
      }
      const canonicalIds = new Set(menuItems.map((i) => i.id));
      await tx.menuItem.updateMany({ where: { id: { notIn: [...canonicalIds] } }, data: { isVisible: false } });
      for (const p of specialPeriods) {
        const data = { slug: p.slug, type: p.type, name: p.name, startDate: p.startDate, endDate: p.endDate, provisional: p.provisional, notes: p.notes, hoursOverride: p.hoursOverride ? json(p.hoursOverride) : Prisma.JsonNull };
        await tx.specialPeriod.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
      }
      for (const c of closures) {
        await tx.closure.upsert({ where: { id: c.id }, create: c, update: c });
      }
      for (const t of diningTables) {
        const data = { code: t.code, area: t.area, minCovers: t.minCovers, maxCovers: t.maxCovers, onlineBookable: t.onlineBookable, features: t.features, sortOrder: t.sortOrder, active: true };
        await tx.diningTable.upsert({ where: { id: t.id }, create: { id: t.id, ...data }, update: data });
      }
    },
    { timeout: 60_000 },
  );
}

export async function seedAccounts() {
  const accounts = [
    { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: "Restaurant Admin", role: "admin" },
    { email: process.env.SEED_STAFF_EMAIL, password: process.env.SEED_STAFF_PASSWORD, name: "Front-of-house Staff", role: "staff" },
  ];
  for (const a of accounts) {
    if (!a.email || !a.password) continue;
    const email = a.email.toLowerCase();
    const exists = await prisma.adminUser.findUnique({ where: { email } });
    if (!exists) await prisma.adminUser.create({ data: { email, name: a.name, role: a.role, passwordHash: await hashPassword(a.password) } });
  }
  const devKey = process.env.SEED_AGENT_API_KEY;
  if (devKey) {
    const keyHash = hashApiKey(devKey);
    const exists = await prisma.apiKey.findUnique({ where: { keyHash } });
    if (!exists) {
      await prisma.apiKey.create({ data: { name: "Local voice agent (dev seed)", prefix: devKey.slice(0, 12), keyHash, scopes: ["agent"], createdBy: "seed" } });
    }
  }
}

/** Realistic sample bookings around "now" so the admin screens and capacity rules have data. */
export async function seedSampleData() {
  if ((await prisma.reservation.count()) > 0 || (await prisma.order.count()) > 0) return { skipped: true };
  const staff: Principal = { kind: "session", userId: "seed", email: "seed@baytalghaf.example", name: "Seed", role: "admin" };
  const now = DateTime.now().setZone(RESTAURANT_TZ);
  const today = toLocalDate(now);
  const nextWeekday = (iso: number) => {
    for (let i = 1; i <= 7; i++) {
      const d = addDays(today, i);
      if (DateTime.fromISO(d, { zone: RESTAURANT_TZ }).weekday === iso) return d;
    }
    return addDays(today, 1);
  };
  const friday = nextWeekday(5);
  const tomorrow = addDays(today, 1);
  const guests = [
    ["Mariam Al Suwaidi", "050 412 7781"],
    ["Rashid Al Ketbi", "055 908 2214"],
    ["Priya Menon", "052 761 4402"],
    ["James Whitfield", "+44 7911 123456"],
    ["Noura Al Mansoori", "056 330 9917"],
    ["Omar Haddad", "058 221 0045"],
    ["Fatima Al Hammadi", "050 663 1290"],
    ["Daniel Okafor", "054 118 7623"],
  ] as const;
  const results: string[] = [];
  const tryCreate = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      results.push(`ok   ${label}`);
    } catch (e) {
      results.push(`skip ${label}: ${(e as Error).message}`);
    }
  };
  // Friday evening: fill every window table at 20:00 (demonstrates SEATING_PREFERENCE_UNAVAILABLE).
  const windowParties = [2, 2, 4, 3, 4, 6];
  for (let i = 0; i < windowParties.length; i++) {
    const [name, phone] = guests[i % guests.length];
    await tryCreate(`window ${friday} 20:00`, () =>
      createReservation({ date: friday, time: "20:00", partySize: windowParties[i], seatingPreference: "window", customer: { name, phone: phone.replace(/\d{2}$/, String(10 + i)) } }, staff, now),
    );
  }
  await tryCreate("terrace family", () => createReservation({ date: tomorrow, time: "19:30", partySize: 5, seatingPreference: "terrace", customer: { name: "Noura Al Mansoori", phone: "056 330 9917" }, highChairs: 1, childrenCount: 2, occasion: "family_gathering" }, staff, now));
  await tryCreate("majlis group", () => createReservation({ date: addDays(today, 3), time: "20:00", partySize: 9, seatingPreference: "majlis", customer: { name: "Rashid Al Ketbi", phone: "055 908 2214" }, specialRequests: "Gahwa served on arrival, please." }, staff, now));
  await tryCreate("large group pending", () => createReservation({ date: addDays(today, 5), time: "13:00", partySize: 16, seatingPreference: "no_preference", customer: { name: "Daniel Okafor", phone: "054 118 7623" }, occasion: "business" }, staff, now));
  await tryCreate("anniversary", () => createReservation({ date: tomorrow, time: "21:00", partySize: 2, seatingPreference: "indoor", customer: { name: "James Whitfield", phone: "+44 7911 123456" }, occasion: "anniversary", specialRequests: "Quiet table if possible" }, staff, now));
  await tryCreate("pickup lunch tomorrow", () =>
    createOrder(
      {
        items: [
          { itemId: "mi_lamb_machboos", quantity: 2, options: ["hashu_no_raisins"] },
          { itemId: "mi_luqaimat", quantity: 1, options: ["syrup_side"] },
          { itemId: "mi_karak", quantity: 2 },
        ],
        fulfilment: { type: "pickup", date: tomorrow, time: "13:30" },
        customer: { name: "Priya Menon", phone: "052 761 4402" },
      },
      staff,
      now,
    ),
  );
  await tryCreate("delivery dinner tomorrow", () =>
    createOrder(
      {
        items: [
          { itemId: "mi_chicken_machboos", quantity: 3 },
          { itemId: "mi_salatat_al_bait", quantity: 1 },
          { itemId: "mi_limon_nana", quantity: 3 },
        ],
        fulfilment: { type: "delivery", date: tomorrow, time: "19:45" },
        deliveryAddress: { emirate: "Dubai", area: "Al Karama", building: "Al Attar Tower", street: "Sheikh Khalifa Bin Zayed Street", unit: "Apt 1204", landmark: "Opposite Karama Park" },
        customer: { name: "Omar Haddad", phone: "058 221 0045" },
      },
      staff,
      now,
    ),
  );
  await tryCreate("friday platter", () =>
    createOrder({ items: [{ itemId: "mi_friday_platter", quantity: 1 }], fulfilment: { type: "pickup", date: friday, time: "13:00" }, customer: { name: "Fatima Al Hammadi", phone: "050 663 1290" } }, staff, now),
  );
  await tryCreate("catering office lunch", async () => {
    const quote = await quoteBulkOrder(
      {
        items: [
          { itemId: "mi_office_lunch_box", quantity: 30, options: ["main_chicken"] },
          { itemId: "mi_office_lunch_box", quantity: 10, options: ["main_vegetable"] },
        ],
        fulfilment: { type: "delivery", date: addDays(today, 4), time: "12:30" },
        deliveryArea: "Business Bay",
        guestCount: 40,
        eventType: "office_lunch",
      },
      staff,
      now,
    );
    if (!quote.feasible) throw new Error(`quote ${quote.status}`);
    await createBulkOrder(
      {
        quoteId: quote.quoteId,
        customer: { name: "Mariam Al Suwaidi", phone: "050 412 7781", email: "mariam@example.com" },
        companyName: "Creekside Consulting (sample)",
        deliveryAddress: { emirate: "Dubai", area: "Business Bay", building: "Bay Square Building 7", street: "Bay Square", unit: "Office 402" },
      },
      staff,
      now,
    );
  });
  return { skipped: false, results };
}

async function main() {
  const started = Date.now();
  await seedReferenceData();
  await seedAccounts();
  const sample = process.argv.includes("--no-sample") || process.env.SEED_SAMPLE_DATA === "false" ? { skipped: true } : await seedSampleData();
  console.log(`Seeded ${menuItems.length} menu items, ${ingredients.length} ingredients, ${sauces.length} sauces, ${diningTables.length} tables in ${Date.now() - started} ms.`);
  if ("results" in sample && sample.results) for (const r of sample.results) console.log("  sample:", r);
  else console.log("  sample data: skipped");
}

if (process.argv[1]?.includes("seed")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
