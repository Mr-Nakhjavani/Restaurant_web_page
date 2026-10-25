/**
 * Menu documents: one per dish, preparation (sauce/marinade/blend…), ingredient and
 * category, plus the menu overview, the price list and the spice guide.
 */
import { composeSauce, type CatalogItem } from "@/domain/catalog";
import { vatIncluded } from "@/domain/money";
import { kitchenAllergenStatement } from "@/domain/policies";
import { ALLERGENS, DIETARY_TAGS, type Allergen, type DietaryTag, type IngredientDef, type SauceDef } from "@/domain/types";
import type { KnowledgeContext } from "../context";
import { categoryOf, dishFacts, fulfilmentModes, ingredientUse, PERIOD_TYPE_WORDS, ROLE_WORDS, sauceFacts, visibleItems, type DishFacts } from "./facts";
import { docPath, node } from "./ids";
import type { RagDocument, RagSection } from "./model";
import {
  aed,
  ALLERGEN_NAMES,
  allergens,
  bullets,
  cap,
  dateShort,
  list,
  paragraphs,
  plural,
  price,
  sentence,
  SPICE_WORDS,
  stripTrailingDot,
  be,
  isPlural,
  verb,
  time,
  timeRange,
  weekday,
} from "./text";

const R = "Bayt Al Ghaf";

export const KIND_WORDS: Record<string, string> = {
  permanent: "a permanent dish on the everyday menu",
  daily_special: "a weekly special, cooked only on particular days",
  limited_time: "a limited-time dish, served only on certain dates",
  catering: "a catering dish, sold only as part of a catering order",
};

export const DIET_WORDS: Record<string, string> = {
  vegan: "vegan (no animal products)",
  vegetarian: "vegetarian (contains dairy, eggs or honey, but no meat or fish)",
  pescatarian: "pescatarian (contains fish or seafood, no meat)",
  meat: "a meat dish (contains halal meat or poultry)",
};

export const TAG_QUESTIONS: Record<DietaryTag, { yes: string; no: string; label: string }> = {
  vegan: { label: "Vegan", yes: "is vegan", no: "is not vegan" },
  vegetarian: { label: "Vegetarian", yes: "is vegetarian", no: "is not vegetarian" },
  pescatarian: { label: "Pescatarian", yes: "is pescatarian (fish or seafood, no meat)", no: "is not a pescatarian dish" },
  gluten_free_ingredients: { label: "Gluten", yes: "has no gluten-containing ingredients (the kitchen is not certified gluten-free)", no: "contains gluten" },
  dairy_free: { label: "Dairy", yes: "has no dairy ingredients", no: "contains dairy (milk)" },
  egg_free: { label: "Eggs", yes: "has no egg ingredients", no: "contains egg" },
  nut_free_ingredients: { label: "Nuts", yes: "has no nut ingredients (the kitchen is not nut-free)", no: "contains nuts" },
  sesame_free_ingredients: { label: "Sesame", yes: "has no sesame ingredients", no: "contains sesame" },
  shellfish_free: { label: "Shellfish", yes: "has no crustaceans or molluscs", no: "contains shellfish (crustaceans or molluscs)" },
  halal: { label: "Halal", yes: "is halal", no: "is not halal" },
};

const optionPrice = (fils: number) => (fils === 0 ? "no extra charge" : fils > 0 ? `+${aed(fils)}` : `${aed(fils).replace("−", "−")} (cheaper)`);

function servesText(item: CatalogItem): string {
  const s = item.portion.servesPeople;
  return s === 1 ? "serves one person" : `serves ${s} people`;
}

function relatedForDish(k: KnowledgeContext, f: DishFacts): RagDocument["related"] {
  const c = k.catalog;
  const cat = categoryOf(k, f.item);
  return [
    { path: docPath.category(cat.slug), title: `${cat.name} (menu section)` },
    ...f.comp.sauceIds.map((id) => c.saucesById.get(id)!).map((s) => ({ path: docPath.preparation(s.slug), title: s.name })),
    ...f.comp.allergens.map((a) => ({ path: docPath.allergen(a), title: `Allergen: ${ALLERGEN_NAMES[a]}` })),
    ...(f.weekdays.length < 7 ? f.weekdays.map((d) => ({ path: docPath.weekday(d), title: `${weekday(d)} at Bayt Al Ghaf` })) : []),
    ...f.item.pairings.map((p) => c.itemsById.get(p)).filter((x): x is CatalogItem => !!x).map((p) => ({ path: docPath.dish(p.slug), title: p.name })),
    { path: "documents/ordering/ordering-overview.md", title: "How ordering works" },
  ];
}

export function availabilitySentences(k: KnowledgeContext, f: DishFacts): string[] {
  const i = f.item;
  const out: string[] = [];
  const s = k.rc.settings;
  if (f.weekdays.length < 7) out.push(`${i.name} is cooked only on ${list(f.weekdays.map((d) => `${weekday(d)}s`))}. It is not available on any other day of the week, and paying more does not change that.`);
  else out.push(`${i.name} is on the menu every day of the week.`);
  if (f.timeWindow) {
    const end = f.timeWindow.end === "24:00" ? "until the kitchen closes" : `until ${time(f.timeWindow.end)}`;
    out.push(`${i.name} is served from ${time(f.timeWindow.start)} ${end}.`);
  } else {
    out.push(`${i.name} is served all day, from opening at ${time(s.weeklyHours["1"]!.open)} until the kitchen's last orders ${s.kitchenLastOrderMinutesBeforeClose} minutes before closing.`);
  }
  if (f.isBreakfast) out.push(`${i.name} is part of the Emirati breakfast menu, served ${timeRange(s.breakfast.start, s.breakfast.end)}.`);
  for (const p of f.onlyDuring) out.push(`${i.name} is available only during ${PERIOD_TYPE_WORDS[p]}.`);
  for (const p of f.notDuring) out.push(`${i.name} is not served during ${PERIOD_TYPE_WORDS[p]}.`);
  if (f.dateRange) out.push(`${i.name} is served only from ${dateShort(f.dateRange.start)} to ${dateShort(f.dateRange.end)} (inclusive).`);
  if (f.ordersOpenFrom) out.push(`Orders for ${i.name} open on ${dateShort(f.ordersOpenFrom)}; earlier orders cannot be accepted.`);
  if (f.minNoticeHours) out.push(`${i.name} must be ordered at least ${plural(f.minNoticeHours, "hour")} in advance.`);
  if (f.sameDayCutoff) out.push(`Same-day orders for ${i.name} must be placed by ${time(f.sameDayCutoff)}.`);
  if (f.minQuantity) out.push(`The minimum order for ${i.name} is ${f.minQuantity}.`);
  if (f.orderTypesRule) out.push(`${i.name} can only be ordered for ${list(f.orderTypesRule.map((t) => ORDER_TYPE_WORDS[t] ?? t), "or")}.`);
  if (i.dailyLimit !== null) out.push(`The kitchen makes a limited number of ${i.name} each day: ${i.dailyLimit} portions. Once they are gone, ${i.name} is sold out until the next day it is served.`);
  out.push(`A single regular order can include up to ${i.maxPerOrder} ${i.name}.`);
  return out;
}

