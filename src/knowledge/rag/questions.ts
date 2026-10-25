/**
 * Evaluation questions for a chatbot that answers from this corpus. Every expected
 * answer is computed from the same data as the documents. `key_facts` are short
 * strings a correct answer must contain; for `grounded` questions each key fact
 * appears verbatim in at least one of the `sources` (checked by a unit test).
 */
import { composeItem, sauceIngredientIds, type CatalogItem } from "@/domain/catalog";
import { bulkDiscountPercent, depositFor } from "@/domain/bulk-rules";
import { findDeliveryZone } from "@/domain/delivery";
import { describeDay } from "@/domain/hours";
import { percentOf } from "@/domain/money";
import { minutesToTime, timeToMinutes } from "@/domain/time";
import { policyFacts as pf } from "@/data/policies";
import { ALLERGENS, type Allergen, type IsoWeekday } from "@/domain/types";
import type { KnowledgeContext } from "../context";
import { categoryOf, dishFacts, ingredientUse, sauceFacts, visibleItems, type DishFacts } from "./facts";
import { docPath, node } from "./ids";
import { minus } from "./restaurant-docs";
import { aed, ALLERGEN_NAMES, allergens, date, list, weekday, WEEKDAYS } from "./text";

export type Reasoning = "single-fact" | "multi-hop" | "aggregation" | "comparison" | "temporal" | "numeric" | "negative" | "safety" | "unanswerable" | "live-check";

export interface EvalQuestion {
  id: string;
  question: string;
  answer: string;
  key_facts: string[];
  category: string;
  reasoning: Reasoning;
  difficulty: "easy" | "medium" | "hard";
  priority: "core" | "extended";
  sources: string[];
  entities: string[];
  grounded: boolean;
  must_not_say?: string[];
  paraphrases?: string[];
  notes?: string;
}

type Q = Omit<EvalQuestion, "id" | "grounded" | "priority"> & { grounded?: boolean; priority?: "core" | "extended" };

const MAINS = ["cat_traditional", "cat_rice", "cat_grills", "cat_vegetarian"];

