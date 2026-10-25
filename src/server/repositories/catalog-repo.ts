import type { Prisma, PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { buildCatalog, type Catalog, type CatalogItem, type ItemAvailabilityStatus } from "@/domain/catalog";
import type { CalendarContext } from "@/domain/hours";
import { SettingsSchema, type RestaurantSettings } from "@/domain/settings";
import { RESTAURANT_TZ } from "@/domain/time";
import type {
  AvailabilityRule,
  ClosureDef,
  DiningTableDef,
  IngredientDef,
  ItemKind,
  ItemSauceRole,
  MenuItemDef,
  SauceDef,
  SauceKind,
  SeatingArea,
  SpecialPeriodDef,
  SpecialPeriodType,
  SpiceLevel,
  Allergen,
  DietClass,
} from "@/domain/types";
import {
  closures as seedClosures,
  defaultSettings,
  diningTables as seedTables,
  ingredients as seedIngredients,
  menuCategories as seedCategories,
  menuItems as seedItems,
  restaurantProfile,
  sauces as seedSauces,
  specialPeriods as seedPeriods,
  type RestaurantProfile,
} from "@/data";
import { prisma } from "../db";

type Db = PrismaClient | Prisma.TransactionClient;

const itemInclude = {
  ingredients: { orderBy: { position: "asc" } },
  sauces: { orderBy: { position: "asc" } },
} satisfies Prisma.MenuItemInclude;

type ItemRow = Prisma.MenuItemGetPayload<{ include: typeof itemInclude }>;

export function mapItemRow(row: ItemRow): CatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    arabicName: row.arabicName,
    aliases: row.aliases,
    categoryId: row.categoryId,
    kind: row.kind as ItemKind,
    shortDescription: row.shortDescription,
    description: row.description,
    priceFils: row.priceFils,
    portion: row.portion as unknown as MenuItemDef["portion"],
    cookingMethod: row.cookingMethod,
    preparationStyle: row.preparationStyle,
    spiceLevel: row.spiceLevel as SpiceLevel,
    spiceAdjustment: row.spiceAdjustment as unknown as MenuItemDef["spiceAdjustment"],
    prepTimeMinutes: row.prepTimeMinutes,
    kitchenPortions: row.kitchenPortions,
    ingredients: row.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: i.quantity,
      ...(i.removable ? { removable: true } : {}),
      ...(i.note ? { note: i.note } : {}),
    })),
    sauces: row.sauces.map((s) => ({ sauceId: s.sauceId, role: s.role as ItemSauceRole, ...(s.note ? { note: s.note } : {}) })),
    customizations: row.customizations as unknown as MenuItemDef["customizations"],
    mayContain: row.mayContain as Allergen[],
    crossContactNotes: row.crossContactNotes,
    fulfilment: row.fulfilment as unknown as MenuItemDef["fulfilment"],
    bulk: row.bulk as unknown as MenuItemDef["bulk"],
    maxPerOrder: row.maxPerOrder,
    dailyLimit: row.dailyLimit,
    availabilityRules: row.availabilityRules as unknown as AvailabilityRule[],
    availabilityNote: row.availabilityNote,
    pairings: row.pairings,
    customerQA: row.customerQA as unknown as MenuItemDef["customerQA"],
    featured: row.featured,
    signature: row.signature,
    groupMeal: row.groupMeal,
    image: { src: row.imageSrc, alt: row.imageAlt },
    sortOrder: row.sortOrder,
    availabilityStatus: row.availabilityStatus as ItemAvailabilityStatus,
    soldOutUntil: row.soldOutUntil ? DateTime.fromJSDate(row.soldOutUntil).setZone(RESTAURANT_TZ).toISO() : null,
    isVisible: row.isVisible,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadCatalog(db: Db = prisma): Promise<Catalog> {
  const [categories, items, ingredients, sauces] = await Promise.all([
    db.menuCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.menuItem.findMany({ include: itemInclude }),
    db.ingredient.findMany(),
    db.sauce.findMany({
      include: { ingredients: { orderBy: { position: "asc" } }, components: true },
    }),
  ]);
  return buildCatalog({
    categories: categories.map((c) => ({ ...c })),
    items: items.map(mapItemRow),
    ingredients: ingredients.map(
      (i): IngredientDef => ({
        id: i.id,
        name: i.name,
        ...(i.arabicName ? { arabicName: i.arabicName } : {}),
        aliases: i.aliases,
        description: i.description,
        diet: i.diet as DietClass,
        allergens: i.allergens as Allergen[],
        mayContain: i.mayContain as Allergen[],
        ...(i.notes ? { notes: i.notes } : {}),
      }),
    ),
    sauces: sauces.map(
      (s): SauceDef => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        ...(s.arabicName ? { arabicName: s.arabicName } : {}),
        aliases: s.aliases,
        kind: s.kind as SauceKind,
        houseSpecial: s.houseSpecial,
        description: s.description,
        flavourProfile: s.flavourProfile,
        spiceLevel: s.spiceLevel as SpiceLevel,
        ingredients: s.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity })),
        includesSauces: s.components.map((c) => ({ sauceId: c.componentId, quantity: c.quantity })),
        batchYield: s.batchYield,
        preparation: s.preparation,
        servedTemperature: s.servedTemperature,
        crossContactNotes: s.crossContactNotes,
        mayContain: s.mayContain as Allergen[],
        sidePriceFils: s.sidePriceFils,
      }),
    ),
  });
}