export const ORDER_TYPE_WORDS: Record<string, string> = {
  pickup: "pickup (takeaway)",
  delivery: "delivery",
  dine_in_preorder: "a dine-in pre-order with a reservation",
};

export function dishDocument(k: KnowledgeContext, f: DishFacts): RagDocument {
  const c = k.catalog;
  const i = f.item;
  const cat = categoryOf(k, i);
  const n = i.name;
  const s = k.rc.settings;
  const sections: RagSection[] = [];
  const contains = f.comp.allergens;
  const notContained = ALLERGENS.filter((a) => !contains.includes(a) && !f.comp.mayContain.includes(a));
  const zones = s.delivery.zones.filter((z) => z.regularOrders);

  sections.push({
    heading: `${n} at a glance`,
    body: paragraphs(
      `${n} (Arabic: ${i.arabicName}) is ${KIND_WORDS[i.kind]} in the ${cat.name} section of the ${R} menu. ${n} costs ${price(i.priceFils)} and ${servesText(i)}. ${i.shortDescription}`,
      bullets([
        `Dish: ${n} (${i.arabicName})`,
        `Price: ${price(i.priceFils)}, including 5% VAT`,
        `Menu section: ${cat.name} (${cat.arabicName})`,
        `Menu type: ${KIND_WORDS[i.kind]}`,
        `Portion: ${i.portion.description}; ${servesText(i)}${i.portion.pieces ? `; ${i.portion.pieces} pieces` : ""}`,
        `Spice: ${SPICE_WORDS[i.spiceLevel]}`,
        `Preparation time: ${i.prepTimeMinutes} minutes`,
        `Diet: ${DIET_WORDS[f.comp.diet]}`,
        `Contains allergens: ${allergens(contains)}`,
        `May contain traces of: ${f.comp.mayContain.length ? allergens(f.comp.mayContain) : "no specific trace warnings beyond the general kitchen statement"}`,
        `When: ${stripTrailingDot(i.availabilityNote)}`,
        `Ways to order: ${list(fulfilmentModes(i))}`,
        `Catering: ${i.bulk.eligible ? (i.bulk.bulkOnly ? "catering orders only" : "available in catering quantities") : "not available in catering quantities"}`,
        i.signature ? `${n} is one of ${R}'s signature dishes` : "",
        `Menu code: ${i.id} (web page: /menu/${i.slug})`,
      ]),
    ),
  });

  sections.push({
    heading: `What ${n} is`,
    body: paragraphs(
      i.description,
      `How ${n} is cooked: ${sentence(i.cookingMethod)} Style: ${sentence(i.preparationStyle)}`,
      i.aliases.length ? `Guests also ask for ${n} as ${list(i.aliases.map((a) => `“${a}”`), "or")}. These are common spellings and descriptions of the same dish.` : "",
    ),
  });

  const vat = vatIncluded(i.priceFils, s.vatRatePercent);
  const pricedOptions = f.optionEffects.filter((e) => e.option.priceDeltaFils !== 0);
  sections.push({
    heading: `${n}: price and portion`,
    body: paragraphs(
      `${n} costs ${price(i.priceFils)} at ${R}. Menu prices include 5% VAT; the VAT contained in ${aed(i.priceFils)} is ${aed(vat)}.`,
      `One order of ${n} is ${i.portion.description.replace(/^./, (x) => x.toLowerCase())}, and ${servesText(i)}.${i.portion.servesPeople > 1 ? ` That works out at about ${aed(Math.round(i.priceFils / i.portion.servesPeople))} per person.` : ""}`,
      pricedOptions.length
        ? `Options that change the price of ${n}:\n\n${bullets(pricedOptions.map((e) => `${e.option.name}: ${optionPrice(e.option.priceDeltaFils)} (total ${aed(i.priceFils + e.option.priceDeltaFils)})`))}`
        : `None of the customisation options change the price of ${n}.`,
    ),
  });

  sections.push({
    heading: `${n}: full ingredient list with quantities`,
    body: paragraphs(
      `These are the ingredients in one portion of ${n} as served by default at ${R}:`,
      bullets(
        i.ingredients.map((x) => {
          const ing = c.ingredientsById.get(x.ingredientId)!;
          const extras = [x.note, x.removable ? "can be left out on request" : "", ing.allergens.length ? `contains ${allergens(ing.allergens)}` : ""].filter(Boolean);
          return `${ing.name}: ${x.quantity}${extras.length ? ` (${extras.join("; ")})` : ""}`;
        }),
      ),
      i.sauces.length ? `${n} is also made with ${list(i.sauces.map((x) => c.saucesById.get(x.sauceId)!.name))}; their own ingredients are listed in the next section.` : `${n} is not made with any separate sauce or marinade.`,
    ),
  });

  if (i.sauces.length) {
    sections.push({
      heading: `${n}: sauces, marinades and spice blends`,
      body: i.sauces
        .map((x) => {
          const sauce = c.saucesById.get(x.sauceId)!;
          const comp = composeSauce(c, sauce.id);
          const ingr = sauce.ingredients.map((y) => c.ingredientsById.get(y.ingredientId)!.name.toLowerCase());
          const nested = (sauce.includesSauces ?? []).map((y) => c.saucesById.get(y.sauceId)!.name);
          return `**${sauce.name}**${sauce.arabicName ? ` (${sauce.arabicName})` : ""} is ${ROLE_WORDS[x.role]} ${n}${x.note ? ` (${x.note})` : ""}. ${sauce.description} ${sauce.name} is made from ${list([...ingr, ...nested])}. ${sauce.name} contains ${allergens(comp.allergens)}${comp.mayContain.length ? ` and may contain traces of ${allergens(comp.mayContain)}` : ""}.`;
        })
        .join("\n\n"),
    });
  }

  const sourceLine = (src: DishFacts["allergenSources"][number]) => {
    const bare = (x: string) => x.replace(/\s*\(.*\)\s*$/, "").toLowerCase();
    const parts = [
      ...src.ingredients.map((x) => `the ${bare(x)}`),
      ...src.preparations.map((p) => `the ${p.name}, which contains ${list(p.via.map(bare))}`),
    ];
    return `${cap(ALLERGEN_NAMES[src.allergen])}: from ${list(parts)}`;
  };
  sections.push({
    heading: `${n}: allergens`,
    body: paragraphs(
      contains.length
        ? `${n} contains ${allergens(contains)} as ingredients in its standard recipe. Where each allergen comes from:\n\n${bullets(f.allergenSources.map(sourceLine))}`
        : `${n} contains none of the 14 major allergens as ingredients in its standard recipe.`,
      f.traceSources.length
        ? `${n} may contain traces of ${allergens(f.comp.mayContain)}. Reasons:\n\n${bullets([...new Set(f.traceSources.flatMap((t) => t.reasons))])}`
        : `${n} has no specific trace warnings beyond the general kitchen statement below.`,
      notContained.length ? `${n} contains no ${list(notContained.map((a) => ALLERGEN_NAMES[a]), "or")}.` : "",
      `Kitchen allergen statement: ${kitchenAllergenStatement(c)}`,
    ),
  });

  if (f.avoidance.length) {
    sections.push({
      heading: `Removing allergens from ${n}`,
      body: paragraphs(
        bullets(
          f.avoidance.map((a) =>
            a.avoidableWith
              ? `${cap(ALLERGEN_NAMES[a.allergen])} can be left out of ${n} by choosing ${list(a.avoidableWith.map((o) => `“${o}”`))}. Traces may still be present because the kitchen is shared.`
              : `${cap(ALLERGEN_NAMES[a.allergen])} cannot be removed from ${n}; it is part of the recipe.`,
          ),
        ),
      ),
    });
  }

  const dietLines = DIETARY_TAGS.map((t) => `${TAG_QUESTIONS[t].label}: ${n} ${f.comp.dietaryTags.includes(t) ? TAG_QUESTIONS[t].yes : TAG_QUESTIONS[t].no}.`);
  const dietChanges = f.optionEffects.filter((e) => e.dietAfter !== f.comp.diet).map((e) => `Choosing “${e.option.name}” makes ${n} ${e.dietAfter}.`);
  sections.push({
    heading: `${n}: dietary suitability`,
    body: paragraphs(`${n} is ${DIET_WORDS[f.comp.diet]}. All meat and poultry at ${R} are halal, and no pork, alcohol or gelatine is used.`, bullets(dietLines), dietChanges.length ? bullets(dietChanges) : ""),
  });

  const spiceOpts = f.optionEffects.filter((e) => e.option.spiceLevel !== undefined);
  sections.push({
    heading: `${n}: how spicy it is`,
    body: paragraphs(
      `${n} is ${SPICE_WORDS[i.spiceLevel]} as standard. ${i.spiceAdjustment.note}`,
      `Can the spice be reduced? ${i.spiceAdjustment.canReduce ? "Yes." : "No."} Can it be made spicier? ${i.spiceAdjustment.canIncrease ? "Yes." : "No."}`,
      spiceOpts.length
        ? `Options that change the spice of ${n}: ${list(spiceOpts.map((e) => `“${e.option.name}” (${SPICE_WORDS[e.option.spiceLevel!]})`))}.`
        : "",
    ),
  });

  if (i.customizations.length) {
    sections.push({
      heading: `${n}: customisation options`,
      body: i.customizations
        .map((g) => {
          const rule = g.selection === "single" ? `choose one${g.required ? " (required)" : ""}` : `choose up to ${g.max}${g.required ? ` (at least ${g.min})` : " (optional)"}`;
          const lines = g.options.map((o) => {
            const e = f.optionEffects.find((x) => x.option.id === o.id);
            const effects = e
              ? [
                  e.removesAllergens.length ? `removes ${allergens(e.removesAllergens)} from the recipe` : "",
                  e.addsAllergens.length ? `adds ${allergens(e.addsAllergens)}` : "",
                  e.dietAfter !== f.comp.diet ? `makes the dish ${e.dietAfter}` : "",
                  o.spiceLevel !== undefined ? `spice becomes ${SPICE_WORDS[o.spiceLevel]}` : "",
                ].filter(Boolean)
              : [];
            return `${o.name}${o.default ? " — standard choice" : ""}: ${optionPrice(o.priceDeltaFils)}${effects.length ? `; ${effects.join("; ")}` : ""}${o.description ? `. ${o.description}` : ""} (option code ${o.id})`;
          });
          return `**${g.name}** for ${n} — ${rule}:\n\n${bullets(lines)}`;
        })
        .join("\n\n"),
    });
  }

  sections.push({ heading: `When ${n} is available`, body: bullets(availabilitySentences(k, f)) });

  const lead = f.leadTimeMinutes;
  sections.push({
    heading: `Ordering ${n}: dine-in, pickup and delivery`,
    body: paragraphs(
      bullets([
        `Dine-in at the restaurant: ${i.fulfilment.dineIn ? "yes" : "no"}`,
        `Pickup / takeaway: ${i.fulfilment.pickup ? "yes" : "no"}`,
        `Delivery: ${i.fulfilment.delivery ? `yes, to ${list(zones.map((z) => z.name))}` : "no, it is not delivered"}`,
        `Dine-in pre-order (ordered ahead with a table reservation): ${i.fulfilment.dineInPreorder ? "yes" : "no"}`,
      ]),
      i.bulk.bulkOnly
        ? `${n} is not part of regular takeaway orders; it is ordered through catering (see the catering section).`
        : `Ordered for pickup on its own, ${n} can be ready at the earliest ${lead} minutes after the order is placed (${i.prepTimeMinutes} minutes of cooking plus ${s.ordering.prepBufferMinutes} minutes of packing, and never less than ${s.ordering.minLeadMinutes} minutes). Pickup and delivery times are booked in ${s.ordering.slotMinutes}-minute slots. For delivery, add the drive time: ${list(zones.map((z) => `${z.driveMinutes} minutes to ${z.name.split(" — ")[0]}`))}.`,
      i.fulfilment.delivery ? "" : `${n} is not delivered because it does not travel well; it can be ${list(fulfilmentModes(i), "or")}.`,
    ),
  });

  sections.push({
    heading: `${n} for catering and large orders`,
    body: i.bulk.eligible
      ? paragraphs(
          i.bulk.bulkOnly ? `${n} is a catering-only dish: it is sold only through a catering order, not as part of a regular takeaway order.` : `${n} can be included in catering orders for groups and events.`,
          bullets(
            [
              i.bulk.minQuantity ? `Minimum quantity: ${i.bulk.minQuantity}` : "",
              i.bulk.maxQuantityPerDay ? `Maximum per day across all catering orders: ${i.bulk.maxQuantityPerDay}` : "",
              i.bulk.minNoticeHours ? `Notice needed: at least ${i.bulk.minNoticeHours} hours` : "",
              i.bulk.note ?? "",
              `Catering orders of more than ${s.ordering.maxPortionsPerOrder} portions follow the catering notice periods (${list([...s.bulk.noticeTiers].sort((a, b) => a.maxPortions - b.maxPortions).map((t) => `${t.hours} hours up to ${t.maxPortions} portions`))}) and volume discounts (${list([...s.bulk.discountTiers].sort((a, b) => a.minPortions - b.minPortions).map((t) => `${t.percent}% from ${t.minPortions} portions`))}).`,
            ].filter(Boolean),
          ),
        )
      : `${n} is not available in catering quantities because it is cooked to order. It can still be ordered in a regular order, up to ${i.maxPerOrder} per order.`,
  });

  const pairs = i.pairings.map((p) => c.itemsById.get(p)).filter((x): x is CatalogItem => !!x);
  if (pairs.length) {
    sections.push({
      heading: `What goes well with ${n}`,
      body: `The ${R} team suggests pairing ${n} with ${list(pairs.map((p) => `${p.name} (${aed(p.priceFils)})`))}.`,
    });
  }

  const qa: { q: string; a: string }[] = [
    ...i.customerQA.map((x) => ({ q: x.question, a: x.answer })),
    { q: `How much is ${n}?`, a: `${n} costs ${price(i.priceFils)}, including VAT.` },
    { q: `How many people does ${n} serve?`, a: `${n} ${servesText(i)} (${i.portion.description.replace(/^./, (x) => x.toLowerCase())}).` },
    { q: `Is ${n} vegan?`, a: `${n} ${f.comp.diet === "vegan" ? "is vegan" : `is not vegan; it is ${DIET_WORDS[f.comp.diet]}`}.` },
    { q: `Does ${n} contain nuts?`, a: contains.includes("tree_nuts") || contains.includes("peanuts") ? `Yes. ${n} contains ${allergens(contains.filter((a) => a === "tree_nuts" || a === "peanuts"))}.` : `${n} has no nut ingredients${f.comp.mayContain.includes("tree_nuts") ? ", but it may contain traces of tree nuts" : ""}. The kitchen is not nut-free.` },
    { q: `Does ${n} contain dairy?`, a: contains.includes("milk") ? `Yes, ${n} contains milk (dairy).` : `${n} has no dairy ingredients${f.comp.mayContain.includes("milk") ? ", but it may contain traces of milk" : ""}.` },
    { q: `Is ${n} gluten-free?`, a: contains.includes("gluten") ? `No, ${n} contains gluten (wheat).` : `${n} has no gluten-containing ingredients, but ${R} is not a certified gluten-free kitchen${f.comp.mayContain.includes("gluten") ? " and this dish may contain traces of gluten" : ""}.` },
    { q: `How spicy is ${n}?`, a: `${n} is ${SPICE_WORDS[i.spiceLevel]}. ${i.spiceAdjustment.note}` },
    { q: `Can I get ${n} delivered?`, a: i.fulfilment.delivery ? `Yes, ${n} can be delivered within ${R}'s delivery zones, ${time(s.delivery.start)} to ${time(s.delivery.end)}.` : `No, ${n} is not delivered. It can be ordered for ${list(fulfilmentModes(i), "or")}.` },
    { q: `How long does ${n} take?`, a: `${n} takes about ${i.prepTimeMinutes} minutes to prepare. For a pickup order, allow at least ${lead} minutes from ordering.` },
    { q: `When can I order ${n}?`, a: availabilitySentences(k, f).slice(0, 3).join(" ") },
  ];
  sections.push({ heading: `Questions guests ask about ${n}`, body: qa.map((x) => `**Q: ${x.q}**\n\nA: ${x.a}`).join("\n\n") });

  return {
    id: `dish-${i.slug}`,
    path: docPath.dish(i.slug),
    title: `${n} (${i.arabicName})`,
    docType: "dish",
    summary: `${n} is ${KIND_WORDS[i.kind]} at ${R}, priced at ${aed(i.priceFils)}. This document covers its ingredients with quantities, sauces, allergens, dietary suitability, spice, customisations, availability, ordering and catering rules.`,
    entities: [node.dish(i.slug), node.category(cat.slug), ...f.comp.sauceIds.map((id) => node.preparation(c.saucesById.get(id)!.slug)), ...contains.map((a) => node.allergen(a))],
    tags: ["menu", "dish", cat.slug, i.kind, f.comp.diet, ...(i.signature ? ["signature"] : [])],
    sections,
    related: relatedForDish(k, f),
  };
}

