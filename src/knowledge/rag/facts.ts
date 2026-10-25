/**
 * Derived facts shared by the corpus documents, the knowledge graph and the
 * evaluation questions. Computing them once keeps all three consistent with each
 * other and with the business rules the website and ordering system enforce.
 */
import { allergenAvoidance, composeItem, composeSauce, defaultOptionIds, sauceIngredientIds, type CatalogItem, type ItemComposition } from "@/domain/catalog";
import { leadMinutes } from "@/domain/order-rules";
import { ALLERGENS, type Allergen, type IsoWeekday, type ModifierGroup, type ModifierOption, type SauceDef, type SpecialPeriodType } from "@/domain/types";
import type { KnowledgeContext } from "../context";
import { WEEKDAYS } from "./text";

export interface AllergenSource {
  allergen: Allergen;
  /** Ingredient names that carry the allergen directly in the dish. */
  ingredients: string[];
  /** Preparations (sauces, marinades…) that bring the allergen, with the ingredient inside them. */
  preparations: { name: string; via: string[] }[];
}

export interface TraceSource {
  allergen: Allergen;
  reasons: string[];
}

export interface OptionEffect {
  group: ModifierGroup;
  option: ModifierOption;
  removesAllergens: Allergen[];
  addsAllergens: Allergen[];
  dietAfter: string;
  spiceAfter: number;
  composition: ItemComposition;
}

export interface DishFacts {
  item: CatalogItem;
  comp: ItemComposition;
  allergenSources: AllergenSource[];
  traceSources: TraceSource[];
  avoidance: { allergen: Allergen; avoidableWith: string[] | null }[];
  optionEffects: OptionEffect[];
  weekdays: IsoWeekday[];
  timeWindow: { start: string; end: string } | null;
  onlyDuring: SpecialPeriodType[];
  notDuring: SpecialPeriodType[];
  dateRange: { start: string; end: string } | null;
  minNoticeHours: number | null;
  sameDayCutoff: string | null;
  ordersOpenFrom: string | null;
  minQuantity: number | null;
  orderTypesRule: string[] | null;
  /** Minimum time between ordering and pickup for this dish on its own, in minutes. */
  leadTimeMinutes: number;
  isBreakfast: boolean;
}

const sortA = (xs: Iterable<Allergen>) => [...new Set(xs)].sort((a, b) => ALLERGENS.indexOf(a) - ALLERGENS.indexOf(b));

