/**
 * One document per allergen (14) and per dietary need, plus the allergen policy and
 * the allergen matrix. Lists are derived from the recipes, never typed by hand.
 */
import { composeSauce } from "@/domain/catalog";
import { allergensHandledInKitchen, kitchenAllergenStatement } from "@/domain/policies";
import { ALLERGENS, type Allergen, type DietaryTag } from "@/domain/types";
import type { KnowledgeContext } from "../context";
import { dishFacts, sauceFacts, visibleItems, type DishFacts } from "./facts";
import { docPath, node } from "./ids";
import type { RagDocument } from "./model";
import { aed, ALLERGEN_NAMES, ALLERGEN_TITLES, allergens, be, bullets, cap, list, paragraphs, plural } from "./text";

const R = "Bayt Al Ghaf";

/** Caveats guests often ask about, per allergen (kitchen facts, not marketing). */
const CAVEATS: Partial<Record<Allergen, string[]>> = {
  gluten: [
    "Regag, chebab, sambousa pastry, harees wheat, vermicelli (balaleet), margooga dough, croutons, breadcrumbs and the brioche bun all contain wheat.",
    "Sauce No. 7 contains soy sauce, which is brewed with wheat, so dishes glazed with Sauce No. 7 contain gluten.",
    "No dish is certified gluten-free. Wheat flour is handled throughout the kitchen and the general fryer is shared.",
  ],
  milk: [
    "Ghee (clarified butter) is a dairy product. It is used in machboos, harees, balaleet, the hashu topping and many sweets.",
    "Camel milk (in the camel milk ice cream and as an option in karak and the date shake) is still milk and contains lactose.",
    "Laban and the saffron yoghurt sauce are dairy.",
  ],
  tree_nuts: [
    "Al Ghaf House Red contains walnuts. Al Ghaf House Green has no nut ingredients but is made on the same blender as House Red, so it may contain traces of tree nuts.",
    "The hummus is topped with pine nuts, which are counted as tree nuts. The pistachio crumb contains pistachios.",
    "Nutmeg is a seed spice, not a tree nut. Bayt Al Ghaf does not use coconut or peanuts in any recipe.",
    "The kitchen is not nut-free.",
  ],
  sesame: [
    "Tahini (in hummus and the tahini-lemon sauce) is ground sesame. Sauce No. 7 contains sesame oil. Luqaimat are topped with sesame seeds unless ordered without. The brioche bun is topped with sesame seeds.",
    "Sesame is fried in the general fryer (luqaimat), so fried dishes may carry traces of sesame.",
  ],
  fish: [
    "Mehyawa is a fermented fish sauce. The Mehyawa Regag contains fish even though it is a bread dish.",
    "Hammour and safi (rabbitfish) are fish. Safi is fried in a separate seafood fryer.",
    "Fish is cooked on the shared charcoal grill, so grilled meat dishes may carry traces of fish.",
  ],
  crustaceans: ["Prawns (in Rubyan Mashwi) are cooked on the shared charcoal grill, so other grilled dishes may carry traces of crustaceans."],
  molluscs: ["Bayt Al Ghaf does not use molluscs (such as squid, mussels or oysters) in any recipe."],
  peanuts: ["Bayt Al Ghaf does not use peanuts in any recipe, but supplier products may carry traces."],
  lupin: ["Bayt Al Ghaf does not use lupin in any recipe, but supplier products may carry traces."],
  celery: [
    "The house vegetable stock contains celery; the dishes made with it are listed above.",
    "Bezar spice blend may contain traces of celery and mustard from the spice supplier, so most dishes seasoned with bezar carry a celery trace warning.",
  ],
  mustard: ["Mehyawa contains mustard seed. The loomi aioli contains mustard.", "Bezar may contain traces of mustard from the spice supplier."],
  sulphites: ["Golden raisins contain sulphites. They are in the hashu topping on machboos, which can be ordered without raisins."],
  eggs: ["The loomi aioli contains egg. Toum (garlic sauce) is egg-free.", "Most Emirati breakfast dishes contain egg; the exact dishes are listed above."],
  soy: ["Sauce No. 7 contains soy sauce. The brioche bun supplier states the bun may contain soy."],
};