/** Catalogue built directly from canonical seed data (used for documentation snapshots and unit tests). */
export function catalogFromSeed(): Catalog {
  return buildCatalog({
    categories: seedCategories,
    items: seedItems.map((i) => ({ ...i, availabilityStatus: "available", soldOutUntil: null, isVisible: true, updatedAt: null })),
    ingredients: seedIngredients,
    sauces: seedSauces.map((s) => ({ ...s, includesSauces: s.includesSauces ?? [] })),
  });
}

export interface RestaurantContext extends CalendarContext {
  profile: RestaurantProfile;
  tables: DiningTableDef[];
  settingsVersion: number;
  settingsUpdatedAt: string | null;
}

export async function loadRestaurantContext(db: Db = prisma): Promise<RestaurantContext> {
  const [settingsRow, periods, closures, tables] = await Promise.all([
    db.settings.findUnique({ where: { id: "default" } }),
    db.specialPeriod.findMany({ orderBy: { startDate: "asc" } }),
    db.closure.findMany({ orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    db.diningTable.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const settings: RestaurantSettings = settingsRow ? SettingsSchema.parse(settingsRow.data) : defaultSettings;
  return {
    settings,
    profile: (settingsRow?.profile as unknown as RestaurantProfile) ?? restaurantProfile,
    specialPeriods: periods.map(
      (p): SpecialPeriodDef => ({
        id: p.id,
        slug: p.slug,
        type: p.type as SpecialPeriodType,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        provisional: p.provisional,
        notes: p.notes,
        hoursOverride: (p.hoursOverride as SpecialPeriodDef["hoursOverride"]) ?? null,
      }),
    ),
    closures: closures.map(
      (c): ClosureDef => ({
        id: c.id,
        date: c.date,
        startTime: c.startTime,
        endTime: c.endTime,
        scope: c.scope as ClosureDef["scope"],
        reason: c.reason,
        publicNote: c.publicNote,
      }),
    ),
    tables: tables.map(
      (t): DiningTableDef => ({
        id: t.id,
        code: t.code,
        area: t.area as SeatingArea,
        minCovers: t.minCovers,
        maxCovers: t.maxCovers,
        onlineBookable: t.onlineBookable,
        features: t.features,
        sortOrder: t.sortOrder,
      }),
    ),
    settingsVersion: settingsRow?.version ?? 0,
    settingsUpdatedAt: settingsRow?.updatedAt.toISOString() ?? null,
  };
}

export function restaurantContextFromSeed(): RestaurantContext {
  return {
    settings: defaultSettings,
    profile: restaurantProfile,
    specialPeriods: seedPeriods,
    closures: seedClosures,
    tables: seedTables,
    settingsVersion: 0,
    settingsUpdatedAt: null,
  };
}