export function dishFacts(k: KnowledgeContext, item: CatalogItem): DishFacts {
  const c = k.catalog;
  const comp = composeItem(c, item);
  const allergenSources: AllergenSource[] = comp.allergens.map((a) => {
    const ingredients = comp.ingredientIds
      .map((id) => c.ingredientsById.get(id)!)
      .filter((i) => i.allergens.includes(a))
      .map((i) => i.name);
    const preparations = comp.sauceIds
      .map((sid) => c.saucesById.get(sid)!)
      .map((s) => ({
        name: s.name,
        via: sauceIngredientIds(c, s.id)
          .map((id) => c.ingredientsById.get(id)!)
          .filter((i) => i.allergens.includes(a) && comp.allIngredientIds.includes(i.id))
          .map((i) => i.name),
      }))
      .filter((p) => p.via.length > 0);
    return { allergen: a, ingredients, preparations };
  });
  const traceSources: TraceSource[] = comp.mayContain.map((a) => {
    const reasons: string[] = [];
    if (item.mayContain.includes(a)) reasons.push(...(item.crossContactNotes.length ? item.crossContactNotes : ["Prepared with shared kitchen equipment."]));
    for (const id of comp.allIngredientIds) {
      const ing = c.ingredientsById.get(id)!;
      if (ing.mayContain?.includes(a)) reasons.push(ing.notes ?? `The supplier of the ${ing.name.toLowerCase()} states it may contain ${a.replace("_", " ")}.`);
    }
    for (const sid of comp.sauceIds) reasons.push(...sauceTraceNotes(k, sid, a));
    return { allergen: a, reasons: [...new Set(reasons)] };
  });

  const defaults = defaultOptionIds(item);
  const optionEffects: OptionEffect[] = [];
  for (const group of item.customizations) {
    for (const option of group.options) {
      if (option.default) continue;
      const groupDefaults = group.options.filter((o) => o.default).map((o) => o.id);
      const selection =
        group.selection === "single" ? [...defaults.filter((id) => !groupDefaults.includes(id)), option.id] : [...defaults, option.id];
      const after = composeItem(c, item, selection);
      optionEffects.push({
        group,
        option,
        removesAllergens: sortA(comp.allergens.filter((a) => !after.allergens.includes(a))),
        addsAllergens: sortA(after.allergens.filter((a) => !comp.allergens.includes(a))),
        dietAfter: after.diet,
        spiceAfter: after.spiceLevel,
        composition: after,
      });
    }
  }

  const rules = item.availabilityRules;
  const dow = rules.find((r) => r.type === "days_of_week");
  const tw = rules.find((r) => r.type === "time_window");
  const dr = rules.find((r) => r.type === "date_range");
  const notice = rules.find((r) => r.type === "min_notice_hours");
  const cutoff = rules.find((r) => r.type === "same_day_cutoff");
  const opens = rules.find((r) => r.type === "orders_open_from");
  const minQ = rules.find((r) => r.type === "min_quantity");
  const types = rules.find((r) => r.type === "order_types");
  const timeWindow = tw && tw.type === "time_window" ? { start: tw.start, end: tw.end } : null;
  return {
    item,
    comp,
    allergenSources,
    traceSources,
    avoidance: allergenAvoidance(c, item),
    optionEffects,
    weekdays: dow && dow.type === "days_of_week" ? [...dow.days].sort() : WEEKDAYS,
    timeWindow,
    onlyDuring: rules.flatMap((r) => (r.type === "during_period" ? [r.periodType] : [])),
    notDuring: rules.flatMap((r) => (r.type === "not_during_period" ? [r.periodType] : [])),
    dateRange: dr && dr.type === "date_range" ? { start: dr.start, end: dr.end } : null,
    minNoticeHours: notice && notice.type === "min_notice_hours" ? notice.hours : null,
    sameDayCutoff: cutoff && cutoff.type === "same_day_cutoff" ? cutoff.time : null,
    ordersOpenFrom: opens && opens.type === "orders_open_from" ? opens.date : null,
    minQuantity: minQ && minQ.type === "min_quantity" ? minQ.quantity : null,
    orderTypesRule: types && types.type === "order_types" ? types.allowed : null,
    leadTimeMinutes: leadMinutes(item.prepTimeMinutes, k.rc),
    isBreakfast: item.categoryId === "cat_breakfast",
  };
}

/** Why a preparation (or one nested inside it) may carry traces of an allergen. */
export function sauceTraceNotes(k: KnowledgeContext, sauceId: string, a: Allergen, seen = new Set<string>()): string[] {
  if (seen.has(sauceId)) return [];
  seen.add(sauceId);
  const s = k.catalog.saucesById.get(sauceId);
  if (!s) return [];
  const own = s.mayContain?.includes(a) ? (s.crossContactNotes.length ? s.crossContactNotes : [`${s.name} is made on shared equipment.`]) : [];
  const fromIngredients = s.ingredients
    .map((x) => k.catalog.ingredientsById.get(x.ingredientId)!)
    .filter((i) => i.mayContain?.includes(a))
    .map((i) => i.notes ?? `The supplier of the ${i.name.toLowerCase()} in ${s.name} states it may contain ${a.replace("_", " ")}.`);
  return [...own, ...fromIngredients, ...(s.includesSauces ?? []).flatMap((n) => sauceTraceNotes(k, n.sauceId, a, seen))];
}

export interface SauceFacts {
  sauce: SauceDef;
  comp: ReturnType<typeof composeSauce>;
  allergenSources: { allergen: Allergen; ingredients: string[] }[];
  usedIn: { item: CatalogItem; role: string; note?: string }[];
  optionalIn: { item: CatalogItem; optionName: string; priceDeltaFils: number }[];
  componentOf: SauceDef[];
  nested: { sauce: SauceDef; quantity: string }[];
}

