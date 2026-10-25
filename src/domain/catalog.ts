import type {
  Allergen,
  DietClass,
  DietaryTag,
  IngredientDef,
  MenuCategoryDef,
  MenuItemDef,
  ModifierGroup,
  ModifierOption,
  SauceDef,
  SpiceLevel,
} from "./types";
import { ALLERGENS, DIET_CLASSES } from "./types";

export const ITEM_AVAILABILITY_STATUSES = ["available", "sold_out", "paused"] as const;
export type ItemAvailabilityStatus = (typeof ITEM_AVAILABILITY_STATUSES)[number];

/** A menu item as known at runtime: canonical definition plus operational state from the database. */
export type CatalogItem = MenuItemDef & {
  availabilityStatus: ItemAvailabilityStatus;
  /** ISO timestamp; while availabilityStatus = sold_out the item is unavailable until this moment. */
  soldOutUntil: string | null;
  isVisible: boolean;
  updatedAt: string | null;
};

export interface Catalog {
  categories: MenuCategoryDef[];
  items: CatalogItem[];
  itemsById: Map<string, CatalogItem>;
  itemsBySlug: Map<string, CatalogItem>;
  ingredientsById: Map<string, IngredientDef>;
  saucesById: Map<string, SauceDef>;
  saucesBySlug: Map<string, SauceDef>;
}