function usedInSentence(sf: ReturnType<typeof sauceFacts>): string {
  const n = sf.sauce.name;
  const parts = [
    sf.usedIn.length ? `${n} is served with ${list([...new Set(sf.usedIn.map((u) => u.item.name))])}.` : "",
    sf.optionalIn.length ? `${n} can be added as an extra to ${list([...new Set(sf.optionalIn.map((o) => o.item.name))])}.` : "",
    sf.componentOf.length ? `${n} is part of ${list(sf.componentOf.map((x) => x.name))}.` : "",
  ].filter(Boolean);
  return parts.join(" ") || `${n} is not currently served with any dish.`;
}

export function preparationDocument(k: KnowledgeContext, sauce: SauceDef): RagDocument {
  const c = k.catalog;
  const f = sauceFacts(k, sauce);
  const n = sauce.name;
  const kind = sauce.kind.replace("_", " ");
  const house = [...c.saucesById.values()].filter((s) => s.houseSpecial);
  const sections: RagSection[] = [];
  sections.push({
    heading: `${n} at a glance`,
    body: paragraphs(
      `${n}${sauce.arabicName ? ` (Arabic: ${sauce.arabicName})` : ""} is a ${kind} made in the ${R} kitchen${sauce.houseSpecial ? " and one of its named house preparations" : ""}. ${sauce.description}`,
      bullets([
        `Type: ${kind}`,
        `House preparation: ${sauce.houseSpecial ? "yes" : "no"}`,
        `Flavour: ${stripTrailingDot(sauce.flavourProfile)}`,
        `Spice: ${SPICE_WORDS[sauce.spiceLevel]}`,
        `Contains allergens: ${allergens(f.comp.allergens)}`,
        `May contain traces of: ${f.comp.mayContain.length ? allergens(f.comp.mayContain) : "no specific trace warnings"}`,
        `Diet: ${DIET_WORDS[f.comp.diet]}`,
        `Served: ${sauce.servedTemperature}`,
        `Used in: ${f.usedIn.length ? list([...new Set(f.usedIn.map((u) => u.item.name))]) : f.optionalIn.length ? `offered as an extra with ${list([...new Set(f.optionalIn.map((o) => o.item.name))])}` : f.componentOf.length ? `part of ${list(f.componentOf.map((x) => x.name))}` : "no dish"}`,
        `Extra portion: ${sauce.sidePriceFils !== null ? `${aed(sauce.sidePriceFils)} where offered as an extra` : "not sold separately"}`,
        sauce.aliases?.length ? `Also called: ${sauce.aliases.join(", ")}` : "",
      ]),
    ),
  });
  sections.push({
    heading: `Recipe of ${n}: every ingredient with quantities`,
    body: paragraphs(
      `One batch of ${n} yields ${sauce.batchYield} and is made from:`,
      bullets([
        ...sauce.ingredients.map((x) => {
          const ing = c.ingredientsById.get(x.ingredientId)!;
          return `${ing.name}: ${x.quantity}${ing.allergens.length ? ` (contains ${allergens(ing.allergens)})` : ""}`;
        }),
        ...f.nested.map((x) => `${x.sauce.name}: ${x.quantity} (a ${R} preparation with its own recipe)`),
      ]),
      f.nested.length ? `${n} includes ${list(f.nested.map((x) => x.sauce.name))}, so everything in ${list(f.nested.map((x) => x.sauce.name))} is also in ${n}.` : "",
    ),
  });
  sections.push({ heading: `How ${n} is made`, body: paragraphs(sauce.preparation, `Batch size: ${sauce.batchYield}. ${n} is served ${sauce.servedTemperature.toLowerCase()}.`) });
  sections.push({
    heading: `${n}: allergens and dietary information`,
    body: paragraphs(
      f.comp.allergens.length
        ? `${n} contains ${allergens(f.comp.allergens)}:\n\n${bullets(f.allergenSources.map((x) => `${cap(ALLERGEN_NAMES[x.allergen])} from ${list(x.ingredients.map((y) => y.toLowerCase()))}`))}`
        : `${n} contains none of the 14 major allergens as ingredients.`,
      f.comp.mayContain.length ? `${n} may contain traces of ${allergens(f.comp.mayContain)}.` : "",
      sauce.crossContactNotes.length ? `Cross-contact notes for ${n}:\n\n${bullets(sauce.crossContactNotes)}` : "",
      `${n} is ${DIET_WORDS[f.comp.diet]}.`,
    ),
  });
  sections.push({
    heading: `Dishes served with ${n}`,
    body: f.usedIn.length || f.optionalIn.length
      ? paragraphs(
          f.usedIn.length ? bullets(f.usedIn.map((u) => `${u.item.name} (${aed(u.item.priceFils)}): ${n} is ${ROLE_WORDS[u.role]} ${u.item.name}${u.note ? ` (${u.note})` : ""}`)) : "",
          f.optionalIn.length ? `${n} can be added as an extra to: ${list(f.optionalIn.map((o) => `${o.item.name} (“${o.optionName}”, ${optionPrice(o.priceDeltaFils)})`))}.` : "",
        )
      : `${n} is not served with a dish directly; it is a component of ${list(f.componentOf.map((x) => x.name))}.`,
  });
  if (f.componentOf.length) {
    sections.push({ heading: `Preparations that include ${n}`, body: `${n} is an ingredient of ${list(f.componentOf.map((x) => x.name))}. Dishes made with those preparations therefore also contain ${n}.` });
  }
  if (sauce.houseSpecial) {
    const others = house.filter((h) => h.id !== sauce.id);
    sections.push({
      heading: `${n} and the other ${R} house preparations`,
      body: `${R} has ${house.length} named house preparations: ${list(house.map((h) => h.name))}. When a guest asks for “the house sauce”, it is worth checking which one they mean. ${others.map((o) => `${o.name} contains ${allergens(composeSauce(c, o.id).allergens)}.`).join(" ")} ${n} contains ${allergens(f.comp.allergens)}.`,
    });
  }
  const qa = [
    { q: `What is in ${n}?`, a: `${n} is made from ${list([...sauce.ingredients.map((x) => c.ingredientsById.get(x.ingredientId)!.name.toLowerCase()), ...f.nested.map((x) => x.sauce.name)])}.` },
    { q: `Is ${n} vegan?`, a: f.comp.diet === "vegan" ? `Yes, ${n} is vegan.` : `No, ${n} is ${DIET_WORDS[f.comp.diet]}.` },
    { q: `Does ${n} contain nuts?`, a: f.comp.allergens.includes("tree_nuts") ? `Yes, ${n} contains tree nuts.` : `${n} has no nut ingredients${f.comp.mayContain.includes("tree_nuts") ? " but may contain traces of tree nuts" : ""}.` },
    { q: `Can I buy extra ${n}?`, a: sauce.sidePriceFils !== null ? `Yes, an extra portion of ${n} costs ${aed(sauce.sidePriceFils)} where it is offered as an extra.` : `${n} is not sold separately.` },
    { q: `Which dishes come with ${n}?`, a: f.usedIn.length ? list(f.usedIn.map((u) => u.item.name)) + "." : `None directly; it is used inside ${list(f.componentOf.map((x) => x.name))}.` },
  ];
  sections.push({ heading: `Questions guests ask about ${n}`, body: qa.map((x) => `**Q: ${x.q}**\n\nA: ${x.a}`).join("\n\n") });
  return {
    id: `preparation-${sauce.slug}`,
    path: docPath.preparation(sauce.slug),
    title: `${n}${sauce.arabicName ? ` (${sauce.arabicName})` : ""}`,
    docType: "preparation",
    summary: `${n} is a ${kind} made at ${R}. This document gives its full recipe with batch quantities, allergens, diet, method and every dish it is served with.`,
    entities: [node.preparation(sauce.slug), ...f.usedIn.map((u) => node.dish(u.item.slug)), ...f.comp.allergens.map((a) => node.allergen(a))],
    tags: ["menu", "preparation", sauce.kind, ...(sauce.houseSpecial ? ["house-preparation"] : [])],
    sections,
    related: [
      ...f.usedIn.map((u) => ({ path: docPath.dish(u.item.slug), title: u.item.name })),
      ...f.nested.map((x) => ({ path: docPath.preparation(x.sauce.slug), title: x.sauce.name })),
      ...f.componentOf.map((x) => ({ path: docPath.preparation(x.slug), title: x.name })),
      ...f.comp.allergens.map((a) => ({ path: docPath.allergen(a), title: `Allergen: ${ALLERGEN_NAMES[a]}` })),
      { path: "documents/menu/sauces-and-preparations-overview.md", title: "All sauces and preparations" },
    ],
  };
}