export function sauceFacts(k: KnowledgeContext, sauce: SauceDef): SauceFacts {
  const c = k.catalog;
  const comp = composeSauce(c, sauce.id);
  const ids = sauceIngredientIds(c, sauce.id);
  return {
    sauce,
    comp,
    allergenSources: comp.allergens.map((a) => ({
      allergen: a,
      ingredients: ids.map((id) => c.ingredientsById.get(id)!).filter((i) => i.allergens.includes(a)).map((i) => i.name),
    })),
    usedIn: c.items.flatMap((i) => i.sauces.filter((s) => s.sauceId === sauce.id).map((s) => ({ item: i, role: s.role, note: s.note }))),
    optionalIn: c.items.flatMap((i) =>
      i.customizations.flatMap((g) => g.options.filter((o) => o.addsSauceIds?.includes(sauce.id)).map((o) => ({ item: i, optionName: o.name, priceDeltaFils: o.priceDeltaFils }))),
    ),
    componentOf: [...c.saucesById.values()].filter((s) => (s.includesSauces ?? []).some((n) => n.sauceId === sauce.id)),
    nested: (sauce.includesSauces ?? []).map((n) => ({ sauce: c.saucesById.get(n.sauceId)!, quantity: n.quantity })),
  };
}

export interface IngredientUse {
  directIn: { item: CatalogItem; quantity: string; removable: boolean; note?: string }[];
  inPreparations: { sauce: SauceDef; quantity: string }[];
  /** Dishes that contain the ingredient only through a preparation. */
  viaPreparationIn: { item: CatalogItem; sauce: SauceDef }[];
}

export function ingredientUse(k: KnowledgeContext, ingredientId: string): IngredientUse {
  const c = k.catalog;
  const directIn = c.items.flatMap((i) =>
    i.ingredients.filter((x) => x.ingredientId === ingredientId).map((x) => ({ item: i, quantity: x.quantity, removable: !!x.removable, note: x.note })),
  );
  const sauces = [...c.saucesById.values()];
  const inPreparations = sauces.flatMap((s) => s.ingredients.filter((x) => x.ingredientId === ingredientId).map((x) => ({ sauce: s, quantity: x.quantity })));
  const directIds = new Set(directIn.map((d) => d.item.id));
  const viaPreparationIn: IngredientUse["viaPreparationIn"] = [];
  for (const item of c.items) {
    if (directIds.has(item.id)) continue;
    for (const s of item.sauces) {
      if (sauceIngredientIds(c, s.sauceId).includes(ingredientId)) {
        viaPreparationIn.push({ item, sauce: c.saucesById.get(s.sauceId)! });
        break;
      }
    }
  }
  return { directIn, inPreparations, viaPreparationIn };
}

export function visibleItems(k: KnowledgeContext): CatalogItem[] {
  return k.catalog.items.filter((i) => i.isVisible);
}

export function categoryOf(k: KnowledgeContext, item: CatalogItem) {
  return k.catalog.categories.find((c) => c.id === item.categoryId)!;
}

/** Ordering modes in words, e.g. ["dine-in", "pickup", "delivery"]. */
export function fulfilmentModes(item: CatalogItem): string[] {
  const f = item.fulfilment;
  return [f.dineIn && "dine-in", f.pickup && "pickup (takeaway)", f.delivery && "delivery", f.dineInPreorder && "dine-in pre-order"].filter(Boolean) as string[];
}

export const ROLE_WORDS: Record<string, string> = {
  included: "cooked into",
  marinade: "used as the marinade for",
  glaze: "brushed as a glaze on",
  topping: "spooned on top of",
  side: "served on the side with",
};

export const PERIOD_TYPE_WORDS: Record<string, string> = {
  ramadan: "Ramadan",
  eid_al_fitr: "Eid Al Fitr",
  eid_al_adha: "Eid Al Adha",
  national_day: "UAE National Day (Eid Al Etihad)",
  seasonal: "the winter season",
  custom: "a special period",
};