export function buildCatalog(input: {
  categories: MenuCategoryDef[];
  items: CatalogItem[];
  ingredients: IngredientDef[];
  sauces: SauceDef[];
}): Catalog {
  const items = [...input.items].sort((a, b) => {
    const ca = input.categories.find((c) => c.id === a.categoryId)?.sortOrder ?? 99;
    const cb = input.categories.find((c) => c.id === b.categoryId)?.sortOrder ?? 99;
    return ca - cb || a.sortOrder - b.sortOrder;
  });
  return {
    categories: [...input.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    items,
    itemsById: new Map(items.map((i) => [i.id, i])),
    itemsBySlug: new Map(items.map((i) => [i.slug, i])),
    ingredientsById: new Map(input.ingredients.map((i) => [i.id, i])),
    saucesById: new Map(input.sauces.map((s) => [s.id, s])),
    saucesBySlug: new Map(input.sauces.map((s) => [s.slug, s])),
  };
}

export function findItem(catalog: Catalog, idOrSlug: string): CatalogItem | undefined {
  const key = idOrSlug.trim().toLowerCase();
  return catalog.itemsById.get(key) ?? catalog.itemsBySlug.get(key);
}

export function findSauce(catalog: Catalog, idOrSlug: string): SauceDef | undefined {
  const key = idOrSlug.trim().toLowerCase();
  return catalog.saucesById.get(key) ?? catalog.saucesBySlug.get(key);
}

// ---------------------------------------------------------------------------
// Composition: what is actually in a dish (optionally with customisations)
// ---------------------------------------------------------------------------

const sortAllergens = (list: Iterable<Allergen>) =>
  [...new Set(list)].sort((a, b) => ALLERGENS.indexOf(a) - ALLERGENS.indexOf(b));

export function maxDiet(classes: DietClass[]): DietClass {
  return classes.reduce<DietClass>(
    (acc, d) => (DIET_CLASSES.indexOf(d) > DIET_CLASSES.indexOf(acc) ? d : acc),
    "vegan",
  );
}

/** All ingredient ids inside a sauce, including nested preparations (e.g. bezar inside a marinade). */
export function sauceIngredientIds(catalog: Catalog, sauceId: string, seen = new Set<string>()): string[] {
  if (seen.has(sauceId)) return [];
  seen.add(sauceId);
  const sauce = catalog.saucesById.get(sauceId);
  if (!sauce) throw new Error(`Unknown sauce ${sauceId}`);
  const ids = sauce.ingredients.map((i) => i.ingredientId);
  for (const nested of sauce.includesSauces ?? []) ids.push(...sauceIngredientIds(catalog, nested.sauceId, seen));
  return [...new Set(ids)];
}

export interface SauceComposition {
  allergens: Allergen[];
  mayContain: Allergen[];
  diet: DietClass;
  dietaryTags: DietaryTag[];
}

/** Trace allergens declared on a sauce and on any preparation nested inside it. */
export function sauceMayContain(catalog: Catalog, sauceId: string, seen = new Set<string>()): Allergen[] {
  if (seen.has(sauceId)) return [];
  seen.add(sauceId);
  const sauce = catalog.saucesById.get(sauceId);
  if (!sauce) return [];
  return [...(sauce.mayContain ?? []), ...(sauce.includesSauces ?? []).flatMap((n) => sauceMayContain(catalog, n.sauceId, seen))];
}

export function composeSauce(catalog: Catalog, sauceId: string): SauceComposition {
  const ids = sauceIngredientIds(catalog, sauceId);
  return summarise(catalog, ids, sauceMayContain(catalog, sauceId));
}

function summarise(catalog: Catalog, ingredientIds: string[], extraMayContain: Allergen[]): SauceComposition {
  const ingr = ingredientIds.map((id) => {
    const found = catalog.ingredientsById.get(id);
    if (!found) throw new Error(`Unknown ingredient ${id}`);
    return found;
  });
  const allergens = sortAllergens(ingr.flatMap((i) => i.allergens));
  const mayContain = sortAllergens([...ingr.flatMap((i) => i.mayContain ?? []), ...extraMayContain]).filter(
    (a) => !allergens.includes(a),
  );
  const diet = maxDiet(ingr.map((i) => i.diet));
  return { allergens, mayContain, diet, dietaryTags: dietaryTagsFor(allergens, diet) };
}

export function dietaryTagsFor(allergens: Allergen[], diet: DietClass): DietaryTag[] {
  const tags: DietaryTag[] = [];
  if (diet === "vegan") tags.push("vegan");
  if (diet === "vegan" || diet === "vegetarian") tags.push("vegetarian");
  if (diet === "pescatarian") tags.push("pescatarian");
  if (!allergens.includes("gluten")) tags.push("gluten_free_ingredients");
  if (!allergens.includes("milk")) tags.push("dairy_free");
  if (!allergens.includes("eggs")) tags.push("egg_free");
  if (!allergens.includes("tree_nuts") && !allergens.includes("peanuts")) tags.push("nut_free_ingredients");
  if (!allergens.includes("sesame")) tags.push("sesame_free_ingredients");
  if (!allergens.includes("crustaceans") && !allergens.includes("molluscs")) tags.push("shellfish_free");
  tags.push("halal");
  return tags;
}

export function defaultOptionIds(item: MenuItemDef): string[] {
  return item.customizations.flatMap((g) => g.options.filter((o) => o.default).map((o) => o.id));
}

export function findOption(item: MenuItemDef, optionId: string): { group: ModifierGroup; option: ModifierOption } | null {
  for (const group of item.customizations) {
    const option = group.options.find((o) => o.id === optionId);
    if (option) return { group, option };
  }
  return null;
}

export interface ItemComposition extends SauceComposition {
  /** Base ingredient ids after customisation (excluding sauce internals). */
  ingredientIds: string[];
  /** Named preparations served with the dish after customisation. */
  sauceIds: string[];
  /** Every ingredient including sauce internals. */
  allIngredientIds: string[];
  spiceLevel: SpiceLevel;
}

/**
 * Effective composition of a dish for a set of selected option ids.
 * Pass `undefined` to use the default selection.
 */
export function composeItem(catalog: Catalog, item: MenuItemDef, selectedOptionIds?: string[]): ItemComposition {
  const selected = selectedOptionIds ?? defaultOptionIds(item);
  const options = selected.map((id) => findOption(item, id)?.option).filter((o): o is ModifierOption => !!o);

  const ingredientIds = new Set(item.ingredients.map((i) => i.ingredientId));
  const sauceIds = new Set(item.sauces.map((s) => s.sauceId));
  let spiceLevel: SpiceLevel = item.spiceLevel;
  for (const o of options) {
    o.removesIngredientIds?.forEach((id) => ingredientIds.delete(id));
    o.removesSauceIds?.forEach((id) => sauceIds.delete(id));
  }
  for (const o of options) {
    o.addsIngredientIds?.forEach((id) => ingredientIds.add(id));
    o.addsSauceIds?.forEach((id) => sauceIds.add(id));
    if (o.spiceLevel !== undefined) spiceLevel = o.spiceLevel;
  }
  const all = new Set(ingredientIds);
  for (const s of sauceIds) sauceIngredientIds(catalog, s).forEach((id) => all.add(id));
  // An option may remove an ingredient that lives inside a preparation (e.g. raisins in the hashu).
  for (const o of options) o.removesIngredientIds?.forEach((id) => {
    if (!o.addsIngredientIds?.includes(id)) all.delete(id);
  });
  for (const o of options) o.addsIngredientIds?.forEach((id) => all.add(id));
  const summary = summarise(catalog, [...all], [...item.mayContain, ...[...sauceIds].flatMap((id) => sauceMayContain(catalog, id))]);
  return { ...summary, ingredientIds: [...ingredientIds], sauceIds: [...sauceIds], allIngredientIds: [...all], spiceLevel };
}

/** Enumerate valid option selections (bounded) to find how an allergen can be avoided. */
export function selectionsAvoiding(catalog: Catalog, item: MenuItemDef, allergen: Allergen): string[][] {
  const groupChoices: string[][][] = item.customizations.map((g) => {
    if (g.selection === "single") return g.options.map((o) => [o.id]);
    // multiple: all subsets up to max (groups are small)
    const subsets: string[][] = [[]];
    for (const o of g.options) {
      const len = subsets.length;
      for (let i = 0; i < len; i++) if (subsets[i].length < g.max) subsets.push([...subsets[i], o.id]);
    }
    return subsets.filter((s) => s.length >= g.min);
  });
  const results: string[][] = [];
  const walk = (idx: number, acc: string[]) => {
    if (results.length >= 3) return;
    if (idx === groupChoices.length) {
      const comp = composeItem(catalog, item, acc);
      if (!comp.allergens.includes(allergen)) results.push(acc);
      return;
    }
    for (const choice of groupChoices[idx]) walk(idx + 1, [...acc, ...choice]);
  };
  if (groupChoices.length === 0 || groupChoices.reduce((n, g) => n * g.length, 1) > 5000) return [];
  walk(0, []);
  return results;
}

export interface AllergenAvoidance {
  allergen: Allergen;
  /** Option names that, when chosen, remove the allergen from the ingredients. Empty = cannot be removed. */
  avoidableWith: string[] | null;
}

/** For each allergen present by default, whether a customisation removes it (and which). */
export function allergenAvoidance(catalog: Catalog, item: MenuItemDef): AllergenAvoidance[] {
  const comp = composeItem(catalog, item);
  const defaults = new Set(defaultOptionIds(item));
  return comp.allergens.map((allergen) => {
    const selections = selectionsAvoiding(catalog, item, allergen);
    if (selections.length === 0) return { allergen, avoidableWith: null };
    // prefer the selection with the fewest changes from the defaults
    const best = selections
      .map((sel) => sel.filter((id) => !defaults.has(id)))
      .sort((a, b) => a.length - b.length)[0];
    const names = best.map((id) => findOption(item, id)?.option.name ?? id);
    return { allergen, avoidableWith: names };
  });
}
