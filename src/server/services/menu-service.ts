import type { z } from "@hono/zod-openapi";
import type { DateTime } from "luxon";
import {
  allergenAvoidance,
  composeItem,
  composeSauce,
  findItem,
  findSauce,
  sauceIngredientIds,
  type Catalog,
  type CatalogItem,
} from "@/domain/catalog";
import { evaluateItemAvailability, servingWindowOn, type FulfilmentMode, type ItemAvailability } from "@/domain/availability";
import { money } from "@/domain/money";
import { kitchenAllergenStatement } from "@/domain/policies";
import { SearchIndex } from "@/domain/search";
import { CAPACITY_ORDER_STATUSES } from "@/domain/status";
import { localDateTime, minutesOfDay, timeToMinutes, toLocalDate } from "@/domain/time";
import {
  ALLERGENS,
  ALLERGEN_LABELS,
  DIETARY_TAGS,
  ITEM_KIND_LABELS,
  SPICE_LABELS,
  type Allergen,
  type DietaryTag,
  type SpiceLevel,
} from "@/domain/types";
import { cheapestCombinations } from "@/domain/feeding";
import type {
  IngredientSchema,
  MenuCategorySchema,
  MenuItemDetailSchema,
  MenuItemSummarySchema,
  ModifierGroupSchema,
  SauceSchema,
} from "../contracts/menu";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { loadCatalog, loadRestaurantContext, type RestaurantContext } from "../repositories/catalog-repo";

export type MenuItemSummary = z.infer<typeof MenuItemSummarySchema>;
export type MenuItemDetail = z.infer<typeof MenuItemDetailSchema>;
export type IngredientDto = z.infer<typeof IngredientSchema>;
export type SauceDto = z.infer<typeof SauceSchema>;
export type MenuCategoryDto = z.infer<typeof MenuCategorySchema>;

export interface CheckOptions {
  date?: string;
  time?: string;
  mode?: FulfilmentMode;
  quantity?: number;
}

/** Units of each item already committed by regular orders on a local date (for daily limits). */
export async function dailyItemUsage(date: string, excludeOrderId?: string): Promise<Map<string, number>> {
  const rows = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      status: "active",
      order: { localDate: date, kind: "regular", status: { in: CAPACITY_ORDER_STATUSES }, ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}) },
    },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.menuItemId, r._sum.quantity ?? 0]));
}

/** Moment at which to evaluate an item: explicit time, else now (today) or the item's first serving time. */
export function checkMoment(item: CatalogItem, now: DateTime, ctx: RestaurantContext, opts: CheckOptions): DateTime {
  const today = toLocalDate(now);
  const date = opts.date ?? today;
  if (opts.time) return localDateTime(date, opts.time);
  const window = servingWindowOn(item, date, ctx);
  if (date === today) {
    if (window && minutesOfDay(now) < window.start) return localDateTime(date, window.start);
    return now;
  }
  return localDateTime(date, window ? window.start : timeToMinutes("12:00"));
}

export function itemAvailability(
  item: CatalogItem,
  now: DateTime,
  ctx: RestaurantContext,
  opts: CheckOptions,
  usage?: Map<string, number>,
): ItemAvailability {
  const at = checkMoment(item, now, ctx, opts);
  return evaluateItemAvailability(
    item,
    {
      at,
      now,
      mode: opts.mode ?? "dine_in",
      quantity: opts.quantity ?? (item.bulk.minQuantity && item.bulk.bulkOnly ? item.bulk.minQuantity : 1),
      alreadyOrderedOnDate: usage?.get(item.id) ?? 0,
    },
    ctx,
  );
}

export function toSummary(item: CatalogItem, catalog: Catalog, availability: ItemAvailability): MenuItemSummary {
  const comp = composeItem(catalog, item);
  const category = catalog.categories.find((c) => c.id === item.categoryId)!;
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    arabicName: item.arabicName,
    category: { id: category.id, slug: category.slug, name: category.name },
    kind: item.kind,
    kindLabel: ITEM_KIND_LABELS[item.kind],
    shortDescription: item.shortDescription,
    price: money(item.priceFils),
    portion: { description: item.portion.description, servesPeople: item.portion.servesPeople, pieces: item.portion.pieces ?? null },
    spiceLevel: item.spiceLevel,
    spiceLabel: SPICE_LABELS[item.spiceLevel],
    dietaryTags: comp.dietaryTags,
    allergens: comp.allergens,
    mayContain: comp.mayContain,
    prepTimeMinutes: item.prepTimeMinutes,
    image: { url: item.image.src, alt: item.image.alt },
    featured: item.featured,
    signature: item.signature,
    fulfilment: item.fulfilment,
    bulkOnly: item.bulk.bulkOnly,
    availabilityNote: item.availabilityNote,
    availability,
    url: `/menu/${item.slug}`,
  };
}