export function ingredientDocument(k: KnowledgeContext, ing: IngredientDef): RagDocument {
  const u = ingredientUse(k, ing.id);
  const n = ing.name;
  const removableIn = u.directIn.filter((d) => d.removable);
  const optionRemovers = k.catalog.items.flatMap((i) =>
    i.customizations.flatMap((g) => g.options.filter((o) => o.removesIngredientIds?.includes(ing.id)).map((o) => ({ item: i, option: o }))),
  );
  const optionAdders = k.catalog.items.flatMap((i) =>
    i.customizations.flatMap((g) => g.options.filter((o) => o.addsIngredientIds?.includes(ing.id)).map((o) => ({ item: i, option: o }))),
  );
  const totalDishes = new Set([...u.directIn.map((d) => d.item.id), ...u.viaPreparationIn.map((d) => d.item.id)]).size;
  const sections: RagSection[] = [
    {
      heading: `${n}: description, allergens and diet`,
      body: paragraphs(
        `${n}${ing.arabicName ? ` (Arabic: ${ing.arabicName})` : ""} ${isPlural(n) ? "are" : "is"} used in the ${R} kitchen. ${ing.description}`,
        bullets([
          `Diet class: ${ing.diet}`,
          `Allergens: ${ing.allergens.length ? allergens(ing.allergens) : "none of the 14 major allergens"}`,
          ing.mayContain?.length ? `May contain traces of: ${allergens(ing.mayContain)}` : "",
          ing.aliases?.length ? `Also called: ${ing.aliases.join(", ")}` : "",
          `Used in ${plural(totalDishes, "dish", "dishes")} and ${plural(u.inPreparations.length, "preparation")}`,
        ]),
        ing.notes ?? "",
      ),
    },
    {
      heading: `Dishes that use ${n}`,
      body: u.directIn.length
        ? bullets(u.directIn.map((d) => `${d.item.name} (${aed(d.item.priceFils)}) uses ${d.quantity} of ${n.toLowerCase()}${d.note ? ` (${d.note})` : ""}${d.removable ? "; it can be left out on request" : ""}.`))
        : `${n} ${be(n)} not added directly to any dish; ${isPlural(n) ? "they are" : "it is"} used inside preparations (see below).`,
    },
  ];
  if (u.inPreparations.length) {
    sections.push({ heading: `Sauces and preparations that use ${n}`, body: bullets(u.inPreparations.map((p) => `${p.sauce.name} uses ${p.quantity} of ${n.toLowerCase()} per batch.`)) });
  }
  if (u.viaPreparationIn.length) {
    sections.push({
      heading: `Dishes that contain ${n} through a preparation`,
      body: `These dishes contain ${n.toLowerCase()} because one of their preparations does:\n\n${bullets(u.viaPreparationIn.map((v) => `${v.item.name}, through ${v.sauce.name}`))}`,
    });
  }
  if (removableIn.length || optionRemovers.length || optionAdders.length) {
    sections.push({
      heading: `Leaving out or adding ${n}`,
      body: bullets([
        ...removableIn.map((d) => `${d.item.name}: ${n.toLowerCase()} can be left out on request.`),
        ...optionRemovers.map((o) => `${o.item.name}: choosing “${o.option.name}” removes ${n.toLowerCase()}.`),
        ...optionAdders.map((o) => `${o.item.name}: choosing “${o.option.name}” adds ${n.toLowerCase()} (${optionPrice(o.option.priceDeltaFils)}).`),
      ]),
    });
  }
  sections.push({
    heading: `Questions guests ask about ${n}`,
    body: [
      { q: `Do you use ${n.toLowerCase()}?`, a: totalDishes || u.inPreparations.length ? `Yes. ${R} uses ${n.toLowerCase()} in ${list([...u.directIn.map((d) => d.item.name), ...u.inPreparations.map((p) => p.sauce.name)])}.` : `${n} is stocked but not used in a current dish.` },
      { q: `Which dishes contain ${n.toLowerCase()}?`, a: totalDishes ? `${list([...new Set([...u.directIn.map((d) => d.item.name), ...u.viaPreparationIn.map((v) => v.item.name)])])}.` : "None directly." },
      { q: `Is ${n.toLowerCase()} an allergen?`, a: ing.allergens.length ? `${n} ${verb(n, "contains")} ${allergens(ing.allergens)}.` : `${n} ${be(n)} not one of the 14 major allergens${ing.mayContain?.length ? `, but ${isPlural(n) ? "they" : "it"} may contain traces of ${allergens(ing.mayContain)}` : ""}.` },
    ]
      .map((x) => `**Q: ${x.q}**\n\nA: ${x.a}`)
      .join("\n\n"),
  });
  return {
    id: `ingredient-${node.ingredient(ing.id).split(":")[1]}`,
    path: docPath.ingredient(ing.id),
    title: `${n}${ing.arabicName ? ` (${ing.arabicName})` : ""}`,
    docType: "ingredient",
    summary: `${n} as used at ${R}: what this ingredient is, its allergens and diet class, and every dish and preparation that uses it, with quantities.`,
    entities: [node.ingredient(ing.id), ...ing.allergens.map((a) => node.allergen(a)), ...u.directIn.map((d) => node.dish(d.item.slug)), ...u.inPreparations.map((p) => node.preparation(p.sauce.slug))],
    tags: ["menu", "ingredient", ing.diet, ...ing.allergens],
    sections,
    related: [
      ...u.directIn.map((d) => ({ path: docPath.dish(d.item.slug), title: d.item.name })),
      ...u.inPreparations.map((p) => ({ path: docPath.preparation(p.sauce.slug), title: p.sauce.name })),
      ...ing.allergens.map((a) => ({ path: docPath.allergen(a), title: `Allergen: ${ALLERGEN_NAMES[a]}` })),
    ],
  };
}