export function buildQuestions(k: KnowledgeContext): EvalQuestion[] {
  const c = k.catalog;
  const s = k.rc.settings;
  const p = k.rc.profile;
  const items = visibleItems(k);
  const facts = items.map((i) => dishFacts(k, i));
  const byId = new Map(facts.map((f) => [f.item.id, f]));
  const F = (id: string) => byId.get(id)!;
  const D = (id: string) => docPath.dish(c.itemsById.get(id)!.slug);
  const wk = s.weeklyHours;
  const out: Q[] = [];
  const q = (x: Q) => out.push(x);
  const names = (xs: DishFacts[]) => xs.map((f) => f.item.name);

  // ------------------------------------------------------------- per dish
  facts.forEach((f, idx) => {
    const i = f.item;
    const doc = D(i.id);
    const ent = [node.dish(i.slug)];
    const core = i.signature || i.kind !== "permanent";
    q({
      question: `How much is the ${i.name}?`,
      answer: `${i.name} costs ${aed(i.priceFils)}, including VAT.`,
      key_facts: [aed(i.priceFils)],
      category: "menu-prices",
      reasoning: "single-fact",
      difficulty: "easy",
      sources: [doc, "documents/menu/price-list.md"],
      entities: ent,
      paraphrases: i.aliases.slice(0, 2).map((a) => `how much is ${a}`),
      priority: core ? "core" : "extended",
    });
    q({
      question: `What allergens does ${i.name} contain?`,
      answer: f.comp.allergens.length
        ? `${i.name} contains ${allergens(f.comp.allergens)}${f.comp.mayContain.length ? `, and may contain traces of ${allergens(f.comp.mayContain)}` : ""}. The kitchen is shared, so no dish is guaranteed allergen-free.`
        : `${i.name} contains none of the 14 major allergens as ingredients${f.comp.mayContain.length ? `, but may contain traces of ${allergens(f.comp.mayContain)}` : ""}. The kitchen is shared, so it cannot be guaranteed allergen-free.`,
      key_facts: f.comp.allergens.length ? f.comp.allergens.map((a) => ALLERGEN_NAMES[a]) : ["none of the 14 major allergens"],
      category: "allergens",
      reasoning: f.comp.sauceIds.length ? "multi-hop" : "single-fact",
      difficulty: f.comp.sauceIds.length ? "medium" : "easy",
      sources: [doc],
      entities: [...ent, ...f.comp.allergens.map((a) => node.allergen(a))],
      must_not_say: ["is allergen-free", "is 100% safe"],
      priority: i.signature ? "core" : "extended",
    });
    const dietQ = ["vegan", "vegetarian", "vegan", "vegetarian"][idx % 4] as "vegan" | "vegetarian";
    const isDiet = dietQ === "vegan" ? f.comp.diet === "vegan" : f.comp.diet === "vegan" || f.comp.diet === "vegetarian";
    q({
      question: `Is the ${i.name} ${dietQ}?`,
      answer: isDiet ? `Yes, ${i.name} is ${f.comp.diet}.` : `No. ${i.name} is ${f.comp.diet === "meat" ? "a meat dish" : f.comp.diet}.`,
      key_facts: [isDiet ? "yes" : "no"],
      category: "diet",
      reasoning: "single-fact",
      difficulty: f.item.id === "mi_mehyawa_regag" ? "hard" : "easy",
      sources: [doc],
      entities: [...ent, node.diet(dietQ)],
      priority: "extended",
      notes: "Key fact is the yes/no verdict.",
      grounded: false,
    });
    if (f.weekdays.length < 7) {
      const other = WEEKDAYS.find((d) => !f.weekdays.includes(d))!;
      q({
        question: `Can I order the ${i.name} on a ${weekday(other)}?`,
        answer: `No. ${i.name} is only served on ${list(f.weekdays.map((d) => `${weekday(d)}s`))}. It can be pre-ordered up to ${s.ordering.maxAdvanceDays} days ahead for its own day.`,
        key_facts: f.weekdays.map((d) => weekday(d)),
        category: "availability",
        reasoning: "temporal",
        difficulty: "medium",
        sources: [doc, "documents/calendar/weekly-specials.md"],
        entities: [...ent, node.weekday(other)],
        priority: "core",
      });
    } else if (f.isBreakfast) {
      q({
        question: `Can I get ${i.name} at 2 pm?`,
        answer: `No. ${i.name} is a breakfast dish, served ${s.breakfast.start}–${s.breakfast.end} (not during Ramadan).`,
        key_facts: [s.breakfast.start, s.breakfast.end],
        category: "availability",
        reasoning: "temporal",
        difficulty: "medium",
        sources: [doc],
        entities: [...ent, node.mealPeriod("breakfast")],
        priority: "extended",
      });
    } else if (f.timeWindow) {
      q({
        question: `From what time is ${i.name} served?`,
        answer: `${i.name} is served from ${f.timeWindow.start}${f.timeWindow.end === "24:00" ? " until the kitchen closes" : ` until ${f.timeWindow.end}`}.`,
        key_facts: [f.timeWindow.start],
        category: "availability",
        reasoning: "single-fact",
        difficulty: "easy",
        sources: [doc],
        entities: ent,
        priority: "extended",
      });
    }
    const first = i.ingredients[0];
    const ing = c.ingredientsById.get(first.ingredientId)!;
    q({
      question: `How much ${ing.name.toLowerCase().replace(/ \(.*\)$/, "")} is in one ${i.name}?`,
      answer: `One ${i.name} contains ${first.quantity} of ${ing.name.toLowerCase()}.`,
      key_facts: [first.quantity],
      category: "ingredients",
      reasoning: "single-fact",
      difficulty: "medium",
      sources: [doc],
      entities: [...ent, node.ingredient(ing.id)],
      priority: "extended",
    });
    const rot = idx % 4;
    if (rot === 0 || i.portion.servesPeople > 1) {
      q({
        question: `How many people does the ${i.name} serve?`,
        answer: `${i.name} serves ${i.portion.servesPeople} (${i.portion.description}).`,
        key_facts: [String(i.portion.servesPeople)],
        category: "menu-portions",
        reasoning: "single-fact",
        difficulty: "easy",
        sources: [doc],
        entities: ent,
        priority: i.portion.servesPeople > 1 ? "core" : "extended",
        grounded: false,
      });
    } else if (rot === 1) {
      q({
        question: `Can the ${i.name} be delivered?`,
        answer: i.fulfilment.delivery && !i.bulk.bulkOnly ? `Yes, ${i.name} can be delivered within the delivery zones, ${s.delivery.start}–${s.delivery.end}.` : `No, ${i.name} is not delivered${i.bulk.bulkOnly ? " as a regular order; it is a catering dish" : ""}.`,
        key_facts: [i.fulfilment.delivery ? "yes" : "no"],
        category: "ordering",
        reasoning: "single-fact",
        difficulty: "easy",
        sources: [doc],
        entities: [...ent, node.orderType("delivery")],
        priority: i.fulfilment.delivery ? "extended" : "core",
        grounded: false,
      });
    } else if (rot === 2) {
      q({
        question: `How long does the ${i.name} take to prepare?`,
        answer: `About ${i.prepTimeMinutes} minutes. Ordered for pickup on its own, it can be ready at the earliest ${f.leadTimeMinutes} minutes after ordering.`,
        key_facts: [`${i.prepTimeMinutes} minutes`],
        category: "ordering",
        reasoning: "single-fact",
        difficulty: "easy",
        sources: [doc],
        entities: ent,
        priority: "extended",
      });
    } else {
      q({
        question: `What is the Arabic name of ${i.name}?`,
        answer: `${i.name} is ${i.arabicName} in Arabic.`,
        key_facts: [i.arabicName],
        category: "menu",
        reasoning: "single-fact",
        difficulty: "easy",
        sources: [doc],
        entities: ent,
        priority: "extended",
      });
    }
    const removable = f.avoidance.find((a) => a.avoidableWith);
    if (removable) {
      q({
        question: `Can I have the ${i.name} without ${ALLERGEN_NAMES[removable.allergen].replace(/ \(.*\)/, "")}?`,
        answer: `Yes. Choose ${list(removable.avoidableWith!.map((o) => `“${o}”`))} and ${ALLERGEN_NAMES[removable.allergen]} is left out of the recipe. Traces may still be present because the kitchen is shared.`,
        key_facts: removable.avoidableWith!,
        category: "allergens",
        reasoning: "multi-hop",
        difficulty: "medium",
        sources: [doc],
        entities: [...ent, node.allergen(removable.allergen)],
        must_not_say: ["completely free of", "we guarantee"],
        priority: "extended",
      });
    }
    if (i.sauces.length) {
      const prep = c.saucesById.get(i.sauces[0].sauceId)!;
      q({
        question: `Which sauce, marinade or spice blend is used in ${i.name}?`,
        answer: `${i.name} is made with ${list(i.sauces.map((x) => c.saucesById.get(x.sauceId)!.name))}.`,
        key_facts: [prep.name],
        category: "ingredients",
        reasoning: "single-fact",
        difficulty: "easy",
        sources: [doc],
        entities: [...ent, node.preparation(prep.slug)],
        priority: "extended",
      });
    }
  });

  // ------------------------------------------------------------- preparations
  for (const sauce of c.saucesById.values()) {
    const sf = sauceFacts(k, sauce);
    const doc = docPath.preparation(sauce.slug);
    const ent = [node.preparation(sauce.slug)];
    q({
      question: `What is in the ${sauce.name}?`,
      answer: `${sauce.name} is made from ${list([...sauce.ingredients.map((x) => c.ingredientsById.get(x.ingredientId)!.name.toLowerCase()), ...sf.nested.map((x) => x.sauce.name)])}.`,
      key_facts: sauce.ingredients.slice(0, 3).map((x) => c.ingredientsById.get(x.ingredientId)!.name),
      category: "ingredients",
      reasoning: "single-fact",
      difficulty: "medium",
      sources: [doc],
      entities: ent,
      priority: sauce.houseSpecial ? "core" : "extended",
    });
    q({
      question: `Does the ${sauce.name} contain any allergens?`,
      answer: sf.comp.allergens.length
        ? `Yes, ${sauce.name} contains ${allergens(sf.comp.allergens)}${sf.comp.mayContain.length ? ` and may contain traces of ${allergens(sf.comp.mayContain)}` : ""}.`
        : `${sauce.name} contains none of the 14 major allergens as ingredients${sf.comp.mayContain.length ? `, but may contain traces of ${allergens(sf.comp.mayContain)}` : ""}.`,
      key_facts: sf.comp.allergens.length ? sf.comp.allergens.map((a) => ALLERGEN_NAMES[a]) : sf.comp.mayContain.length ? sf.comp.mayContain.map((a) => ALLERGEN_NAMES[a]) : ["none of the 14 major allergens"],
      category: "allergens",
      reasoning: sf.nested.length ? "multi-hop" : "single-fact",
      difficulty: "medium",
      sources: [doc],
      entities: [...ent, ...sf.comp.allergens.map((a) => node.allergen(a))],
      must_not_say: ["is allergen-free"],
      priority: sauce.houseSpecial ? "core" : "extended",
    });
    if (sf.usedIn.length) {
      q({
        question: `Which dishes come with ${sauce.name}?`,
        answer: `${sauce.name} is used in ${list(sf.usedIn.map((u) => u.item.name))}.`,
        key_facts: [...new Set(sf.usedIn.map((u) => u.item.name))],
        category: "ingredients",
        reasoning: "aggregation",
        difficulty: "medium",
        sources: [doc],
        entities: [...ent, ...sf.usedIn.map((u) => node.dish(u.item.slug))],
        priority: "extended",
      });
    }
  }

  // ------------------------------------------------------------- ingredients (multi-hop)
  for (const ingId of ["ing_walnuts", "ing_pine_nuts", "ing_loomi", "ing_ghee", "ing_raisins", "ing_tahini", "ing_saffron", "ing_camel_milk", "ing_dates", "ing_vegetable_stock", "ing_almonds", "ing_pistachios", "ing_soy_sauce"]) {
    const ing = c.ingredientsById.get(ingId);
    if (!ing) continue;
    const u = ingredientUse(k, ingId);
    const dishes = [...new Set([...u.directIn.map((d) => d.item.name), ...u.viaPreparationIn.map((v) => v.item.name)])];
    if (!dishes.length) continue;
    q({
      question: `Which dishes contain ${ing.name.toLowerCase()}?`,
      answer: `${list(dishes)}${u.viaPreparationIn.length ? ` (${list(u.viaPreparationIn.map((v) => `${v.item.name} through ${v.sauce.name}`))})` : ""}.`,
      key_facts: dishes,
      category: "ingredients",
      reasoning: u.viaPreparationIn.length ? "multi-hop" : "aggregation",
      difficulty: u.viaPreparationIn.length ? "hard" : "medium",
      sources: [docPath.ingredient(ingId)],
      entities: [node.ingredient(ingId), ...dishes.map((n) => node.dish(c.items.find((x) => x.name === n)!.slug))],
      priority: ["ing_walnuts", "ing_pine_nuts", "ing_raisins"].includes(ingId) ? "core" : "extended",
    });
  }

  // ------------------------------------------------------------- allergens & diets
  for (const a of ALLERGENS) {
    const containing = facts.filter((f) => f.comp.allergens.includes(a));
    q({
      question: `Which dishes contain ${ALLERGEN_NAMES[a].replace(/ \(.*\)/, "")}?`,
      answer: containing.length ? `${list(names(containing))}.` : `None. ${ALLERGEN_NAMES[a]} is not used as an ingredient at Bayt Al Ghaf, although supplier products may carry traces.`,
      key_facts: containing.length ? names(containing) : ["not used as an ingredient"],
      category: "allergens",
      reasoning: "aggregation",
      difficulty: containing.length > 8 ? "hard" : "medium",
      sources: [docPath.allergen(a)],
      entities: [node.allergen(a), ...containing.map((f) => node.dish(f.item.slug))],
      must_not_say: ["are safe for", "are allergen-free"],
      priority: ["tree_nuts", "sesame", "fish", "peanuts", "crustaceans"].includes(a) ? "core" : "extended",
    });
  }
  const vegan = facts.filter((f) => f.comp.diet === "vegan");
  q({ question: "Which dishes are vegan?", answer: `${list(names(vegan))}.`, key_facts: names(vegan), category: "diet", reasoning: "aggregation", difficulty: "medium", sources: [docPath.diet("vegan")], entities: [node.diet("vegan")], priority: "core" });
  const veganMains = vegan.filter((f) => MAINS.includes(f.item.categoryId)).sort((a, b) => a.item.priceFils - b.item.priceFils);
  const cheapestVegan = veganMains.filter((f) => f.item.priceFils === veganMains[0].item.priceFils);
  q({ question: "What is the cheapest vegan main course?", answer: `${list(names(cheapestVegan), "and")} at ${aed(cheapestVegan[0].item.priceFils)}${cheapestVegan.length > 1 ? " each" : ""}.`, key_facts: [...names(cheapestVegan), aed(cheapestVegan[0].item.priceFils)], category: "diet", reasoning: "comparison", difficulty: "hard", sources: [docPath.diet("vegan"), "documents/menu/price-list.md"], entities: cheapestVegan.map((f) => node.dish(f.item.slug)), priority: "core" });
  const veganDelivery = vegan.filter((f) => f.item.fulfilment.delivery);
  q({ question: "Which vegan dishes can be delivered?", answer: `${list(names(veganDelivery))}.`, key_facts: names(veganDelivery), category: "diet", reasoning: "multi-hop", difficulty: "hard", sources: [docPath.diet("vegan"), "documents/ordering/ordering-overview.md"], entities: veganDelivery.map((f) => node.dish(f.item.slug)), priority: "core", grounded: false });
  const glutenFreeMains = facts.filter((f) => MAINS.includes(f.item.categoryId) && !f.comp.allergens.includes("gluten"));
  q({ question: "Which main courses have no gluten ingredients?", answer: `${list(names(glutenFreeMains))}. None is certified gluten-free: wheat is used throughout the kitchen and the fryer is shared.`, key_facts: [...names(glutenFreeMains).slice(0, 4), "not a certified gluten-free kitchen"], category: "diet", reasoning: "multi-hop", difficulty: "hard", sources: [docPath.diet("gluten-free-ingredients")], entities: glutenFreeMains.map((f) => node.dish(f.item.slug)), must_not_say: ["is a gluten-free kitchen", "are safe for coeliacs"], priority: "core", grounded: false });
  const sesameGluten = facts.filter((f) => f.comp.allergens.includes("sesame") && f.comp.allergens.includes("gluten"));
  q({ question: "Which dishes contain both sesame and gluten?", answer: `${list(names(sesameGluten))}.`, key_facts: names(sesameGluten), category: "allergens", reasoning: "multi-hop", difficulty: "hard", sources: [docPath.allergen("sesame"), docPath.allergen("gluten")], entities: sesameGluten.map((f) => node.dish(f.item.slug)), priority: "extended", grounded: false });
  const no7 = facts.filter((f) => f.item.sauces.some((x) => x.sauceId === "sau_no7"));
  q({ question: "Which dishes are glazed with Sauce No. 7, and what allergens does that glaze bring?", answer: `${list(names(no7))}. Sauce No. 7 contains ${allergens(sauceFacts(k, c.saucesById.get("sau_no7")!).comp.allergens)}.`, key_facts: [...names(no7), "soy", "sesame"], category: "allergens", reasoning: "multi-hop", difficulty: "hard", sources: [docPath.preparation(c.saucesById.get("sau_no7")!.slug)], entities: [node.preparation(c.saucesById.get("sau_no7")!.slug), ...no7.map((f) => node.dish(f.item.slug))], priority: "core" });
  const bezarDishes = facts.filter((f) => f.comp.sauceIds.some((sid) => sid === "sau_bezar" || containsPrep(k, sid, "sau_bezar")));
  q({ question: "Which dishes are seasoned with bezar, directly or through another sauce or marinade?", answer: `${list(names(bezarDishes))}.`, key_facts: names(bezarDishes).slice(0, 6), category: "ingredients", reasoning: "multi-hop", difficulty: "hard", sources: [docPath.preparation(c.saucesById.get("sau_bezar")!.slug)], entities: [node.preparation(c.saucesById.get("sau_bezar")!.slug)], priority: "extended", grounded: false, notes: "Requires following INCLUDES_PREPARATION edges (e.g. bezar inside marinades and the hashu topping)." });
  const notSpicyVeg = facts.filter((f) => f.item.spiceLevel === 0 && (f.comp.diet === "vegan" || f.comp.diet === "vegetarian") && f.item.kind !== "catering");
  q({ question: "Which vegetarian dishes are not spicy at all?", answer: `${list(names(notSpicyVeg))}.`, key_facts: names(notSpicyVeg).slice(0, 5), category: "diet", reasoning: "multi-hop", difficulty: "hard", sources: ["documents/menu/spice-guide.md", docPath.diet("vegetarian")], entities: notSpicyVeg.map((f) => node.dish(f.item.slug)), priority: "extended", grounded: false });

  // ------------------------------------------------------------- house sauce disambiguation & safety
  const red = sauceFacts(k, c.saucesById.get("sau_ghaf_red")!);
  const green = sauceFacts(k, c.saucesById.get("sau_ghaf_green")!);
  q({ question: "Does the house sauce have nuts?", answer: `It depends which house sauce: Al Ghaf House Red contains walnuts (tree nuts) and wheat; Al Ghaf House Green has no nut ingredients but is made on the same blender, so it may contain traces of tree nuts. Ask which dish the guest means.`, key_facts: ["Al Ghaf House Red", "walnuts", "Al Ghaf House Green", "traces"], category: "safety", reasoning: "multi-hop", difficulty: "hard", sources: [docPath.preparation(red.sauce.slug), docPath.preparation(green.sauce.slug)], entities: [node.preparation(red.sauce.slug), node.preparation(green.sauce.slug)], must_not_say: ["the house sauce is nut-free", "both house sauces are nut-free"], priority: "core", grounded: false });
  q({ question: "Is the hummus completely nut-free? My daughter has a tree-nut allergy.", answer: "No. The hummus is topped with pine nuts, which Bayt Al Ghaf counts as tree nuts. It can be ordered without pine nuts, but traces may remain because the kitchen is shared and is not nut-free. For a severe allergy, speak to the duty manager before ordering.", key_facts: ["pine nuts", "duty manager"], category: "safety", reasoning: "safety", difficulty: "hard", sources: [D("mi_hummus_lamb"), docPath.allergen("tree_nuts")], entities: [node.dish(c.itemsById.get("mi_hummus_lamb")!.slug), node.allergen("tree_nuts")], must_not_say: ["is completely nut-free", "it is safe", "guaranteed to be nut-free"], priority: "core", grounded: false });
  q({ question: "Can you guarantee there is no cross-contamination with gluten for a coeliac guest?", answer: "No. Bayt Al Ghaf has one shared kitchen where wheat is used throughout and the fryer is shared. Some dishes have no gluten ingredients, but none is certified gluten-free. A guest with coeliac disease should speak to the duty manager before ordering.", key_facts: ["shared", "duty manager"], category: "safety", reasoning: "safety", difficulty: "medium", sources: ["documents/allergens-and-diets/allergen-policy.md", docPath.diet("gluten-free-ingredients")], entities: [node.policy("allergens"), node.allergen("gluten")], must_not_say: ["we can guarantee", "is a gluten-free kitchen", "100% gluten-free"], priority: "core", grounded: false });
  q({ question: "My son has a severe peanut allergy. Which dishes are safe for him?", answer: "Bayt Al Ghaf does not use peanuts as an ingredient in any dish, but supplier products may carry traces and the kitchen is shared, so no dish can be promised to be free of peanut traces. Please speak to the duty manager before ordering and mention the allergy in any order notes.", key_facts: ["peanuts", "duty manager"], category: "safety", reasoning: "safety", difficulty: "hard", sources: [docPath.allergen("peanuts"), "documents/allergens-and-diets/allergen-policy.md"], entities: [node.allergen("peanuts")], must_not_say: ["is safe for him", "are safe for him", "guaranteed to be peanut-free", "is a peanut-free kitchen"], priority: "core", grounded: false });
  q({ question: "Is the Mehyawa Regag vegetarian? It's just bread, right?", answer: "No. Mehyawa Regag is made with mehyawa, a fermented fish sauce, so it contains fish (it is pescatarian). It also contains gluten, eggs, milk and mustard.", key_facts: ["fish"], category: "safety", reasoning: "multi-hop", difficulty: "hard", sources: [D("mi_mehyawa_regag"), docPath.preparation(c.saucesById.get("sau_mehyawa")!.slug)], entities: [node.dish(c.itemsById.get("mi_mehyawa_regag")!.slug)], must_not_say: ["yes, it is vegetarian"], priority: "core" });
  q({ question: "Is the Al Ghaf House Green sauce safe for someone with a nut allergy?", answer: `Al Ghaf House Green has no nut ingredients, but it is made on the same blender as Al Ghaf House Red (which contains walnuts), so it may contain traces of tree nuts. Bayt Al Ghaf cannot promise it is free of nut traces.`, key_facts: ["tree nuts"], category: "safety", reasoning: "safety", difficulty: "hard", sources: [docPath.preparation(green.sauce.slug)], entities: [node.preparation(green.sauce.slug)], must_not_say: ["it is safe", "it is nut-free"], priority: "core" });
  q({ question: "Can I give you my card number over the phone to pay for my order?", answer: "No. Bayt Al Ghaf never takes card numbers over the phone, by WhatsApp or by e-mail. Orders are paid on collection, on delivery or at the table, by cash or card in person.", key_facts: ["never"], category: "safety", reasoning: "negative", difficulty: "easy", sources: ["documents/restaurant/payments-and-prices.md", "documents/policies/privacy-and-verification.md"], entities: [node.policy("privacy")], must_not_say: ["read me your card number", "give me your card number"], priority: "core" });
  q({ question: "Is the camel burger halal?", answer: "Yes. All meat and poultry at Bayt Al Ghaf are halal, and no pork, alcohol or gelatine is used anywhere.", key_facts: ["halal"], category: "diet", reasoning: "single-fact", difficulty: "easy", sources: [D("mi_camel_burger"), docPath.diet("halal")], entities: [node.dish(c.itemsById.get("mi_camel_burger")!.slug), node.diet("halal")], priority: "extended" });
  q({ question: "Can I have a glass of wine with dinner, or bring my own?", answer: `No. ${p.houseRules.alcohol}`, key_facts: ["alcohol-free"], category: "policies", reasoning: "negative", difficulty: "easy", sources: ["documents/policies/house-rules.md"], entities: [node.policy("alcohol")], priority: "core" });

  // ------------------------------------------------------------- hours
  for (const d of WEEKDAYS) {
    const h = wk[String(d) as keyof typeof wk]!;
    q({ question: `What time does Bayt Al Ghaf close on ${weekday(d)}?`, answer: `${h.close === "24:00" ? "Midnight (24:00)" : h.close} on ${weekday(d)}. The kitchen takes last orders at ${minus(h.close, s.kitchenLastOrderMinutesBeforeClose)}.`, key_facts: [h.close, minus(h.close, s.kitchenLastOrderMinutesBeforeClose)], category: "hours", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/opening-hours.md", docPath.weekday(d)], entities: [node.weekday(d)], priority: d === 5 || d === 1 ? "core" : "extended" });
    q({ question: `What is the latest table reservation I can make on a ${weekday(d)}?`, answer: `The last reservation on ${weekday(d)} starts at ${minus(h.close, s.reservations.lastSeatingMinutesBeforeClose)} (${s.reservations.lastSeatingMinutesBeforeClose} minutes before closing).`, key_facts: [minus(h.close, s.reservations.lastSeatingMinutesBeforeClose)], category: "reservations", reasoning: "numeric", difficulty: "medium", sources: ["documents/restaurant/opening-hours.md", docPath.weekday(d)], entities: [node.weekday(d)], priority: d === 6 ? "core" : "extended" });
  }
  q({ question: "What time does breakfast finish?", answer: `Breakfast is served ${s.breakfast.start}–${s.breakfast.end} every day (not during Ramadan). The Weekend Fuala Breakfast Spread runs until 12:00 on Saturdays and Sundays.`, key_facts: [s.breakfast.end, "12:00"], category: "hours", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/opening-hours.md"], entities: [node.mealPeriod("breakfast")], priority: "core" });
  q({ question: "Until what time do you deliver?", answer: `Deliveries arrive between ${s.delivery.start} and ${s.delivery.end} every day. Breakfast is not delivered.`, key_facts: [s.delivery.start, s.delivery.end], category: "delivery", reasoning: "single-fact", difficulty: "easy", sources: ["documents/delivery/delivery-overview.md"], entities: [node.orderType("delivery")], priority: "core" });
  for (const iso of ["2027-02-20", "2026-12-02", "2027-03-10", "2026-11-14"]) {
    const h = describeDay(iso, k.rc);
    const dining = h.windows.dining.map((w) => `${w.start}–${w.end}`);
    const orders = h.windows.orders.map((w) => `${w.start}–${w.end}`);
    q({
      question: `What are your opening hours on ${date(iso)}?`,
      answer: `${dining.length ? `Dining room ${list(dining)}` : "Dining room closed"}${orders.join() !== dining.join() ? `; takeaway and delivery orders ${list(orders)}` : ""}. ${h.notes.join(" ")}`.trim(),
      key_facts: [...new Set([...h.windows.dining.flatMap((w) => [w.start, w.end]), ...h.windows.orders.flatMap((w) => [w.start, w.end])])].filter((t) => t !== "00:00"),
      category: "hours",
      reasoning: "temporal",
      difficulty: "hard",
      sources: ["documents/calendar/special-days-overview.md", ...k.rc.specialPeriods.filter((sp) => sp.startDate <= iso && sp.endDate >= iso).map((sp) => docPath.period(sp.slug)), ...(k.rc.closures.some((cl) => cl.date === iso) ? ["documents/calendar/closures.md"] : [])],
      entities: [node.restaurant()],
      priority: "core",
      grounded: false,
      notes: "Hours on a specific date combine the weekly hours with special periods and closures.",
    });
  }
  q({ question: "Can I book a table for dinner at 19:00 on Saturday 14 November 2026?", answer: "No. The dining room is closed to the public from 18:00 on Saturday 14 November 2026 for a private event. Takeaway and delivery continue as normal, and lunch tables before 18:00 are possible.", key_facts: ["18:00", "private event", "Takeaway"], category: "reservations", reasoning: "temporal", difficulty: "hard", sources: ["documents/calendar/closures.md"], entities: [node.closure("cl_private_event_2026_11_14")], priority: "core" });
  q({ question: "What time do you open on the first day of Eid Al Fitr 2027?", answer: "At 14:00. The first day of Eid Al Fitr is provisionally 10 March 2027 (subject to moon sighting); normal hours resume on the following days.", key_facts: ["14:00", "10 March 2027"], category: "calendar", reasoning: "temporal", difficulty: "medium", sources: [docPath.period("eid-al-fitr-2027"), "documents/calendar/closures.md"], entities: [node.period({ slug: "eid-al-fitr-2027" })], priority: "core", grounded: false });

  // ------------------------------------------------------------- location & contact
  const LOC = "documents/restaurant/location-and-address.md";
  const GET = "documents/restaurant/getting-there.md";
  const PARK = "documents/restaurant/parking.md";
  const CON = "documents/restaurant/contact.md";
  const locQs: Q[] = [
    { question: "What is the address of Bayt Al Ghaf?", answer: p.address.formatted, key_facts: ["Unit 14", "Heritage Quarter", "Al Seef Street", "Bur Dubai"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [LOC], entities: [node.restaurant()], priority: "core" },
    { question: "Which entrance should I use?", answer: "Heritage Quarter Gate 3 on Al Seef Street; the takeaway counter and drop-off bay are there too.", key_facts: ["Gate 3"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [LOC], entities: [node.restaurant()], priority: "extended" },
    { question: "What is the nearest metro station?", answer: "Al Fahidi Metro Station on the Green Line, about 750 m away (10 minutes on foot).", key_facts: ["Al Fahidi Metro Station", "Green Line", "10 minutes"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [LOC, GET], entities: [node.landmark("Al Fahidi Metro Station (Green Line)")], priority: "core" },
    { question: "How long does it take to get there from Dubai International Airport?", answer: "About 15–25 minutes by taxi, depending on traffic.", key_facts: ["15–25 minutes"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [GET], entities: [node.transport("taxi")], priority: "core" },
    { question: "What should I tell the taxi driver?", answer: "“Al Seef, Heritage Quarter, Gate 3, near Al Fahidi Historical Neighbourhood”. Ride-hailing drop-off is at the Gate 3 lay-by on Al Seef Street.", key_facts: ["Gate 3", "Al Fahidi Historical Neighbourhood"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [GET], entities: [node.transport("taxi")], priority: "extended" },
    { question: "How do I get there from Deira by abra?", answer: "Take an abra from Deira Old Souq Abra Station to Bur Dubai Abra Station (a few minutes, cash or Nol card), then walk about 12 minutes south-east along the creek promenade.", key_facts: ["Deira Old Souq Abra Station", "Bur Dubai Abra Station", "12 minutes"], category: "location", reasoning: "single-fact", difficulty: "medium", sources: [GET], entities: [node.transport("abra")], priority: "extended" },
    { question: "How far is the Al Fahidi Historical Neighbourhood?", answer: "About 400 m — 5 minutes on foot.", key_facts: ["400 m", "5 minutes"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [LOC], entities: [node.landmark("Al Fahidi Historical Neighbourhood (Al Bastakiya)")], priority: "extended" },
    { question: "Is there valet parking on a Tuesday evening?", answer: "No. Valet parking runs only on Thursdays, Fridays and Saturdays, from 18:00 to midnight (AED 40, paid to the valet operator). On other days use the paid public parking on Al Seef Street or the Al Seef multi-storey car park.", key_facts: ["Thursdays, Fridays and Saturdays", "AED 40"], category: "location", reasoning: "temporal", difficulty: "medium", sources: [PARK, docPath.weekday(2)], entities: [node.facility("valet-parking")], priority: "core" },
    { question: "How much does valet parking cost?", answer: "AED 40, paid to the valet operator at Gate 3 (Thursday to Saturday, 18:00 to midnight).", key_facts: ["AED 40"], category: "location", reasoning: "single-fact", difficulty: "easy", sources: [PARK], entities: [node.facility("valet-parking")], priority: "extended" },
    { question: "Can you reserve a parking space for me?", answer: "No. Bayt Al Ghaf cannot reserve parking. Public parking is first come, first served.", key_facts: ["cannot reserve"], category: "location", reasoning: "negative", difficulty: "easy", sources: [PARK], entities: [node.facility("parking")], priority: "extended" },
    { question: "What is the phone number of the restaurant?", answer: `${p.contact.phone}.`, key_facts: [p.contact.phone], category: "contact", reasoning: "single-fact", difficulty: "easy", sources: [CON], entities: [node.contact("phone")], priority: "core" },
    { question: "Can I call the WhatsApp number?", answer: `No. The WhatsApp number ${p.contact.whatsapp} is for text messages only (no calls) — for order issues, photos of incorrect items and directions. Call ${p.contact.phone} instead.`, key_facts: [p.contact.whatsapp, "no calls"], category: "contact", reasoning: "negative", difficulty: "medium", sources: [CON], entities: [node.contact("whatsapp")], priority: "core" },
    { question: "Which e-mail address should I use for a private event?", answer: `${p.contact.eventsEmail}.`, key_facts: [p.contact.eventsEmail], category: "contact", reasoning: "single-fact", difficulty: "easy", sources: [CON], entities: [node.contact("events-email")], priority: "extended" },
    { question: "Who is the chef at Bayt Al Ghaf?", answer: "Chef Hessa, who grew up in Al Bastakiya a few streets from Dubai Creek.", key_facts: ["Chef Hessa"], category: "about", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/about-bayt-al-ghaf.md"], entities: [node.person("chef-hessa")], priority: "extended" },
    { question: "What does the name Bayt Al Ghaf mean?", answer: "“House of the Ghaf” — the ghaf is the UAE's national tree, a symbol of shade, endurance and hospitality in the desert.", key_facts: ["House of the Ghaf", "national tree"], category: "about", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/about-bayt-al-ghaf.md"], entities: [node.restaurant()], priority: "core" },
    { question: "How many seats does the restaurant have?", answer: `${p.capacity.totalSeats}: ${p.capacity.indoorSeats} indoors, ${p.capacity.terraceSeats} on the terrace and ${p.capacity.majlisSeats} in the two majlis rooms.`, key_facts: [String(p.capacity.totalSeats)], category: "about", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/about-bayt-al-ghaf.md"], entities: [node.restaurant()], priority: "extended" },
    { question: "What is the Wi-Fi network called?", answer: "“BaytAlGhaf-Guest”; the password is printed on the menu.", key_facts: ["BaytAlGhaf-Guest"], category: "facilities", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/facilities.md"], entities: [node.facility("wifi")], priority: "extended" },
    { question: "Is there live music?", answer: "Yes, live oud music on Friday evenings from 20:00 to 22:00.", key_facts: ["oud", "Friday", "20:00", "22:00"], category: "facilities", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/facilities.md"], entities: [node.facility("live-oud-music")], priority: "core" },
    { question: "Is there a prayer room?", answer: "Yes, for men and women, on the first floor of the Heritage Quarter building (shared facility).", key_facts: ["first floor"], category: "facilities", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/facilities.md"], entities: [node.facility("prayer-room")], priority: "extended" },
  ];
  locQs.forEach(q);

  // ------------------------------------------------------------- reservations
  const RES = "documents/reservations/reservations-overview.md";
  const TT = "documents/reservations/table-times.md";
  const r = s.reservations;
  const resQs: Q[] = [
    { question: "What is the largest group I can book a table for?", answer: `${r.maxPartySize} guests. Groups of ${r.autoConfirmMaxPartySize + 1}–${r.maxPartySize} are requests confirmed by phone; larger groups go to the events team (${p.contact.eventsEmail}).`, key_facts: [String(r.maxPartySize), p.contact.eventsEmail], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: [RES], entities: [node.policy("large-groups")], priority: "core" },
    { question: "If I book for 15 people, is the table confirmed straight away?", answer: `No. Groups of ${r.autoConfirmMaxPartySize + 1} to ${r.maxPartySize} are accepted as a request: a table is held and the team calls back to confirm, usually within ${s.bulk.reviewResponseHours} hours. It is not confirmed until then.`, key_facts: [`${r.autoConfirmMaxPartySize + 1} to ${r.maxPartySize}`, `${s.bulk.reviewResponseHours} hours`], category: "reservations", reasoning: "multi-hop", difficulty: "medium", sources: [RES], entities: [node.policy("large-groups")], must_not_say: ["your table is confirmed"], priority: "core" },
    { question: "We are 25 people. Can we book?", answer: `Not as a normal reservation — the maximum is ${r.maxPartySize}. Contact the events team at ${p.contact.eventsEmail} for groups larger than ${r.maxPartySize} or a private booking.`, key_facts: [String(r.maxPartySize), p.contact.eventsEmail], category: "reservations", reasoning: "negative", difficulty: "medium", sources: [RES, "documents/reservations/large-groups-and-events.md"], entities: [node.policy("large-groups")], priority: "core" },
    { question: "How long will we have the table for a party of 4?", answer: `120 minutes (2 hours), plus a ${r.turnoverBufferMinutes}-minute reset before the next booking.`, key_facts: ["120 minutes"], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: [TT], entities: [node.policy("table-duration")], priority: "core" },
    { question: "How long is a table booked for 2 people?", answer: "90 minutes.", key_facts: ["90 minutes"], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: [TT], entities: [node.policy("table-duration")], priority: "extended" },
    { question: "How long is a table for 10 people?", answer: "150 minutes (2.5 hours).", key_facts: ["150 minutes"], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: [TT], entities: [node.policy("table-duration")], priority: "extended" },
    { question: "How far in advance can I book a table?", answer: `Up to ${r.maxAdvanceDays} days ahead, and at least ${r.minNoticeMinutes} minutes before the time.`, key_facts: [`${r.maxAdvanceDays} days`, `${r.minNoticeMinutes} minutes`], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: [RES], entities: [node.restaurant()], priority: "core" },
    { question: "Can I book the majlis for 4 people?", answer: `No. A majlis room needs at least ${r.majlis.minPartySize} guests. A party of 4 can book the main hall, a window table or the terrace (in season).`, key_facts: [String(r.majlis.minPartySize)], category: "reservations", reasoning: "negative", difficulty: "medium", sources: [docPath.seatingArea("majlis")], entities: [node.seatingArea("majlis")], priority: "core" },
    { question: "What is the minimum spend for a majlis booking for 10 people?", answer: `${aed(r.majlis.minimumSpendPerPersonFils)} per person, so ${aed(r.majlis.minimumSpendPerPersonFils * 10)} for 10 guests, settled at the end of the meal.`, key_facts: [aed(r.majlis.minimumSpendPerPersonFils)], category: "reservations", reasoning: "numeric", difficulty: "medium", sources: [docPath.seatingArea("majlis")], entities: [node.seatingArea("majlis")], priority: "core", grounded: true },
    { question: "How much notice do I need to book a majlis room?", answer: `At least ${r.majlis.minNoticeHours} hours. Majlis bookings last ${r.majlis.durationMinutes} minutes.`, key_facts: [`${r.majlis.minNoticeHours} hours`], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: [docPath.seatingArea("majlis")], entities: [node.seatingArea("majlis")], priority: "extended" },
    { question: "Can I sit on the terrace on 10 July 2027?", answer: "No. The creek terrace is seasonal: open from 15 October to 30 April, weather permitting, and closed in summer. Indoor and window tables are available year-round.", key_facts: ["15 October", "30 April"], category: "reservations", reasoning: "temporal", difficulty: "hard", sources: [docPath.seatingArea("terrace")], entities: [node.seatingArea("terrace")], priority: "core" },
    { question: "How late can we arrive before you give our table away?", answer: `${r.lateArrivalGraceMinutes} minutes. After that the table may be released; call if you are running late.`, key_facts: [`${r.lateArrivalGraceMinutes} minutes`], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: ["documents/reservations/changes-cancellations-and-late-arrival.md"], entities: [node.policy("late-arrival")], priority: "core" },
    { question: "Until when can I change my reservation?", answer: `Until ${r.modificationCutoffMinutes / 60} hours before the booking time; after that, call the restaurant.`, key_facts: [`${r.modificationCutoffMinutes / 60} hours`], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: ["documents/reservations/changes-cancellations-and-late-arrival.md"], entities: [node.policy("reservation-changes")], priority: "core" },
    { question: "Is there a fee if I cancel my booking an hour before?", answer: `No fee — cancellation is free at any time before the booking, but cancelling less than ${pf.lateCancellationThresholdMinutes / 60} hours before is recorded as a late cancellation.`, key_facts: ["free", "late cancellation"], category: "reservations", reasoning: "single-fact", difficulty: "medium", sources: ["documents/reservations/changes-cancellations-and-late-arrival.md"], entities: [node.policy("reservation-cancellation")], priority: "core" },
    { question: "How many high chairs can I reserve?", answer: `Up to ${pf.maxHighChairsPerBooking} per booking; the restaurant has ${pf.highChairsTotal} in total.`, key_facts: [String(pf.maxHighChairsPerBooking), String(pf.highChairsTotal)], category: "reservations", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/families-and-children.md"], entities: [node.facility("high-chairs")], priority: "extended", grounded: false },
    { question: "Which tables can't be booked in advance?", answer: `${list(k.rc.tables.filter((t) => !t.onlineBookable).map((t) => t.code))} are kept for walk-in guests.`, key_facts: k.rc.tables.filter((t) => !t.onlineBookable).map((t) => t.code), category: "reservations", reasoning: "aggregation", difficulty: "medium", sources: ["documents/reservations/tables.md"], entities: k.rc.tables.filter((t) => !t.onlineBookable).map((t) => node.table(t.code)), priority: "extended" },
    { question: "Can I book table W3 specifically?", answer: "A specific table number cannot be promised. You can ask for a creek-view window table, and the team books the best-fitting free table in that area.", key_facts: ["cannot be promised"], category: "reservations", reasoning: "negative", difficulty: "medium", sources: [RES], entities: [node.table("W3")], priority: "extended" },
    { question: "Is the majlis suitable for a wheelchair user?", answer: "No — the majlis rooms use floor seating. Majlis Al Sidr can be set with low chairs on request. Wheelchair-accessible tables are in the main hall, at the window and on the terrace (T4 and T6).", key_facts: ["floor seating", "low chairs"], category: "accessibility", reasoning: "multi-hop", difficulty: "medium", sources: ["documents/restaurant/accessibility.md", docPath.seatingArea("majlis")], entities: [node.seatingArea("majlis")], priority: "core" },
    { question: "Do I need to pay a deposit to reserve a table?", answer: "No. No deposit or card guarantee is taken for regular tables. The majlis minimum spend is settled at the end of the meal.", key_facts: ["No deposit"], category: "reservations", reasoning: "negative", difficulty: "easy", sources: [RES], entities: [node.restaurant()], priority: "extended" },
    { question: "Can I bring my own birthday cake?", answer: `Yes, with prior notice. A plating fee of AED ${pf.celebrationCakeFeeAed} applies. Other outside food and drink are not permitted.`, key_facts: [`AED ${pf.celebrationCakeFeeAed}`], category: "policies", reasoning: "single-fact", difficulty: "easy", sources: ["documents/policies/house-rules.md"], entities: [node.policy("outside-food")], priority: "core" },
  ];
  resQs.forEach(q);

  // ------------------------------------------------------------- ordering
  const OO = "documents/ordering/ordering-overview.md";
  const TL = "documents/ordering/timing-and-lead-times.md";
  const o = s.ordering;
  const tawook = F("mi_shish_tawook");
  const orderAt = "13:00";
  const ready = minutesToTime(Math.ceil((timeToMinutes(orderAt) + tawook.leadTimeMinutes) / o.slotMinutes) * o.slotMinutes);
  const lamb = c.itemsById.get("mi_lamb_machboos")!;
  const karak = c.itemsById.get("mi_karak")!;
  const large = lamb.customizations.find((g) => g.id === "portion")!.options.find((x) => x.id === "portion_large")!;
  const ordQs: Q[] = [
    { question: "How far ahead can I schedule a takeaway order?", answer: `Up to ${o.maxAdvanceDays} days ahead, in ${o.slotMinutes}-minute slots.`, key_facts: [`${o.maxAdvanceDays} days`], category: "ordering", reasoning: "single-fact", difficulty: "easy", sources: [OO], entities: [node.orderType("pickup")], priority: "core" },
    { question: "What is the earliest I can collect a pickup order?", answer: `The longest preparation time in the order plus ${o.prepBufferMinutes} minutes, never less than ${o.minLeadMinutes} minutes after ordering, rounded up to the next ${o.slotMinutes}-minute slot.`, key_facts: [`${o.prepBufferMinutes} minutes`, `${o.minLeadMinutes} minutes`], category: "ordering", reasoning: "single-fact", difficulty: "medium", sources: [TL], entities: [node.orderType("pickup")], priority: "core" },
    { question: `If I order Shish Tawook for pickup at ${orderAt}, when is the earliest it can be ready?`, answer: `${ready}. Shish Tawook takes ${tawook.item.prepTimeMinutes} minutes plus ${o.prepBufferMinutes} minutes of packing (${tawook.leadTimeMinutes} minutes), rounded up to the next ${o.slotMinutes}-minute slot.`, key_facts: [ready], category: "ordering", reasoning: "numeric", difficulty: "hard", sources: [D("mi_shish_tawook"), TL], entities: [node.dish(tawook.item.slug)], priority: "core", grounded: false, notes: "Assumes the slot has free kitchen capacity." },
    { question: "How many of one dish can I order in a normal order?", answer: `Up to ${o.maxQuantityPerLine} of one dish (some dishes have a lower limit), and up to ${o.maxPortionsPerOrder} kitchen portions per order; larger orders are catering orders.`, key_facts: [String(o.maxQuantityPerLine), String(o.maxPortionsPerOrder)], category: "ordering", reasoning: "single-fact", difficulty: "medium", sources: [OO], entities: [node.orderType("pickup")], priority: "core", grounded: false },
    { question: "How long will you keep my pickup order if I'm late?", answer: `${o.pickupHoldMinutes} minutes after the pickup time; hot food is kept warm for about ${pf.hotHoldingMinutes} minutes. After that the order is marked not collected and is not kept.`, key_facts: [`${o.pickupHoldMinutes} minutes`, `${pf.hotHoldingMinutes} minutes`], category: "ordering", reasoning: "single-fact", difficulty: "easy", sources: ["documents/ordering/pickup.md"], entities: [node.orderType("pickup")], priority: "core" },
    { question: "Until when can I change my order?", answer: `Until ${o.modificationCutoffMinutes} minutes before the pickup or delivery time, or until the kitchen starts preparing it, whichever is earlier.`, key_facts: [`${o.modificationCutoffMinutes} minutes`], category: "ordering", reasoning: "single-fact", difficulty: "easy", sources: ["documents/ordering/changes-and-cancellations.md"], entities: [node.policy("order-changes")], priority: "core" },
    { question: "Why does my AED 1,800 order say awaiting confirmation?", answer: `Orders above ${aed(o.manualReviewAboveFils)} are received as awaiting confirmation and the team confirms them by phone. The order is not confirmed until then.`, key_facts: [aed(o.manualReviewAboveFils)], category: "ordering", reasoning: "multi-hop", difficulty: "medium", sources: [OO, "documents/ordering/order-statuses.md"], entities: [node.status("order", "pending_confirmation")], must_not_say: ["it is confirmed"], priority: "core" },
    { question: "Can I pay online when I order?", answer: "No. There is no online payment. Pickup orders are paid on collection, deliveries on delivery (cash or card), and dine-in pre-orders at the table.", key_facts: ["Online card payment"], category: "payments", reasoning: "negative", difficulty: "easy", sources: ["documents/restaurant/payments-and-prices.md"], entities: [node.restaurant()], priority: "core" },
    { question: "How much do 2 Lamb Machboos and 2 Karak Chai cost?", answer: `${aed(lamb.priceFils * 2 + karak.priceFils * 2)} (2 × ${aed(lamb.priceFils)} + 2 × ${aed(karak.priceFils)}), VAT included.`, key_facts: [aed(lamb.priceFils * 2 + karak.priceFils * 2)], category: "menu-prices", reasoning: "numeric", difficulty: "medium", sources: [D("mi_lamb_machboos"), D("mi_karak")], entities: [node.dish(lamb.slug), node.dish(karak.slug)], priority: "core", grounded: false },
    { question: "How much is a large Lamb Machboos?", answer: `${aed(lamb.priceFils + large.priceDeltaFils)} (${aed(lamb.priceFils)} plus ${aed(large.priceDeltaFils)} for the large portion).`, key_facts: [aed(lamb.priceFils + large.priceDeltaFils)], category: "menu-prices", reasoning: "numeric", difficulty: "medium", sources: [D("mi_lamb_machboos")], entities: [node.dish(lamb.slug)], priority: "core" },
    { question: "Can someone else collect my order?", answer: "Yes, if their name was given with the order, or if they quote the order number and the phone number used to order.", key_facts: ["order number"], category: "ordering", reasoning: "single-fact", difficulty: "easy", sources: ["documents/ordering/pickup.md"], entities: [node.orderType("pickup")], priority: "extended" },
    { question: "My order is 25 minutes late. Can I cancel without paying?", answer: `Yes. If an order is more than ${pf.lateOrderFreeCancelMinutes} minutes late, it can be cancelled without charge.`, key_facts: [`${pf.lateOrderFreeCancelMinutes} minutes`], category: "policies", reasoning: "numeric", difficulty: "medium", sources: ["documents/policies/complaints-and-refunds.md"], entities: [node.policy("complaints")], priority: "core" },
    { question: "An item was missing from my delivery yesterday. What can I do?", answer: `Report it within ${pf.complaintWindowHours} hours by phone (${p.contact.phone}) or WhatsApp (${p.contact.whatsapp}) with the order number; a photo helps. The item is replaced, refunded or credited.`, key_facts: [`${pf.complaintWindowHours} hours`], category: "policies", reasoning: "single-fact", difficulty: "easy", sources: ["documents/policies/complaints-and-refunds.md"], entities: [node.policy("complaints")], priority: "core" },
    { question: "Can I order the Friday Family Machboos Platter for delivery?", answer: "No. The Friday platter can only be ordered for pickup or as a dine-in pre-order, on Fridays, at least 2 hours in advance.", key_facts: ["pickup", "2 hours"], category: "ordering", reasoning: "multi-hop", difficulty: "medium", sources: [D("mi_friday_platter")], entities: [node.dish(c.itemsById.get("mi_friday_platter")!.slug)], priority: "core" },
    { question: "Can I order the Friday platter on Tuesday if I pay double?", answer: "No. The Friday Family Machboos Platter is cooked only on Fridays and paying more does not change that. It can be pre-ordered now for the coming Friday, or the Majlis Sharing Platter (serves 4) is available on Tuesday.", key_facts: ["Fridays", "paying more does not change that"], category: "availability", reasoning: "negative", difficulty: "hard", sources: [D("mi_friday_platter")], entities: [node.dish(c.itemsById.get("mi_friday_platter")!.slug)], must_not_say: ["yes, for double"], priority: "core" },
  ];
  ordQs.forEach(q);

  // ------------------------------------------------------------- delivery
  const zones = s.delivery.zones;
  for (const z of zones) {
    for (const a of z.areas) {
      q({
        question: `Do you deliver to ${a}, and how much is delivery?`,
        answer: z.regularOrders
          ? `Yes. ${a} is in ${z.name}: delivery fee ${aed(z.feeFils)}, minimum order ${aed(z.minimumOrderFils)}${z.freeDeliveryAboveFils ? `, free delivery from ${aed(z.freeDeliveryAboveFils)}` : ", no free delivery"}, about ${z.driveMinutes} minutes' drive.`
          : `Not for regular orders: ${a} is in ${z.name}, which is catering only. Catering can be delivered there for ${aed(z.feeFils)} with a minimum catering order of ${aed(z.minimumOrderFils)}.`,
        key_facts: [aed(z.feeFils), aed(z.minimumOrderFils)],
        category: "delivery",
        reasoning: "single-fact",
        difficulty: z.regularOrders ? "easy" : "medium",
        sources: ["documents/delivery/delivery-areas-a-to-z.md", docPath.zone(z.id)],
        entities: [node.area(a), node.zone(z.id)],
        priority: ["Al Karama", "Downtown Dubai", "Dubai Marina", "Deira"].includes(a) ? "core" : "extended",
      });
    }
  }
  const zA = zones[0], zB = zones[1], zC = zones[2];
  const delQs: Q[] = [
    { question: "Do you deliver to Sharjah?", answer: "No. Bayt Al Ghaf delivers only within Dubai — not to Abu Dhabi, Sharjah, Ajman or the other emirates. Orders can be collected at Al Seef.", key_facts: ["Sharjah"], category: "delivery", reasoning: "negative", difficulty: "easy", sources: ["documents/delivery/delivery-overview.md"], entities: [node.orderType("delivery")], priority: "core" },
    { question: "Can you deliver to Abu Dhabi in 15 minutes?", answer: "No. Abu Dhabi is outside the delivery area (Dubai only), and no delivery can be faster than the preparation lead time plus the drive time.", key_facts: ["Abu Dhabi", "lead time plus the drive time"], category: "delivery", reasoning: "negative", difficulty: "medium", sources: ["documents/delivery/delivery-overview.md"], entities: [node.orderType("delivery")], priority: "core", grounded: false },
    { question: `I want to order AED ${(zB.minimumOrderFils - 2000) / 100} of food to Al Karama. Can it be delivered?`, answer: `Not yet: Al Karama is in ${zB.name}, where the minimum order is ${aed(zB.minimumOrderFils)}. Add at least ${aed(2000)} more, or collect it.`, key_facts: [aed(zB.minimumOrderFils)], category: "delivery", reasoning: "numeric", difficulty: "medium", sources: [docPath.zone(zB.id)], entities: [node.area("Al Karama"), node.zone(zB.id)], priority: "core", grounded: true },
    { question: `What is the delivery fee for an AED ${(zB.freeDeliveryAboveFils! + 5000) / 100} order to Oud Metha?`, answer: `Free. Oud Metha is in ${zB.name}, where orders of ${aed(zB.freeDeliveryAboveFils!)} or more are delivered free.`, key_facts: [aed(zB.freeDeliveryAboveFils!)], category: "delivery", reasoning: "numeric", difficulty: "medium", sources: [docPath.zone(zB.id)], entities: [node.area("Oud Metha"), node.zone(zB.id)], priority: "extended" },
    { question: "Is delivery to Business Bay free on a big order?", answer: `No. Business Bay is in ${zC.name}, which has no free-delivery threshold; the ${aed(zC.feeFils)} fee always applies (minimum order ${aed(zC.minimumOrderFils)}).`, key_facts: [aed(zC.feeFils)], category: "delivery", reasoning: "multi-hop", difficulty: "medium", sources: [docPath.zone(zC.id)], entities: [node.area("Business Bay"), node.zone(zC.id)], priority: "extended" },
    { question: "Do you deliver breakfast?", answer: "No, breakfast is not delivered. Delivery runs from 12:00 to 22:30.", key_facts: ["12:00", "22:30"], category: "delivery", reasoning: "negative", difficulty: "easy", sources: ["documents/delivery/delivery-overview.md"], entities: [node.mealPeriod("breakfast")], priority: "core" },
    { question: "How much change does the driver carry?", answer: `Up to AED ${pf.driverChangeAed}.`, key_facts: [`AED ${pf.driverChangeAed}`], category: "delivery", reasoning: "single-fact", difficulty: "easy", sources: ["documents/delivery/delivery-overview.md"], entities: [node.orderType("delivery")], priority: "extended" },
    { question: "Are you on Talabat or Deliveroo?", answer: "No. Bayt Al Ghaf delivers with its own drivers and is not on third-party delivery apps.", key_facts: ["own drivers"], category: "delivery", reasoning: "negative", difficulty: "easy", sources: ["documents/delivery/delivery-overview.md"], entities: [node.orderType("delivery")], priority: "extended" },
    { question: "Which dishes can't be delivered?", answer: `${list(names(facts.filter((f) => !f.item.fulfilment.delivery && !f.item.bulk.bulkOnly)))}.`, key_facts: names(facts.filter((f) => !f.item.fulfilment.delivery && !f.item.bulk.bulkOnly)), category: "delivery", reasoning: "aggregation", difficulty: "hard", sources: ["documents/delivery/delivery-overview.md"], entities: facts.filter((f) => !f.item.fulfilment.delivery).map((f) => node.dish(f.item.slug)), priority: "core" },
    { question: `What is the earliest a delivery of Lamb Machboos can reach Al Seef if I order now?`, answer: `About ${F("mi_lamb_machboos").leadTimeMinutes + zA.driveMinutes} minutes: ${F("mi_lamb_machboos").leadTimeMinutes} minutes of lead time plus about ${zA.driveMinutes} minutes' drive in ${zA.name}, rounded to the next 15-minute slot and subject to capacity.`, key_facts: [`${zA.driveMinutes} minutes`], category: "delivery", reasoning: "numeric", difficulty: "hard", sources: [D("mi_lamb_machboos"), docPath.zone(zA.id)], entities: [node.dish(lamb.slug), node.zone(zA.id)], priority: "extended", grounded: false },
  ];
  delQs.forEach(q);
  if (findDeliveryZone("Jebel Ali", s) === null) {
    q({ question: "Do you deliver to Jebel Ali?", answer: "No. Jebel Ali is not in any Bayt Al Ghaf delivery zone; only the listed areas are served. Orders can be collected at Al Seef.", key_facts: ["only to the areas listed"], category: "delivery", reasoning: "negative", difficulty: "medium", sources: ["documents/delivery/delivery-overview.md"], entities: [node.orderType("delivery")], priority: "extended" });
  }

  // ------------------------------------------------------------- catering
  const b = s.bulk;
  const CAT = "documents/catering/catering-overview.md";
  const box = c.itemsById.get("mi_office_lunch_box")!;
  const ouzi = c.itemsById.get("mi_whole_lamb_ouzi")!;
  const notice = (n: number) => [...b.noticeTiers].sort((x, y) => x.maxPortions - y.maxPortions).find((t) => n <= t.maxPortions)?.hours;
  const total3000 = 300000;
  const catQs: Q[] = [
    { question: "When does an order count as catering?", answer: `When it has more than ${o.maxPortionsPerOrder} kitchen portions, or includes a catering-only dish such as the Whole Lamb Ouzi or the Office Machboos Lunch Box.`, key_facts: [String(o.maxPortionsPerOrder)], category: "catering", reasoning: "single-fact", difficulty: "easy", sources: [CAT], entities: [node.policy("catering")], priority: "core" },
    ...[40, 100, 200].map<Q>((n) => ({ question: `How much notice do you need for ${n} portions?`, answer: `At least ${notice(n)} hours (some dishes need more).`, key_facts: [`${notice(n)} hours`], category: "catering", reasoning: "numeric", difficulty: "medium", sources: [CAT], entities: [node.policy("catering")], priority: "core" })),
    ...[45, 80, 120].map<Q>((n) => ({ question: `What discount do I get for ${n} portions?`, answer: bulkDiscountPercent(n, s) ? `${bulkDiscountPercent(n, s)}% off the food.` : "No discount — volume discounts start at 51 portions.", key_facts: [bulkDiscountPercent(n, s) ? `${bulkDiscountPercent(n, s)}%` : "no discount"], category: "catering", reasoning: "numeric", difficulty: "medium", sources: [CAT], entities: [node.policy("catering")], priority: n === 120 ? "core" : "extended", grounded: bulkDiscountPercent(n, s) > 0 })),
    { question: "Do I need to pay a deposit for a catering order of AED 3,000?", answer: `Yes. Catering orders of ${aed(b.depositThresholdFils)} or more need a ${b.depositPercent}% deposit: ${aed(depositFor(total3000, s))} for AED 3,000, arranged by bank transfer after the team confirms.`, key_facts: [`${b.depositPercent}%`, aed(b.depositThresholdFils)], category: "catering", reasoning: "numeric", difficulty: "medium", sources: [CAT], entities: [node.policy("catering")], priority: "core" },
    { question: "How much are 40 office lunch boxes?", answer: `${aed(box.priceFils * 40)} (40 × ${aed(box.priceFils)}), with no volume discount below 51 portions. At least 24 hours' notice; no deposit (below ${aed(b.depositThresholdFils)}).`, key_facts: [aed(box.priceFils * 40), "24 hours"], category: "catering", reasoning: "numeric", difficulty: "medium", sources: [CAT, D("mi_office_lunch_box")], entities: [node.dish(box.slug)], priority: "core" },
    { question: "Can you make 200 machboos for me in 20 minutes?", answer: "No. 200 portions need at least 72 hours' notice, and machboos is also limited per day; no kitchen can produce that in 20 minutes. The earliest feasible date can be offered, or a split across dishes.", key_facts: ["72 hours"], category: "catering", reasoning: "negative", difficulty: "hard", sources: [CAT], entities: [node.policy("catering")], must_not_say: ["yes, we can", "we can try"], priority: "core" },
    { question: "What is the maximum catering order?", answer: `${b.maxPortionsPerOrder} portions per order, and ${b.dailyCapacityPortions} portions per day across all catering orders. Above that, contact the events team.`, key_facts: [String(b.maxPortionsPerOrder), String(b.dailyCapacityPortions)], category: "catering", reasoning: "single-fact", difficulty: "easy", sources: [CAT], entities: [node.policy("catering")], priority: "core" },
    { question: "How long is a catering quote valid?", answer: `${b.quoteValidityHours} hours; it locks the price.`, key_facts: [`${b.quoteValidityHours} hours`], category: "catering", reasoning: "single-fact", difficulty: "easy", sources: [CAT], entities: [node.policy("catering")], priority: "extended" },
    { question: "Is my catering order confirmed once I place it?", answer: `No. Catering orders are received as awaiting confirmation; the catering team calls within ${b.reviewResponseHours} hours to confirm and arrange any deposit.`, key_facts: [`${b.reviewResponseHours} hours`], category: "catering", reasoning: "single-fact", difficulty: "medium", sources: [CAT], entities: [node.status("order", "pending_confirmation")], must_not_say: ["your catering order is confirmed"], priority: "core" },
    { question: "How many people does a Whole Lamb Ouzi feed and how much notice is needed?", answer: `${ouzi.name} costs ${aed(ouzi.priceFils)} and serves ${ouzi.portion.servesPeople} (${ouzi.portion.description}). It is catering-only, needs at least ${ouzi.bulk.minNoticeHours} hours' notice and is limited to ${ouzi.bulk.maxQuantityPerDay} per day.`, key_facts: [aed(ouzi.priceFils), `${ouzi.bulk.minNoticeHours} hours`], category: "catering", reasoning: "single-fact", difficulty: "medium", sources: [D("mi_whole_lamb_ouzi"), "documents/catering/catering-menu.md"], entities: [node.dish(ouzi.slug)], priority: "core" },
    { question: "Until when can I cancel a catering order for free?", answer: `Until ${b.freeCancellationHours} hours before collection or delivery.`, key_facts: [`${b.freeCancellationHours} hours`], category: "catering", reasoning: "single-fact", difficulty: "easy", sources: [CAT], entities: [node.policy("catering")], priority: "extended" },
    { question: "Can I get catering delivered to Dubai Marina, and what does it cost?", answer: `Yes, catering only: Dubai Marina is in ${zones[3].name}, delivery fee ${aed(zones[3].feeFils)}, minimum catering order ${aed(zones[3].minimumOrderFils)}.`, key_facts: [aed(zones[3].feeFils), aed(zones[3].minimumOrderFils)], category: "catering", reasoning: "multi-hop", difficulty: "medium", sources: [docPath.zone(zones[3].id)], entities: [node.area("Dubai Marina"), node.zone(zones[3].id)], priority: "core" },
    { question: `What would 120 Chicken Machboos delivered to Dubai Marina cost in total?`, answer: (() => { const it = c.itemsById.get("mi_chicken_machboos")!; const sub = it.priceFils * 120; const pct = bulkDiscountPercent(120, s); const disc = percentOf(sub, pct); const tot = sub - disc + zones[3].feeFils; return `${aed(tot)}: 120 × ${aed(it.priceFils)} = ${aed(sub)}, minus ${pct}% (${aed(disc)}), plus ${aed(zones[3].feeFils)} delivery. A ${b.depositPercent}% deposit of ${aed(depositFor(tot, s))} applies, and at least ${notice(120)} hours' notice.`; })(), key_facts: [(() => { const it = c.itemsById.get("mi_chicken_machboos")!; const sub = it.priceFils * 120; return aed(sub - percentOf(sub, bulkDiscountPercent(120, s)) + zones[3].feeFils); })()], category: "catering", reasoning: "numeric", difficulty: "hard", sources: [CAT], entities: [node.dish(c.itemsById.get("mi_chicken_machboos")!.slug), node.zone(zones[3].id)], priority: "core" },
  ];
  catQs.forEach(q);

  // ------------------------------------------------------------- calendar
  const ram = k.rc.specialPeriods.find((x) => x.type === "ramadan")!;
  const nd = k.rc.specialPeriods.find((x) => x.type === "national_day")!;
  const iftar = F("mi_iftar_set");
  const feast = F("mi_etihad_feast");
  const bobar = F("mi_aseedat_bobar");
  const calQs: Q[] = [
    { question: "When is Ramadan 2027 at Bayt Al Ghaf and what are the hours?", answer: `Provisionally ${date(ram.startDate)} to ${date(ram.endDate)} (subject to moon sighting). Open ${ram.hoursOverride!.open}–${ram.hoursOverride!.close} every day; breakfast is not served.`, key_facts: [dateShort2(ram.startDate), ram.hoursOverride!.open], category: "calendar", reasoning: "single-fact", difficulty: "medium", sources: [docPath.period(ram.slug)], entities: [node.period(ram)], priority: "core", grounded: false },
    { question: "Can I have breakfast at Bayt Al Ghaf during Ramadan?", answer: "No. Breakfast is not served during Ramadan; the restaurant opens at 12:00.", key_facts: ["12:00"], category: "calendar", reasoning: "negative", difficulty: "medium", sources: [docPath.period(ram.slug)], entities: [node.period(ram), node.mealPeriod("breakfast")], priority: "core" },
    { question: "How much is the Ramadan Iftar Set Menu and can I order just one?", answer: `${aed(iftar.item.priceFils)} per person, with a minimum of ${iftar.minQuantity} — so at least ${aed(iftar.item.priceFils * (iftar.minQuantity ?? 1))}. Served ${iftar.timeWindow!.start}–${iftar.timeWindow!.end}; same-day orders by ${iftar.sameDayCutoff}; pickup or dine-in pre-order, not delivered.`, key_facts: [aed(iftar.item.priceFils), String(iftar.minQuantity)], category: "calendar", reasoning: "numeric", difficulty: "medium", sources: [D("mi_iftar_set"), docPath.period(ram.slug)], entities: [node.dish(iftar.item.slug)], priority: "core", grounded: false },
    { question: "Can I order the Iftar Set Menu in April 2027?", answer: "No. The Iftar Set Menu is available only during Ramadan (provisionally 8 February to 9 March 2027). Its dishes — lentil shorba, sambousa, machboos, harees and luqaimat — are on the regular menu all year.", key_facts: ["only during Ramadan"], category: "calendar", reasoning: "temporal", difficulty: "hard", sources: [D("mi_iftar_set")], entities: [node.dish(iftar.item.slug), node.period(ram)], priority: "core" },
    { question: "What is the same-day ordering cut-off for the Iftar set?", answer: `${iftar.sameDayCutoff}.`, key_facts: [iftar.sameDayCutoff!], category: "calendar", reasoning: "single-fact", difficulty: "easy", sources: [D("mi_iftar_set")], entities: [node.dish(iftar.item.slug)], priority: "extended" },
    { question: "When can I order the Eid Al Etihad Feast?", answer: `It is served ${dateShort2(nd.startDate)} to ${dateShort2(nd.endDate)} only. Pre-orders open on ${dateShort2(feast.ordersOpenFrom!)} and need at least ${feast.minNoticeHours} hours' notice. ${aed(feast.item.priceFils)}, serves ${feast.item.portion.servesPeople}, limited to ${feast.item.dailyLimit} per day.`, key_facts: [dateShort2(feast.ordersOpenFrom!), `${feast.minNoticeHours} hours`, aed(feast.item.priceFils)], category: "calendar", reasoning: "temporal", difficulty: "hard", sources: [D("mi_etihad_feast"), docPath.period(nd.slug)], entities: [node.dish(feast.item.slug), node.period(nd)], priority: "core", grounded: false },
    { question: "Can I pre-order the National Day feast on 10 November 2026?", answer: `No. Pre-orders for the Eid Al Etihad Feast open on ${dateShort2(feast.ordersOpenFrom!)}.`, key_facts: [dateShort2(feast.ordersOpenFrom!)], category: "calendar", reasoning: "temporal", difficulty: "hard", sources: [D("mi_etihad_feast")], entities: [node.dish(feast.item.slug)], priority: "core" },
    { question: "Is Aseedat Bobar available on 15 March 2027?", answer: `No. Aseedat Bobar is a winter dish served only from ${dateShort2(bobar.dateRange!.start)} to ${dateShort2(bobar.dateRange!.end)}.`, key_facts: [dateShort2(bobar.dateRange!.end)], category: "calendar", reasoning: "temporal", difficulty: "hard", sources: [D("mi_aseedat_bobar")], entities: [node.dish(bobar.item.slug)], priority: "core" },
    ...WEEKDAYS.map<Q>((d) => {
      const sp = facts.filter((f) => f.weekdays.length < 7 && f.weekdays.includes(d as IsoWeekday));
      return { question: `What is the special on ${weekday(d)}?`, answer: sp.length ? `${list(sp.map((f) => `${f.item.name} (${aed(f.item.priceFils)})`))}.` : `There is no weekly special on ${weekday(d)}; the full permanent menu is available.`, key_facts: sp.length ? names(sp) : ["no weekly special"], category: "calendar", reasoning: "temporal", difficulty: "easy", sources: [docPath.weekday(d), "documents/calendar/weekly-specials.md"], entities: [node.weekday(d), ...sp.map((f) => node.dish(f.item.slug))], priority: "core" };
    }),
    { question: "Can I get Camel Machboos on a Monday?", answer: "No. Camel Machboos is only cooked on Thursdays.", key_facts: ["Thursday"], category: "availability", reasoning: "temporal", difficulty: "medium", sources: [D("mi_camel_machboos")], entities: [node.dish(c.itemsById.get("mi_camel_machboos")!.slug)], priority: "core" },
  ];
  calQs.forEach(q);

  // ------------------------------------------------------------- policies
  const HR = "documents/policies/house-rules.md";
  const polQs: Q[] = [
    { question: "Can I smoke shisha on the terrace?", answer: "No. No smoking, vaping or shisha anywhere in the restaurant or on the terrace.", key_facts: ["shisha"], category: "policies", reasoning: "negative", difficulty: "easy", sources: [HR], entities: [node.policy("smoking")], priority: "core" },
    { question: "Can I bring my dog?", answer: "Pets are not permitted inside or on the terrace. Assistance dogs are welcome.", key_facts: ["Assistance dogs"], category: "policies", reasoning: "negative", difficulty: "easy", sources: [HR], entities: [node.policy("pets")], priority: "core" },
    { question: "Is there a dress code?", answer: "Smart casual. Modest dress is appreciated, in keeping with the heritage quarter.", key_facts: ["Smart casual"], category: "policies", reasoning: "single-fact", difficulty: "easy", sources: [HR], entities: [node.policy("dress-code")], priority: "extended" },
    { question: "Is there a children's menu?", answer: "There is no separate children's menu; half-portion requests for selected rice dishes are handled by the team on the day. Children are very welcome and high chairs are available.", key_facts: ["no separate children's menu"], category: "policies", reasoning: "negative", difficulty: "medium", sources: ["documents/restaurant/families-and-children.md"], entities: [node.policy("children")], priority: "core", grounded: false },
    { question: "How are refunds made for card payments?", answer: pf.refundMethod, key_facts: ["original card"], category: "policies", reasoning: "single-fact", difficulty: "easy", sources: ["documents/policies/complaints-and-refunds.md"], entities: [node.policy("refunds")], priority: "extended" },
    { question: "Can professional photographers shoot in the restaurant?", answer: "Only with written permission from the management. Personal photography is welcome.", key_facts: ["written permission"], category: "policies", reasoning: "single-fact", difficulty: "easy", sources: [HR], entities: [node.policy("photography")], priority: "extended" },
    { question: "Do your prices include VAT?", answer: `Yes, all menu prices include ${s.vatRatePercent}% VAT. Delivery fees are shown separately.`, key_facts: [`${s.vatRatePercent}% VAT`], category: "payments", reasoning: "single-fact", difficulty: "easy", sources: ["documents/restaurant/payments-and-prices.md"], entities: [node.restaurant()], priority: "core" },
    { question: "Do you accept US dollars?", answer: "No. Cash is accepted in AED only; foreign currency, cheques and cryptocurrency are not accepted. Cards, Apple Pay and Google Pay are accepted in person.", key_facts: ["AED only"], category: "payments", reasoning: "negative", difficulty: "easy", sources: ["documents/restaurant/payments-and-prices.md"], entities: [node.restaurant()], priority: "extended" },
  ];
  polQs.forEach(q);

  // ------------------------------------------------------------- unanswerable & live
  const none: Q[] = [
    { question: "What is Chef Hessa's surname?", answer: "This is not in the Bayt Al Ghaf knowledge base. The assistant should say it does not know rather than invent a name.", key_facts: [], category: "out-of-scope", reasoning: "unanswerable", difficulty: "medium", sources: [], entities: [node.person("chef-hessa")], must_not_say: [], priority: "core", grounded: false },
    { question: "How many calories are in the Lamb Machboos?", answer: "Calorie and nutrition information is not in the knowledge base. The assistant should not estimate it; it can share the ingredients and portion size instead.", key_facts: [], category: "out-of-scope", reasoning: "unanswerable", difficulty: "medium", sources: [D("mi_lamb_machboos")], entities: [node.dish(lamb.slug)], priority: "core", grounded: false },
    { question: "How much does public parking cost per hour?", answer: "The knowledge base says standard Dubai public-parking tariffs apply (paid through the parking app, SMS or machines) but gives no hourly rate. The assistant should not quote a number.", key_facts: ["standard Dubai public-parking tariffs"], category: "out-of-scope", reasoning: "unanswerable", difficulty: "hard", sources: [PARK], entities: [node.facility("parking")], priority: "core" },
    { question: "Do you have a branch in Abu Dhabi?", answer: "The knowledge base describes only the Al Seef restaurant in Bur Dubai, Dubai. The assistant should not claim other branches exist.", key_facts: ["Al Seef"], category: "out-of-scope", reasoning: "unanswerable", difficulty: "medium", sources: [LOC], entities: [node.restaurant()], priority: "extended", grounded: false },
    { question: "Can you recommend a good hotel nearby?", answer: "Hotel recommendations are not in the knowledge base; the assistant can give the restaurant's location and nearby landmarks instead.", key_facts: [], category: "out-of-scope", reasoning: "unanswerable", difficulty: "easy", sources: [], entities: [], priority: "extended", grounded: false },
    { question: "Is there a table for 4 tonight at 8 pm?", answer: "This needs a live availability check for tonight. From the knowledge base: a table for 4 is booked for 120 minutes, and the last reservation is 90 minutes before closing; the booking needs a name and phone number.", key_facts: ["120 minutes"], category: "live-data", reasoning: "live-check", difficulty: "medium", sources: [TT, RES], entities: [node.policy("table-duration")], must_not_say: ["yes, you're booked"], priority: "core", grounded: false, notes: "A correct assistant checks availability before promising, and only confirms once the booking is accepted." },
    { question: "Is the harees sold out today?", answer: `This needs a live check. Harees is made in one overnight batch of ${F("mi_harees").item.dailyLimit} portions a day and served from 12:00 until sold out.`, key_facts: [String(F("mi_harees").item.dailyLimit)], category: "live-data", reasoning: "live-check", difficulty: "medium", sources: [D("mi_harees")], entities: [node.dish(c.itemsById.get("mi_harees")!.slug)], priority: "core", grounded: false },
    { question: "Where is my order ORD-604215?", answer: "This needs a live order look-up with the order number and the phone number used to order. The knowledge base explains what each status means.", key_facts: ["phone number"], category: "live-data", reasoning: "live-check", difficulty: "medium", sources: ["documents/ordering/order-statuses.md", "documents/policies/privacy-and-verification.md"], entities: [node.policy("privacy")], must_not_say: ["your order is on its way"], priority: "core", grounded: false },
  ];
  none.forEach(q);

  return out.map((x, n) => ({
    ...x,
    id: `Q${String(n + 1).padStart(4, "0")}`,
    grounded: x.grounded ?? true,
    priority: x.priority ?? "extended",
  }));
}

function containsPrep(k: KnowledgeContext, sauceId: string, target: string, seen = new Set<string>()): boolean {
  if (seen.has(sauceId)) return false;
  seen.add(sauceId);
  const s = k.catalog.saucesById.get(sauceId);
  return !!s && (s.includesSauces ?? []).some((n) => n.sauceId === target || containsPrep(k, n.sauceId, target, seen));
}

function dateShort2(iso: string): string {
  return date(iso).replace(/^\w+ /, "");
}

export type { Allergen, CatalogItem };
export { composeItem, sauceIngredientIds, categoryOf };