function nameOf(catalog: Catalog, id: string): string {
  return catalog.ingredientsById.get(id)?.name ?? catalog.saucesById.get(id)?.name ?? id;
}

export function toModifierGroups(item: CatalogItem, catalog: Catalog): z.infer<typeof ModifierGroupSchema>[] {
  return item.customizations.map((g) => ({
    id: g.id,
    name: g.name,
    selection: g.selection,
    required: g.required,
    min: g.min,
    max: g.max,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceDelta: money(o.priceDeltaFils),
      default: !!o.default,
      description: o.description ?? null,
      spiceLevel: o.spiceLevel ?? null,
      removes: [...(o.removesIngredientIds ?? []), ...(o.removesSauceIds ?? [])].map((id) => nameOf(catalog, id)),
      adds: [...(o.addsIngredientIds ?? []), ...(o.addsSauceIds ?? [])].map((id) => nameOf(catalog, id)),
    })),
  }));
}

export function toDetail(item: CatalogItem, catalog: Catalog, availability: ItemAvailability): MenuItemDetail {
  const comp = composeItem(catalog, item);
  const avoid = new Map(allergenAvoidance(catalog, item).map((a) => [a.allergen, a.avoidableWith]));
  const allergenDetails = comp.allergens.map((allergen) => {
    const sources: string[] = [];
    for (const id of comp.ingredientIds) {
      const ing = catalog.ingredientsById.get(id);
      if (ing?.allergens.includes(allergen)) sources.push(ing.name);
    }
    for (const sid of comp.sauceIds) {
      const sauce = catalog.saucesById.get(sid)!;
      const inSauce = sauceIngredientIds(catalog, sid)
        .map((id) => catalog.ingredientsById.get(id)!)
        .filter((i) => i.allergens.includes(allergen))
        .map((i) => i.name);
      if (inSauce.length) sources.push(`${sauce.name} (${inSauce.join(", ")})`);
    }
    return { allergen, label: ALLERGEN_LABELS[allergen], sources, avoidableWith: avoid.get(allergen) ?? null };
  });
  return {
    ...toSummary(item, catalog, availability),
    description: item.description,
    aliases: item.aliases,
    cookingMethod: item.cookingMethod,
    preparationStyle: item.preparationStyle,
    spiceAdjustment: item.spiceAdjustment,
    ingredients: item.ingredients.map((i) => {
      const ing = catalog.ingredientsById.get(i.ingredientId)!;
      return {
        id: ing.id,
        name: ing.name,
        arabicName: ing.arabicName ?? null,
        quantity: i.quantity,
        removable: !!i.removable,
        note: i.note ?? null,
        allergens: ing.allergens,
        diet: ing.diet,
      };
    }),
    sauces: item.sauces.map((s) => {
      const sauce = catalog.saucesById.get(s.sauceId)!;
      return {
        id: sauce.id,
        slug: sauce.slug,
        name: sauce.name,
        kind: sauce.kind,
        role: s.role,
        note: s.note ?? null,
        houseSpecial: sauce.houseSpecial,
        spiceLevel: sauce.spiceLevel,
        allergens: composeSauce(catalog, sauce.id).allergens,
        url: `/api/v1/sauces/${sauce.slug}`,
      };
    }),
    allergenDetails,
    crossContactNotes: item.crossContactNotes,
    kitchenAllergenStatement: kitchenAllergenStatement(catalog),
    customizations: toModifierGroups(item, catalog),
    bulk: {
      eligible: item.bulk.eligible,
      bulkOnly: item.bulk.bulkOnly,
      minQuantity: item.bulk.minQuantity ?? null,
      maxQuantityPerDay: item.bulk.maxQuantityPerDay ?? null,
      minNoticeHours: item.bulk.minNoticeHours ?? null,
      note: item.bulk.note ?? null,
    },
    maxPerOrder: item.maxPerOrder,
    dailyLimit: item.dailyLimit,
    availabilityRules: item.availabilityRules,
    pairings: item.pairings
      .map((id) => catalog.itemsById.get(id))
      .filter((p): p is CatalogItem => !!p)
      .map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    customerQA: item.customerQA,
    updatedAt: item.updatedAt,
  };
}