function dishLine(f: DishFacts, a: Allergen): string {
  const src = f.allergenSources.find((s) => s.allergen === a)!;
  const from = [...src.ingredients.map((x) => x.toLowerCase()), ...src.preparations.map((p) => `the ${p.name}`)];
  return `${f.item.name} (${aed(f.item.priceFils)}): contains ${ALLERGEN_NAMES[a]} from ${list(from)}`;
}

export function allergenDocuments(k: KnowledgeContext): RagDocument[] {
  const c = k.catalog;
  const facts = visibleItems(k).map((i) => dishFacts(k, i));
  const handled = allergensHandledInKitchen(c);
  const sauces = [...c.saucesById.values()];
  const docs: RagDocument[] = ALLERGENS.map((a) => {
    const name = ALLERGEN_NAMES[a];
    const title = ALLERGEN_TITLES[a];
    const ingr = [...c.ingredientsById.values()].filter((i) => i.allergens.includes(a));
    const preps = sauces.filter((s) => composeSauce(c, s.id).allergens.includes(a));
    const containing = facts.filter((f) => f.comp.allergens.includes(a));
    const traces = facts.filter((f) => f.comp.mayContain.includes(a));
    const without = facts.filter((f) => !f.comp.allergens.includes(a));
    const removable = facts.filter((f) => f.avoidance.some((x) => x.allergen === a && x.avoidableWith));
    const used = handled.includes(a);
    return {
      id: `allergen-${a.replace("_", "-")}`,
      path: docPath.allergen(a),
      title: `${title} at ${R}`,
      docType: "allergen",
      summary: `Which ${R} dishes, sauces and ingredients contain ${name}, which may contain traces, which can be made without it, and advice for guests avoiding ${name}.`,
      entities: [node.allergen(a), ...ingr.map((i) => node.ingredient(i.id)), ...containing.map((f) => node.dish(f.item.slug))],
      tags: ["allergens", a],
      sections: [
        {
          heading: `${title} at ${R}: summary`,
          body: paragraphs(
            used
              ? `${cap(name)} ${be(name)} used as an ingredient in the ${R} kitchen. ${plural(containing.length, "dish", "dishes")} ${containing.length === 1 ? "contains" : "contain"} ${name} in the standard recipe, ${plural(traces.length, "dish", "dishes")} may contain traces, and ${plural(without.length, "dish", "dishes")} ${without.length === 1 ? "has" : "have"} no ${name} in ${without.length === 1 ? "its" : "their"} ingredients.`
              : `${cap(name)} ${be(name)} not used as an ingredient anywhere in the ${R} kitchen. No dish contains ${name} as an ingredient, but supplier products may carry traces.`,
            kitchenAllergenStatement(c),
          ),
        },
        { heading: `Ingredients at ${R} that contain ${name}`, body: ingr.length ? bullets(ingr.map((i) => `${i.name} contains ${name}. ${i.description}`)) : `No ${R} ingredient contains ${name}.` },
        {
          heading: `${R} sauces and preparations that contain ${name}`,
          body: preps.length ? bullets(preps.map((s) => `${s.name} (${s.kind.replace("_", " ")}) contains ${name} from ${list(sauceFacts(k, s).allergenSources.find((x) => x.allergen === a)!.ingredients.map((x) => x.toLowerCase()))}.`)) : `No ${R} sauce, marinade or spice blend contains ${name}.`,
        },
        { heading: `${R} dishes that contain ${name}`, body: containing.length ? bullets(containing.map((f) => dishLine(f, a))) : `No ${R} dish contains ${name} as an ingredient.` },
        {
          heading: `${R} dishes that may contain traces of ${name}`,
          body: traces.length
            ? bullets(traces.map((f) => `${f.item.name}: ${f.traceSources.find((t) => t.allergen === a)!.reasons.join(" ")}`))
            : `No ${R} dish carries a specific trace warning for ${name}, although the general kitchen statement still applies.`,
        },
        {
          heading: `${R} dishes that can be made without ${name}`,
          body: removable.length
            ? bullets(removable.map((f) => `${f.item.name}: choose ${list(f.avoidance.find((x) => x.allergen === a)!.avoidableWith!.map((o) => `“${o}”`))}`))
            : `None of the ${R} dishes that contain ${name} can be made without it through a menu option.`,
        },
        {
          heading: `${R} dishes with no ${name} in the recipe`,
          body: `${list(without.map((f) => f.item.name))}. These dishes have no ${name} in their recipe; traces from the shared kitchen are still possible.`,
        },
        {
          heading: `Advice for guests avoiding ${name} at ${R}`,
          body: paragraphs(
            CAVEATS[a]?.length ? bullets(CAVEATS[a]!) : "",
            `${R} never describes a dish as completely free from ${name} or any other allergen, because all food is prepared in one shared kitchen. Guests with a severe ${name} allergy should speak to the duty manager before ordering, and mention the allergy in the order notes so the team can call back.`,
          ),
        },
      ],
      related: [
        ...containing.map((f) => ({ path: docPath.dish(f.item.slug), title: f.item.name })),
        ...preps.map((s) => ({ path: docPath.preparation(s.slug), title: s.name })),
        { path: "documents/allergens-and-diets/allergen-policy.md", title: "Allergen policy" },
      ],
    };
  });

  const DIETS: { slug: string; tag: DietaryTag; title: string; meaning: string; caveat: string }[] = [
    { slug: "vegan", tag: "vegan", title: "Vegan dishes", meaning: "contain no meat, fish, seafood, dairy, eggs or honey", caveat: "Vegan dishes are cooked in the same kitchen as meat, fish and dairy." },
    { slug: "vegetarian", tag: "vegetarian", title: "Vegetarian dishes", meaning: "contain no meat, poultry, fish or seafood (they may contain dairy, eggs or honey)", caveat: "Vegetarian dishes share the kitchen with meat and fish. Fried vegetarian dishes share the general fryer with the sambousa, which includes a lamb filling." },
    { slug: "pescatarian", tag: "pescatarian", title: "Pescatarian dishes", meaning: "contain fish or seafood but no meat or poultry", caveat: "Fish and prawns are grilled on the shared charcoal grill." },
    { slug: "gluten-free-ingredients", tag: "gluten_free_ingredients", title: "Dishes with no gluten ingredients", meaning: "have no wheat or other gluten-containing ingredients in their recipe", caveat: "Bayt Al Ghaf is not a certified gluten-free kitchen. Wheat is used throughout the kitchen and the fryer is shared, so these dishes are not suitable for guests who need certified gluten-free food." },
    { slug: "dairy-free", tag: "dairy_free", title: "Dairy-free dishes", meaning: "have no milk, butter, ghee, cheese, yoghurt or cream in their recipe", caveat: "Ghee is used in many Emirati dishes; ask about traces if the allergy is severe." },
    { slug: "egg-free", tag: "egg_free", title: "Egg-free dishes", meaning: "have no egg in their recipe", caveat: "Eggs are cooked on the breakfast plancha, and khanfaroosh (which contains egg) is fried in the general fryer." },
    { slug: "nut-free-ingredients", tag: "nut_free_ingredients", title: "Dishes with no nut ingredients", meaning: "have no tree nuts or peanuts in their recipe", caveat: "Bayt Al Ghaf is not a nut-free kitchen: walnuts, pine nuts, pistachios and almonds are used." },
    { slug: "sesame-free-ingredients", tag: "sesame_free_ingredients", title: "Dishes with no sesame ingredients", meaning: "have no sesame seeds, tahini or sesame oil in their recipe", caveat: "Sesame is used in the kitchen and in the general fryer." },
    { slug: "shellfish-free", tag: "shellfish_free", title: "Dishes with no shellfish", meaning: "have no crustaceans or molluscs in their recipe", caveat: "Prawns are cooked on the shared charcoal grill." },
    { slug: "halal", tag: "halal", title: "Halal food", meaning: "are halal: all meat and poultry come from halal-certified suppliers, and no pork, alcohol or gelatine is used anywhere", caveat: "Every dish at Bayt Al Ghaf is halal." },
  ];
  for (const d of DIETS) {
    const yes = facts.filter((f) => f.comp.dietaryTags.includes(d.tag));
    const withOption = facts
      .filter((f) => !f.comp.dietaryTags.includes(d.tag))
      .flatMap((f) => f.optionEffects.filter((e) => e.composition.dietaryTags.includes(d.tag)).map((e) => `${f.item.name} with “${e.option.name}”`));
    docs.push({
      id: `diet-${d.slug}`,
      path: docPath.diet(d.slug),
      title: `${d.title} at ${R}`,
      docType: "diet",
      summary: `${d.title} on the ${R} menu: which dishes qualify as standard, which qualify with a change, and what to know.`,
      entities: [node.diet(d.tag), ...yes.map((f) => node.dish(f.item.slug))],
      tags: ["diet", d.slug],
      sections: [
        { heading: `${d.title} at ${R}: what this means`, body: `At ${R}, dishes listed here ${d.meaning}. ${d.caveat}` },
        {
          heading: `${d.title} at ${R}: the full list`,
          body: paragraphs(`${plural(yes.length, "dish", "dishes")} on the ${R} menu qualify as standard:`, bullets(yes.map((f) => `${f.item.name} (${aed(f.item.priceFils)}) — ${f.item.shortDescription}`))),
        },
        {
          heading: `${d.title} at ${R} with a menu option`,
          body: withOption.length ? `These dishes qualify when ordered with the option shown: ${list([...new Set(withOption)])}.` : `No other ${R} dish can be made to qualify by choosing an option.`,
        },
      ],
      related: yes.map((f) => ({ path: docPath.dish(f.item.slug), title: f.item.name })),
    });
  }

  const short: Record<Allergen, string> = { gluten: "Gluten", crustaceans: "Crustaceans", molluscs: "Molluscs", eggs: "Eggs", fish: "Fish", peanuts: "Peanuts", soy: "Soy", milk: "Milk", tree_nuts: "Tree nuts", celery: "Celery", mustard: "Mustard", sesame: "Sesame", sulphites: "Sulphites", lupin: "Lupin" };
  docs.push({
    id: "allergen-policy",
    path: "documents/allergens-and-diets/allergen-policy.md",
    title: `${R} allergen policy`,
    docType: "policy",
    summary: `How ${R} handles allergies: the kitchen allergen statement, what staff will and will not say, severe allergies, shared equipment and a dish-by-dish allergen list.`,
    entities: [node.policy("allergens"), ...ALLERGENS.map((a) => node.allergen(a))],
    tags: ["allergens", "policy", "safety"],
    sections: [
      { heading: `${R} kitchen allergen statement`, body: kitchenAllergenStatement(c) },
      {
        heading: `How ${R} answers allergy questions`,
        body: bullets([
          "Staff say what a dish contains as ingredients and what it may contain as traces, using the recipe of that exact dish and any options chosen.",
          `${R} never says a dish is “safe”, “allergen-free” or “100% free” of an allergen, and never guarantees there is no cross-contamination, because there is one shared kitchen.`,
          "Guests with a severe allergy (anaphylaxis, an EpiPen, coeliac disease) are asked to speak to the duty manager before ordering. Allergies written in order notes are flagged and the duty manager calls the guest back.",
          "Leaving an ingredient out (for example “no sesame seeds”) removes it from the recipe, not from the kitchen, so a trace warning still applies.",
          `${R} cannot cook any dish in a separate allergen-free kitchen, and cannot make the whole menu free from any allergen.`,
          "All meat and poultry are halal; no pork, alcohol or gelatine is used.",
        ]),
      },
      {
        heading: `Shared equipment in the ${R} kitchen`,
        body: bullets([
          "General fryer: sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).",
          "Seafood fryer: used only for safi (rabbitfish).",
          "Charcoal grill: lamb, camel, chicken, hammour and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).",
          "Breakfast plancha and bread station: regag, eggs, cheese and chebab; the mehyawa regag is also made here.",
          "Sauce station blender: shared by Al Ghaf House Red (walnuts) and Al Ghaf House Green.",
        ]),
      },
      ...facts.map((f) => ({
        heading: `Allergens in ${f.item.name}`,
        body: `${f.item.name} contains ${allergens(f.comp.allergens)}${f.comp.mayContain.length ? ` and may contain traces of ${allergens(f.comp.mayContain)}` : ""}. Diet: ${f.comp.diet}.`,
      })),
      {
        heading: `${R} allergen matrix`,
        body: paragraphs(
          "C = contains as an ingredient, T = may contain traces, blank = not an ingredient.",
          [
            `| Dish | ${ALLERGENS.map((a) => short[a]).join(" | ")} |`,
            `| --- | ${ALLERGENS.map(() => "---").join(" | ")} |`,
            ...facts.map((f) => `| ${f.item.name} | ${ALLERGENS.map((a) => (f.comp.allergens.includes(a) ? "C" : f.comp.mayContain.includes(a) ? "T" : "")).join(" | ")} |`),
          ].join("\n"),
        ),
      },
    ],
    related: ALLERGENS.map((a) => ({ path: docPath.allergen(a), title: ALLERGEN_TITLES[a] })),
  });
  return docs;
}