export function categoryDocument(k: KnowledgeContext, categoryId: string): RagDocument {
  const cat = k.catalog.categories.find((c) => c.id === categoryId)!;
  const items = visibleItems(k).filter((i) => i.categoryId === categoryId);
  const facts = items.map((i) => dishFacts(k, i));
  const prices = items.map((i) => i.priceFils);
  const sections: RagSection[] = [
    {
      heading: `${cat.name} section of the ${R} menu`,
      body: paragraphs(
        `${cat.name} (Arabic: ${cat.arabicName}) is a section of the ${R} menu with ${plural(items.length, "dish", "dishes")}. ${cat.description}`,
        prices.length ? `Prices in ${cat.name} range from ${aed(Math.min(...prices))} to ${aed(Math.max(...prices))}.` : "",
      ),
    },
    {
      heading: `All dishes in ${cat.name} with prices`,
      body: bullets(facts.map((f) => `${f.item.name} (${f.item.arabicName}) — ${aed(f.item.priceFils)}; ${servesText(f.item)}; ${f.comp.diet}; ${f.item.shortDescription}`)),
    },
    {
      heading: `${cat.name}: allergens and diets at a glance`,
      body: bullets(facts.map((f) => `${f.item.name}: contains ${allergens(f.comp.allergens)}${f.comp.mayContain.length ? `; may contain ${allergens(f.comp.mayContain)}` : ""}; ${f.comp.diet}`)),
    },
    {
      heading: `${cat.name}: when the dishes are served`,
      body: bullets(facts.map((f) => `${f.item.name}: ${stripTrailingDot(f.item.availabilityNote)}`)),
    },
  ];
  return {
    id: `category-${cat.slug}`,
    path: docPath.category(cat.slug),
    title: `${cat.name} (${cat.arabicName})`,
    docType: "menu-category",
    summary: `The ${cat.name} section of the ${R} menu: every dish with price, portion, diet, allergens and serving times.`,
    entities: [node.category(cat.slug), ...items.map((i) => node.dish(i.slug))],
    tags: ["menu", "category", cat.slug],
    sections,
    related: [...items.map((i) => ({ path: docPath.dish(i.slug), title: i.name })), { path: "documents/menu/menu-overview.md", title: "Menu overview" }],
  };
}