// ---------------------------------------------------------------------------

export interface MenuFilters extends CheckOptions {
  category?: string;
  kind?: string;
  search?: string;
  dietary?: DietaryTag[];
  excludeAllergens?: Allergen[];
  maxSpice?: number;
  minPriceFils?: number;
  maxPriceFils?: number;
  availableOnly?: boolean;
  featured?: boolean;
}

export function parseList<T extends string>(raw: string | undefined, allowed: readonly T[], label: string): T[] | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const invalid = values.filter((v) => !allowed.includes(v as T));
  if (invalid.length) {
    throw new ApiError("VALIDATION_ERROR", `Unknown ${label}: ${invalid.join(", ")}`, { field: label, allowed });
  }
  return values as T[];
}

export const parseAllergens = (raw?: string) => parseList(raw, ALLERGENS, "allergens");
export const parseDietary = (raw?: string) => parseList(raw, DIETARY_TAGS, "dietary");

const DIET_WORDS: Record<string, string> = {
  meat: "meat",
  pescatarian: "fish seafood",
  vegetarian: "vegetarian meatless",
  vegan: "vegan vegetarian plant based meatless",
};

export function menuSearchIndex(catalog: Catalog) {
  return new SearchIndex(
    catalog.items.map((item) => ({
      id: item.id,
      payload: item,
      fields: [
        { text: `${item.name} ${item.aliases.join(" ")}`, weight: 3 },
        { text: DIET_WORDS[composeItem(catalog, item).diet], weight: 1.5 },
        { text: item.shortDescription, weight: 1.5 },
        { text: item.description, weight: 1 },
        {
          text: [
            ...item.ingredients.map((i) => {
              const ing = catalog.ingredientsById.get(i.ingredientId);
              return `${ing?.name ?? ""} ${(ing?.aliases ?? []).join(" ")}`;
            }),
            ...item.sauces.map((s) => catalog.saucesById.get(s.sauceId)?.name ?? ""),
          ].join(" "),
          weight: 1.2,
        },
      ],
    })),
  );
}

export async function getMenuContext() {
  const [catalog, ctx] = await Promise.all([loadCatalog(), loadRestaurantContext()]);
  return { catalog, ctx };
}

export async function listMenu(now: DateTime, filters: MenuFilters) {
  const { catalog, ctx } = await getMenuContext();
  const date = filters.date ?? toLocalDate(now);
  const usage = await dailyItemUsage(date);
  let items = catalog.items.filter((i) => i.isVisible);
  if (filters.category) {
    const cat = catalog.categories.find((c) => c.id === filters.category || c.slug === filters.category);
    if (!cat) throw new ApiError("NOT_FOUND", `No menu category “${filters.category}”.`, { availableCategories: catalog.categories.map((c) => c.slug) });
    items = items.filter((i) => i.categoryId === cat.id);
  }
  if (filters.kind) items = items.filter((i) => i.kind === filters.kind);
  if (filters.featured !== undefined) items = items.filter((i) => i.featured === filters.featured);
  if (filters.minPriceFils !== undefined) items = items.filter((i) => i.priceFils >= filters.minPriceFils!);
  if (filters.maxPriceFils !== undefined) items = items.filter((i) => i.priceFils <= filters.maxPriceFils!);
  if (filters.maxSpice !== undefined) items = items.filter((i) => i.spiceLevel <= filters.maxSpice!);
  let scores: Map<string, number> | null = null;
  if (filters.search) {
    const hits = menuSearchIndex(catalog).search(filters.search, 50);
    scores = new Map(hits.map((h) => [h.id, h.score]));
    items = items.filter((i) => scores!.has(i.id)).sort((a, b) => scores!.get(b.id)! - scores!.get(a.id)!);
  }
  const summaries = items
    .map((item) => {
      const comp = composeItem(catalog, item);
      if (filters.dietary && !filters.dietary.every((t) => comp.dietaryTags.includes(t))) return null;
      if (filters.excludeAllergens && filters.excludeAllergens.some((a) => comp.allergens.includes(a))) return null;
      const availability = itemAvailability(item, now, ctx, { ...filters, date }, usage);
      if (filters.availableOnly && !availability.orderable) return null;
      return toSummary(item, catalog, availability);
    })
    .filter((s): s is MenuItemSummary => !!s);
  return {
    items: summaries,
    categories: catalog.categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      arabicName: c.arabicName,
      description: c.description,
      itemCount: catalog.items.filter((i) => i.categoryId === c.id && i.isVisible).length,
    })),
    checkedFor: { date, time: filters.time ?? null, mode: filters.mode ?? "dine_in" },
    kitchenAllergenStatement: kitchenAllergenStatement(catalog),
  };
}

