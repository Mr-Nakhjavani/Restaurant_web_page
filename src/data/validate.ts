import { buildCatalog, composeItem, findOption } from "@/domain/catalog";
import { SettingsSchema } from "@/domain/settings";
import { ALLERGENS } from "@/domain/types";
import { closures, defaultSettings, diningTables, ingredients, menuCategories, menuItems, restaurantProfile, sauces, specialPeriods } from "./index";

/**
 * Referential and consistency checks over the canonical data. Run by the seed
 * script (refuses to seed invalid data) and by the unit tests.
 */
export function validateCanonicalData(): string[] {
  const problems: string[] = [];
  const ingIds = new Set(ingredients.map((i) => i.id));
  const sauceIds = new Set(sauces.map((s) => s.id));
  const itemIds = new Set(menuItems.map((i) => i.id));
  const catIds = new Set(menuCategories.map((c) => c.id));

  const sauceContains = (sauceId: string, ingredientId: string, seen = new Set<string>()): boolean => {
    if (seen.has(sauceId)) return false;
    seen.add(sauceId);
    const sauce = sauces.find((s) => s.id === sauceId);
    if (!sauce) return false;
    return sauce.ingredients.some((i) => i.ingredientId === ingredientId) || (sauce.includesSauces ?? []).some((n) => sauceContains(n.sauceId, ingredientId, seen));
  };

  const dup = (list: string[], label: string) => {
    const seen = new Set<string>();
    for (const v of list) {
      if (seen.has(v)) problems.push(`Duplicate ${label}: ${v}`);
      seen.add(v);
    }
  };
  dup(ingredients.map((i) => i.id), "ingredient id");
  dup(sauces.map((s) => s.id), "sauce id");
  dup(sauces.map((s) => s.slug), "sauce slug");
  dup(menuItems.map((i) => i.id), "menu item id");
  dup(menuItems.map((i) => i.slug), "menu item slug");
  dup(diningTables.map((t) => t.code), "table code");

  for (const i of ingredients) {
    for (const a of [...i.allergens, ...(i.mayContain ?? [])]) if (!ALLERGENS.includes(a)) problems.push(`Ingredient ${i.id}: unknown allergen ${a}`);
  }
  for (const s of sauces) {
    for (const x of s.ingredients) if (!ingIds.has(x.ingredientId)) problems.push(`Sauce ${s.id}: unknown ingredient ${x.ingredientId}`);
    for (const x of s.includesSauces ?? []) if (!sauceIds.has(x.sauceId)) problems.push(`Sauce ${s.id}: unknown nested sauce ${x.sauceId}`);
    if (!/^[a-z0-9-]+$/.test(s.slug)) problems.push(`Sauce ${s.id}: invalid slug`);
  }
  for (const item of menuItems) {
    const where = `Item ${item.id}`;
    if (!catIds.has(item.categoryId)) problems.push(`${where}: unknown category ${item.categoryId}`);
    if (!/^[a-z0-9-]+$/.test(item.slug)) problems.push(`${where}: invalid slug`);
    if (!item.id.startsWith("mi_")) problems.push(`${where}: ids must start with mi_`);
    if (item.priceFils <= 0 || !Number.isInteger(item.priceFils)) problems.push(`${where}: invalid price`);
    if (item.ingredients.length === 0) problems.push(`${where}: no ingredients`);
    for (const x of item.ingredients) if (!ingIds.has(x.ingredientId)) problems.push(`${where}: unknown ingredient ${x.ingredientId}`);
    for (const x of item.sauces) if (!sauceIds.has(x.sauceId)) problems.push(`${where}: unknown sauce ${x.sauceId}`);
    for (const p of item.pairings) if (!itemIds.has(p)) problems.push(`${where}: unknown pairing ${p}`);
    for (const a of item.mayContain) if (!ALLERGENS.includes(a)) problems.push(`${where}: unknown allergen ${a}`);
    const optionIds = new Set<string>();
    for (const g of item.customizations) {
      const defaults = g.options.filter((o) => o.default).length;
      if (g.selection === "single" && g.required && defaults !== 1) problems.push(`${where}: group ${g.id} needs exactly one default`);
      if (g.min > g.max) problems.push(`${where}: group ${g.id} min > max`);
      for (const o of g.options) {
        if (optionIds.has(o.id)) problems.push(`${where}: duplicate option id ${o.id}`);
        optionIds.add(o.id);
        for (const id of [...(o.removesIngredientIds ?? []), ...(o.addsIngredientIds ?? [])]) if (!ingIds.has(id)) problems.push(`${where}: option ${o.id} references unknown ingredient ${id}`);
        for (const id of [...(o.removesSauceIds ?? []), ...(o.addsSauceIds ?? [])]) if (!sauceIds.has(id)) problems.push(`${where}: option ${o.id} references unknown sauce ${id}`);
        for (const id of o.removesIngredientIds ?? []) {
          const inDish = item.ingredients.some((x) => x.ingredientId === id);
          const inSauce = item.sauces.some((x) => sauceContains(x.sauceId, id));
          if (!inDish && !inSauce) problems.push(`${where}: option ${o.id} removes ${id}, which is not in the dish`);
        }
        for (const id of o.removesSauceIds ?? []) {
          if (!item.sauces.some((x) => x.sauceId === id)) problems.push(`${where}: option ${o.id} removes sauce ${id}, which is not in the dish`);
        }
      }
    }
    for (const r of item.availabilityRules) {
      if (r.type === "days_of_week" && r.days.some((d) => d < 1 || d > 7)) problems.push(`${where}: invalid weekday`);
      if (r.type === "date_range" && r.start > r.end) problems.push(`${where}: date range reversed`);
    }
    if (item.bulk.bulkOnly && !item.bulk.eligible) problems.push(`${where}: bulkOnly items must be bulk eligible`);
    if (item.kind === "catering" && !item.bulk.bulkOnly) problems.push(`${where}: catering items must be bulk-only`);
    if (!item.image.src.startsWith("/images/")) problems.push(`${where}: image must be served from /images/`);
    // Ingredient-level claims in Q&A must not contradict derived data.
    const catalog = buildCatalog({
      categories: menuCategories,
      items: [{ ...item, availabilityStatus: "available", soldOutUntil: null, isVisible: true, updatedAt: null }],
      ingredients,
      sauces,
    });
    const comp = composeItem(catalog, catalog.items[0]);
    const text = `${item.shortDescription} ${item.description}`.toLowerCase();
    if (/\bvegan\b/.test(text) && !/not vegan|no longer vegan/.test(text) && comp.diet !== "vegan") problems.push(`${where}: description says vegan but ingredients are ${comp.diet}`);
    for (const qa of item.customerQA) {
      const q = qa.question.toLowerCase();
      const a = qa.answer.toLowerCase();
      if (/\bvegan\b/.test(q) && a.startsWith("yes") && comp.diet !== "vegan") problems.push(`${where}: Q&A claims vegan but ingredients are ${comp.diet}`);
      if (/contain (nuts|tree nuts)/.test(q) && a.startsWith("no") && comp.allergens.includes("tree_nuts")) problems.push(`${where}: Q&A denies nuts but recipe has tree nuts`);
    }
    for (const g of item.customizations) for (const o of g.options) if (!findOption(item, o.id)) problems.push(`${where}: option lookup failed ${o.id}`);
  }
  const parsed = SettingsSchema.safeParse(defaultSettings);
  if (!parsed.success) problems.push(`Default settings invalid: ${parsed.error.message}`);
  for (const p of specialPeriods) if (p.startDate > p.endDate) problems.push(`Special period ${p.id}: reversed dates`);
  for (const c of closures) if (c.startTime && c.endTime && c.startTime >= c.endTime) problems.push(`Closure ${c.id}: reversed times`);
  const seats = diningTables.reduce((s, t) => s + t.maxCovers, 0);
  if (seats !== restaurantProfile.capacity.totalSeats) problems.push(`Profile totalSeats ${restaurantProfile.capacity.totalSeats} ≠ floor plan ${seats}`);
  for (const t of diningTables) if (t.minCovers > t.maxCovers) problems.push(`Table ${t.code}: min > max covers`);
  return problems;
}