export function menuOverviewDocuments(k: KnowledgeContext): RagDocument[] {
  const items = visibleItems(k);
  const facts = items.map((i) => dishFacts(k, i));
  const byCat = k.catalog.categories.map((c) => ({ c, items: items.filter((i) => i.categoryId === c.id) }));
  const signature = items.filter((i) => i.signature);
  const featured = items.filter((i) => i.featured);
  const sorted = [...items].sort((a, b) => a.priceFils - b.priceFils);
  const regular = sorted.filter((i) => i.kind !== "catering");
  const sauces = [...k.catalog.saucesById.values()];

  const overview: RagDocument = {
    id: "menu-overview",
    path: "documents/menu/menu-overview.md",
    title: `${R} menu overview`,
    docType: "menu-overview",
    summary: `An overview of the ${R} menu: ${items.length} dishes in ${k.catalog.categories.length} sections, signature dishes, how prices, allergens and availability work.`,
    entities: [node.restaurant(), ...k.catalog.categories.map((c) => node.category(c.slug))],
    tags: ["menu", "overview"],
    sections: [
      {
        heading: `The ${R} menu in brief`,
        body: paragraphs(
          `${R} serves Emirati home cooking: machboos, harees, thareed, saloona, regag, luqaimat, Gulf seafood, charcoal grills and contemporary camel dishes. The menu has ${items.length} dishes in ${k.catalog.categories.length} sections. Prices run from ${aed(regular[0].priceFils)} (${regular[0].name}) to ${aed(regular[regular.length - 1].priceFils)} (${regular[regular.length - 1].name}) for regular dishes; catering items such as the Whole Lamb Ouzi cost more.`,
          `All prices are in UAE dirhams (AED) and include 5% VAT. All meat and poultry are halal. ${R} is alcohol-free and uses no pork or gelatine.`,
        ),
      },
      { heading: `Sections of the ${R} menu`, body: bullets(byCat.map(({ c, items: xs }) => `${c.name} (${c.arabicName}): ${plural(xs.length, "dish", "dishes")} — ${c.description}`)) },
      { heading: `${R} signature dishes`, body: `The signature dishes of ${R} are ${list(signature.map((i) => `${i.name} (${aed(i.priceFils)})`))}. Featured on the home page: ${list(featured.map((i) => i.name))}.` },
      {
        heading: `Types of dishes on the ${R} menu`,
        body: bullets([
          `Permanent dishes (${items.filter((i) => i.kind === "permanent").length}) are on the menu every day, within breakfast or lunch-and-dinner hours.`,
          `Weekly specials (${items.filter((i) => i.kind === "daily_special").length}) are cooked only on particular days: ${list(items.filter((i) => i.kind === "daily_special").map((i) => `${i.name} (${list(dishFacts(k, i).weekdays.map(weekday))})`))}.`,
          `Limited-time dishes (${items.filter((i) => i.kind === "limited_time").length}) are served only on certain dates: ${list(items.filter((i) => i.kind === "limited_time").map((i) => i.name))}.`,
          `Catering dishes (${items.filter((i) => i.kind === "catering").length}) are sold only through catering orders: ${list(items.filter((i) => i.kind === "catering").map((i) => i.name))}.`,
        ]),
      },
      {
        heading: `How allergens are listed on the ${R} menu`,
        body: `Every ${R} dish lists the allergens it contains as ingredients and the allergens it may contain as traces. Allergen information is worked out from each ingredient, including the ingredients inside sauces, marinades and spice blends, so a dish's allergens always match its recipe. ${kitchenAllergenStatement(k.catalog)}`,
      },
      {
        heading: `Vegan and vegetarian choices at ${R}`,
        body: `Vegan dishes: ${list(facts.filter((f) => f.comp.diet === "vegan").map((f) => f.item.name))}. Vegetarian (not vegan) dishes: ${list(facts.filter((f) => f.comp.diet === "vegetarian").map((f) => f.item.name))}. Pescatarian dishes: ${list(facts.filter((f) => f.comp.diet === "pescatarian").map((f) => f.item.name))}.`,
      },
    ],
    related: k.catalog.categories.map((c) => ({ path: docPath.category(c.slug), title: c.name })),
  };

  const priceList: RagDocument = {
    id: "price-list",
    path: "documents/menu/price-list.md",
    title: `${R} price list`,
    docType: "price-list",
    summary: `Every ${R} dish and drink with its price in AED (VAT included), grouped by menu section, plus priced options and the cheapest and most expensive dishes.`,
    entities: items.map((i) => node.dish(i.slug)),
    tags: ["menu", "prices"],
    sections: [
      ...byCat.map(({ c, items: xs }) => ({ heading: `${c.name} prices at ${R}`, body: bullets(xs.map((i) => `${i.name} (${i.arabicName}): ${price(i.priceFils)}${i.portion.servesPeople > 1 ? ` — serves ${i.portion.servesPeople}` : ""}`)) })),
      {
        heading: `Cheapest and most expensive dishes at ${R}`,
        body: bullets([
          `Cheapest item: ${regular[0].name} at ${aed(regular[0].priceFils)}.`,
          `Cheapest main course: ${(() => {
            const mains = regular.filter((i) => ["cat_traditional", "cat_rice", "cat_grills", "cat_vegetarian"].includes(i.categoryId));
            return `${mains[0].name} at ${aed(mains[0].priceFils)}`;
          })()}.`,
          `Most expensive regular dish: ${regular[regular.length - 1].name} at ${aed(regular[regular.length - 1].priceFils)}.`,
          `Most expensive individual main course: ${(() => {
            const mains = regular.filter((i) => ["cat_traditional", "cat_rice", "cat_grills", "cat_vegetarian"].includes(i.categoryId));
            return `${mains[mains.length - 1].name} at ${aed(mains[mains.length - 1].priceFils)}`;
          })()}.`,
          `Most expensive item overall: ${sorted[sorted.length - 1].name} at ${aed(sorted[sorted.length - 1].priceFils)} (catering only).`,
        ]),
      },
      {
        heading: `Options with an extra charge at ${R}`,
        body: bullets(
          facts.flatMap((f) => f.optionEffects.filter((e) => e.option.priceDeltaFils !== 0).map((e) => `${f.item.name} — ${e.option.name}: ${optionPrice(e.option.priceDeltaFils)}`)),
        ),
      },
      { heading: `Extra sauces sold as a side at ${R}`, body: bullets(sauces.filter((s) => s.sidePriceFils !== null).map((s) => `${s.name}: ${aed(s.sidePriceFils!)}`)) },
    ],
    related: [{ path: "documents/menu/menu-overview.md", title: "Menu overview" }],
  };

  const spice: RagDocument = {
    id: "spice-guide",
    path: "documents/menu/spice-guide.md",
    title: `${R} spice guide`,
    docType: "guide",
    summary: `How spicy each ${R} dish is (levels 0 to 3), which dishes can be made milder or hotter, and where the heat comes from.`,
    entities: [0, 1, 2, 3].map((l) => node.spiceLevel(l)),
    tags: ["menu", "spice"],
    sections: [
      {
        heading: `How ${R} rates spice`,
        body: `${R} rates each dish from 0 to 3: 0 = not spicy, 1 = mild (warm spices such as bezar rather than chilli heat), 2 = medium-hot, 3 = hot. Emirati food is generally fragrant rather than fiery; most heat comes from dakkus, the tomato-chilli sauce served on the side.`,
      },
      ...([0, 1, 2, 3] as const).map((l) => ({
        heading: `${R} dishes that are ${SPICE_WORDS[l].split(" (")[0]} (level ${l})`,
        body: facts.some((f) => f.item.spiceLevel === l) ? `${R} dishes rated ${SPICE_WORDS[l]}: ${list(facts.filter((f) => f.item.spiceLevel === l).map((f) => f.item.name))}.` : `No ${R} dish is rated ${SPICE_WORDS[l]} as standard; guests who want more heat can ask for extra dakkus or choose “Hot” where a spice choice is offered.`,
      })),
      { heading: `${R} dishes that can be made milder`, body: `These ${R} dishes can be made milder on request: ${list(facts.filter((f) => f.item.spiceAdjustment.canReduce).map((f) => f.item.name))}.` },
      { heading: `${R} dishes that can be made spicier`, body: `These ${R} dishes can be made spicier on request: ${list(facts.filter((f) => f.item.spiceAdjustment.canIncrease).map((f) => f.item.name))}.` },
      { heading: `${R} dishes whose spice cannot be changed`, body: bullets(facts.filter((f) => !f.item.spiceAdjustment.canReduce && !f.item.spiceAdjustment.canIncrease).map((f) => `${f.item.name}: ${f.item.spiceAdjustment.note}`)) },
    ],
    related: [{ path: docPath.preparation(k.catalog.saucesById.get("sau_dakkus")!.slug), title: k.catalog.saucesById.get("sau_dakkus")!.name }],
  };

  const prepOverview: RagDocument = {
    id: "sauces-and-preparations-overview",
    path: "documents/menu/sauces-and-preparations-overview.md",
    title: `${R} sauces, marinades and spice blends`,
    docType: "overview",
    summary: `All ${sauces.length} sauces, dips, marinades, spice blends, toppings and syrups made at ${R}, with their allergens and the dishes they are used in.`,
    entities: sauces.map((s) => node.preparation(s.slug)),
    tags: ["menu", "preparation", "sauces"],
    sections: [
      {
        heading: `${R} house preparations`,
        body: `${R} has ${sauces.filter((s) => s.houseSpecial).length} named house preparations: ${list(sauces.filter((s) => s.houseSpecial).map((s) => `${s.name} (contains ${allergens(composeSauce(k.catalog, s.id).allergens)})`))}. Guests sometimes say “the house sauce” for Al Ghaf House Red, Al Ghaf House Green or Sauce No. 7, which are three different sauces.`,
      },
      ...sauces.map((s) => {
        const sf = sauceFacts(k, s);
        return {
          heading: `${s.name} in short`,
          body: `${s.name}${s.arabicName ? ` (${s.arabicName})` : ""} is a ${s.kind.replace("_", " ")}. ${s.description} ${s.name} contains ${allergens(sf.comp.allergens)}${sf.comp.mayContain.length ? ` and may contain traces of ${allergens(sf.comp.mayContain)}` : ""}. ${usedInSentence(sf)}`,
        };
      }),
    ],
    related: sauces.map((s) => ({ path: docPath.preparation(s.slug), title: s.name })),
  };
  return [overview, priceList, spice, prepOverview];
}

export function allMenuDocuments(k: KnowledgeContext): RagDocument[] {
  return [
    ...menuOverviewDocuments(k),
    ...k.catalog.categories.map((c) => categoryDocument(k, c.id)),
    ...visibleItems(k).map((i) => dishDocument(k, dishFacts(k, i))),
    ...[...k.catalog.saucesById.values()].map((s) => preparationDocument(k, s)),
    ...[...k.catalog.ingredientsById.values()].map((i) => ingredientDocument(k, i)),
  ];
}

export type { Allergen };