export async function getMenuItem(idOrSlug: string, now: DateTime, opts: CheckOptions): Promise<MenuItemDetail> {
  const { catalog, ctx } = await getMenuContext();
  const item = findItem(catalog, idOrSlug);
  if (!item || !item.isVisible) {
    throw new ApiError("NOT_FOUND", `No menu item “${idOrSlug}”. Use GET /api/v1/menu/search?q=… to find dishes.`);
  }
  const date = opts.date ?? toLocalDate(now);
  const usage = await dailyItemUsage(date);
  return toDetail(item, catalog, itemAvailability(item, now, ctx, { ...opts, date }, usage));
}

export async function getItemAvailability(idOrSlug: string, now: DateTime, opts: CheckOptions) {
  const { catalog, ctx } = await getMenuContext();
  const item = findItem(catalog, idOrSlug);
  if (!item || !item.isVisible) throw new ApiError("NOT_FOUND", `No menu item “${idOrSlug}”.`);
  const date = opts.date ?? toLocalDate(now);
  const usage = await dailyItemUsage(date);
  const availability = itemAvailability(item, now, ctx, { ...opts, date }, usage);
  const alternatives = availability.orderable ? [] : suggestAlternatives(item, catalog, ctx, now, { ...opts, date }, usage);
  return {
    item: { id: item.id, slug: item.slug, name: item.name, kind: item.kind, availabilityNote: item.availabilityNote },
    availability,
    rules: item.availabilityRules,
    alternatives,
  };
}

/** Similar dishes that ARE orderable at the same moment: same category first, then shared key ingredients. */
export function suggestAlternatives(
  item: CatalogItem,
  catalog: Catalog,
  ctx: RestaurantContext,
  now: DateTime,
  opts: CheckOptions,
  usage: Map<string, number>,
  limit = 3,
) {
  const keyIngredients = new Set(item.ingredients.slice(0, 4).map((i) => i.ingredientId));
  return catalog.items
    .filter((c) => c.id !== item.id && c.isVisible && !c.bulk.bulkOnly)
    .map((c) => {
      const overlap = c.ingredients.filter((i) => keyIngredients.has(i.ingredientId)).length;
      const score = (c.categoryId === item.categoryId ? 3 : 0) + overlap + (c.groupMeal === item.groupMeal ? 1 : 0);
      return { c, score };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map(({ c }) => ({ c, availability: itemAvailability(c, now, ctx, opts, usage) }))
    .filter((x) => x.availability.orderable)
    .slice(0, limit)
    .map(({ c }) => ({ id: c.id, slug: c.slug, name: c.name, price: money(c.priceFils), reason: c.categoryId === item.categoryId ? "Same menu section" : "Similar ingredients" }));
}

export async function searchMenu(q: string, now: DateTime, limit: number) {
  const { catalog, ctx } = await getMenuContext();
  const usage = await dailyItemUsage(toLocalDate(now));
  const hits = menuSearchIndex(catalog)
    .search(q, 50)
    .map((h) => ({ ...h, score: Math.round(h.score * (h.payload.kind === "permanent" ? 1.15 : 1) * (h.payload.signature ? 1.05 : 1) * 1000) / 1000 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return hits
    .filter((h) => h.payload.isVisible)
    .map((h) => ({
      score: h.score,
      matchedTerms: h.matchedTerms,
      item: toSummary(h.payload, catalog, itemAvailability(h.payload, now, ctx, {}, usage)),
    }));
}

export async function listSpecials(now: DateTime, date?: string) {
  const { catalog, ctx } = await getMenuContext();
  const d = date ?? toLocalDate(now);
  const usage = await dailyItemUsage(d);
  const specials = catalog.items.filter((i) => i.isVisible && (i.kind === "daily_special" || i.kind === "limited_time"));
  const withAvail = specials.map((item) => ({ item, availability: itemAvailability(item, now, ctx, { date: d }, usage) }));
  const servedOnDate = withAvail.filter((x) => x.availability.servingWindow !== null && !x.availability.reasons.some((r) => ["NOT_AVAILABLE_ON_DAY", "OUTSIDE_DATE_RANGE", "OUTSIDE_SPECIAL_PERIOD", "NOT_DURING_SPECIAL_PERIOD"].includes(r.code)));
  const servedIds = new Set(servedOnDate.map((x) => x.item.id));
  return {
    date: d,
    today: servedOnDate.map((x) => toSummary(x.item, catalog, x.availability)),
    notToday: withAvail.filter((x) => !servedIds.has(x.item.id)).map((x) => toSummary(x.item, catalog, x.availability)),
    weeklySchedule: catalog.items
      .filter((i) => i.kind === "daily_special")
      .map((i) => ({
        id: i.id,
        name: i.name,
        days: (i.availabilityRules.find((r) => r.type === "days_of_week") as { days: number[] } | undefined)?.days ?? [],
        note: i.availabilityNote,
      })),
  };
}

export async function getIngredient(id: string): Promise<IngredientDto> {
  const catalog = await loadCatalog();
  const key = id.trim().toLowerCase();
  const ing = catalog.ingredientsById.get(key) ?? [...catalog.ingredientsById.values()].find((i) => i.id === `ing_${key.replace(/-/g, "_")}`);
  if (!ing) throw new ApiError("NOT_FOUND", `No ingredient “${id}”. Use GET /api/v1/ingredients to list them.`);
  return ingredientDto(catalog, ing.id);
}

export function ingredientDto(catalog: Catalog, id: string): IngredientDto {
  const ing = catalog.ingredientsById.get(id)!;
  const usedIn: IngredientDto["usedIn"] = [
    ...catalog.items.filter((i) => i.ingredients.some((x) => x.ingredientId === id)).map((i) => ({ type: "menu_item" as const, id: i.id, slug: i.slug, name: i.name })),
    ...[...catalog.saucesById.values()].filter((s) => s.ingredients.some((x) => x.ingredientId === id)).map((s) => ({ type: "sauce" as const, id: s.id, slug: s.slug, name: s.name })),
  ];
  return {
    id: ing.id,
    name: ing.name,
    arabicName: ing.arabicName ?? null,
    aliases: ing.aliases ?? [],
    description: ing.description,
    diet: ing.diet,
    allergens: ing.allergens,
    mayContain: ing.mayContain ?? [],
    notes: ing.notes ?? null,
    usedIn,
  };
}

export async function listIngredients(): Promise<IngredientDto[]> {
  const catalog = await loadCatalog();
  return [...catalog.ingredientsById.keys()].sort().map((id) => ingredientDto(catalog, id));
}

export function sauceDto(catalog: Catalog, id: string): SauceDto {
  const s = catalog.saucesById.get(id)!;
  const comp = composeSauce(catalog, id);
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    arabicName: s.arabicName ?? null,
    aliases: s.aliases ?? [],
    kind: s.kind,
    houseSpecial: s.houseSpecial,
    description: s.description,
    flavourProfile: s.flavourProfile,
    spiceLevel: s.spiceLevel,
    spiceLabel: SPICE_LABELS[s.spiceLevel as SpiceLevel],
    ingredients: s.ingredients.map((i) => {
      const ing = catalog.ingredientsById.get(i.ingredientId)!;
      return { id: ing.id, name: ing.name, quantity: i.quantity, allergens: ing.allergens };
    }),
    includes: (s.includesSauces ?? []).map((n) => {
      const nested = catalog.saucesById.get(n.sauceId)!;
      return { id: nested.id, slug: nested.slug, name: nested.name, quantity: n.quantity };
    }),
    allergens: comp.allergens,
    mayContain: comp.mayContain,
    diet: comp.diet,
    dietaryTags: comp.dietaryTags,
    batchYield: s.batchYield,
    preparation: s.preparation,
    servedTemperature: s.servedTemperature,
    crossContactNotes: s.crossContactNotes,
    sidePrice: s.sidePriceFils !== null ? money(s.sidePriceFils) : null,
    usedIn: [
      ...catalog.items.flatMap((i) => i.sauces.filter((x) => x.sauceId === id).map((x) => ({ id: i.id, slug: i.slug, name: i.name, role: x.role }))),
      ...[...catalog.saucesById.values()]
        .filter((p) => (p.includesSauces ?? []).some((n) => n.sauceId === id))
        .map((p) => ({ id: p.id, slug: p.slug, name: p.name, role: "component" })),
    ],
    url: `/api/v1/sauces/${s.slug}`,
  };
}

export async function getSauce(idOrSlug: string): Promise<SauceDto> {
  const catalog = await loadCatalog();
  const s = findSauce(catalog, idOrSlug);
  if (!s) throw new ApiError("NOT_FOUND", `No sauce “${idOrSlug}”. Use GET /api/v1/sauces to list all sauces, marinades and spice blends.`);
  return sauceDto(catalog, s.id);
}

export async function listSauces(): Promise<SauceDto[]> {
  const catalog = await loadCatalog();
  return [...catalog.saucesById.keys()].map((id) => sauceDto(catalog, id));
}

export async function feedingSuggestions(now: DateTime, guests: number, opts: CheckOptions) {
  const { catalog, ctx } = await getMenuContext();
  const date = opts.date ?? toLocalDate(now);
  const usage = await dailyItemUsage(date);
  const regularLimit = ctx.settings.ordering.maxPortionsPerOrder;
  const candidates = catalog.items
    .filter((i) => i.groupMeal && i.isVisible && !i.bulk.bulkOnly)
    .map((i) => ({ item: i, availability: itemAvailability(i, now, ctx, { ...opts, date, mode: opts.mode ?? "pickup" }, usage) }))
    .filter((x) => x.availability.orderable || x.availability.reasons.every((r) => r.code === "BELOW_MINIMUM_QUANTITY"));
  const options = cheapestCombinations(
    guests,
    candidates.map(({ item }) => ({
      itemId: item.id,
      name: item.name,
      servesPeople: item.portion.servesPeople,
      priceFils: item.priceFils,
      maxQuantity: Math.min(item.maxPerOrder, item.dailyLimit ?? 99, Math.ceil(guests / Math.max(1, item.portion.servesPeople)) + 1),
    })),
    3,
  );
  return {
    guests,
    date,
    mode: opts.mode ?? "pickup",
    options: options.map((o) => {
      const portions = o.lines.reduce((s, l) => s + (catalog.itemsById.get(l.itemId)?.kitchenPortions ?? 1) * l.quantity, 0);
      return {
        total: money(o.totalFils),
        perPerson: money(Math.round(o.totalFils / guests)),
        servings: o.servings,
        kitchenPortions: portions,
        requiresBulkOrder: portions > regularLimit,
        lines: o.lines.map((l) => ({ itemId: l.itemId, name: l.name, quantity: l.quantity, servesPeople: l.servesPeople, lineTotal: money(l.lineTotalFils) })),
      };
    }),
    notes: [
      "Suggestions cover main dishes only (drinks, starters and desserts are extra). Prices include 5% VAT.",
      `Orders above ${regularLimit} kitchen portions must be placed as a catering order with advance notice.`,
      "Serving sizes are based on adult portions; the team can advise for children or big appetites.",
    ],
  };
}

/** Availability for each of the next `days` dates (first serving time of each day). */
export async function availabilityWeek(idOrSlug: string, now: DateTime, mode: FulfilmentMode, days = 7) {
  const { catalog, ctx } = await getMenuContext();
  const item = findItem(catalog, idOrSlug);
  if (!item) throw new ApiError("NOT_FOUND", `No menu item “${idOrSlug}”.`);
  const today = toLocalDate(now);
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = localDateTime(today, 0).plus({ days: i }).toISODate()!;
    const usage = await dailyItemUsage(date);
    const a = itemAvailability(item, now, ctx, { date, mode }, usage);
    out.push({ date, orderable: a.orderable, servingWindow: a.servingWindow, reason: a.reasons[0]?.message ?? null, status: a.status });
  }
  return out;
}
