import { allergenAvoidance, composeItem, composeSauce, sauceIngredientIds } from "@/domain/catalog";
import { describeRuleSummary } from "@/domain/availability";
import { allergensHandledInKitchen, allergensNotUsedAsIngredients, kitchenAllergenStatement } from "@/domain/policies";
import { ALLERGENS, ALLERGEN_LABELS, DIETARY_TAG_LABELS, ITEM_KIND_LABELS, WEEKDAY_NAMES, type Allergen, type DietaryTag } from "@/domain/types";
import { aed, allergenList, header, itemsInCategory, spice, table, tagList, type KnowledgeContext } from "../context";

function ruleSentences(k: KnowledgeContext, itemId: string): string[] {
  const item = k.catalog.itemsById.get(itemId)!;
  return item.availabilityRules.map((r) => {
    switch (r.type) {
      case "days_of_week":
        return `Only on ${r.days.map((d) => WEEKDAY_NAMES[d]).join(" and ")}.`;
      case "time_window":
        return `Served ${r.start}–${r.end}.`;
      case "date_range":
        return `Only from ${r.start} to ${r.end}.`;
      case "during_period":
        return `Only during ${r.periodType.replace(/_/g, " ")} (see special-days-and-seasonal-menu.md).`;
      case "not_during_period":
        return `Not served during ${r.periodType.replace(/_/g, " ")}.`;
      case "order_types":
        return `Can be ordered for: ${r.allowed.join(", ")}.`;
      case "min_notice_hours":
        return `Order at least ${r.hours} hours in advance.`;
      case "same_day_cutoff":
        return `Same-day orders must be placed by ${r.time}.`;
      case "orders_open_from":
        return `Orders open on ${r.date}.`;
      case "min_quantity":
        return `Minimum ${r.quantity} per order.`;
      case "channels":
        return `Channels: ${r.allowed.join(", ")}.`;
    }
  });
}

export function menuCatalogDoc(k: KnowledgeContext): string {
  const out: string[] = [
    header(k, "menu-catalog", "Menu Catalog", "Every dish with price, description, ingredients and quantities, portions, allergens, dietary information, preparation time, customisations and ordering eligibility."),
    "## How to read this catalogue",
    "",
    "- **Prices** are in AED and include 5% VAT.",
    "- **Allergens** are derived automatically from the ingredient and sauce records (they are never typed by hand). “May contain” lists traces from shared equipment or supplier statements.",
    `- **Item types:** ${Object.entries(ITEM_KIND_LABELS).map(([k2, v]) => `\`${k2}\` = ${v}`).join("; ")}.`,
    "- **Availability** rules are enforced by the backend. Always confirm a specific date/time with `GET /api/v1/menu/items/{id}/availability?date=…&time=…&mode=…`.",
    "- **Kitchen portions** measure kitchen capacity (drinks count as 0). Regular orders are limited to " +
      `${k.rc.settings.ordering.maxPortionsPerOrder} portions; larger orders go through catering.`,
    "",
    "## Menu overview",
    "",
    table(
      ["Category", "Dishes", "Price range"],
      k.catalog.categories.map((c) => {
        const items = itemsInCategory(k, c.id);
        const prices = items.map((i) => i.priceFils);
        return [`${c.name} (${c.arabicName})`, items.length, prices.length ? `${aed(Math.min(...prices))} – ${aed(Math.max(...prices))}` : "—"];
      }),
    ),
    "",
    `Total dishes: ${k.catalog.items.filter((i) => i.isVisible).length}.`,
    "",
    "### Quick price list",
    "",
    table(
      ["Dish", "Arabic", "Price", "Type", "Serves", "Allergens (ingredients)"],
      k.catalog.items.filter((i) => i.isVisible).map((i) => [i.name, i.arabicName, aed(i.priceFils), i.kind, i.portion.servesPeople, allergenList(composeItem(k.catalog, i).allergens)]),
    ),
    "",
  ];
  for (const c of k.catalog.categories) {
    out.push(`## ${c.name} — ${c.arabicName}`, "", c.description, "");
    for (const item of itemsInCategory(k, c.id)) {
      const comp = composeItem(k.catalog, item);
      const avoid = allergenAvoidance(k.catalog, item);
      out.push(`### ${item.name} (${item.arabicName}) — ${aed(item.priceFils)}`, "");
      out.push(
        table(
          ["Field", "Value"],
          [
            ["ID / slug", `\`${item.id}\` / \`${item.slug}\``],
            ["Also called", item.aliases.join(", ") || "—"],
            ["Type", ITEM_KIND_LABELS[item.kind]],
            ["Availability", item.availabilityNote],
            ["Rules (enforced)", ruleSentences(k, item.id).join(" ") || "Whenever the kitchen is open."],
            ["Portion", item.portion.description],
            ["Serves", `${item.portion.servesPeople} ${item.portion.servesPeople === 1 ? "person" : "people"}`],
            ["Cooking method", item.cookingMethod],
            ["Style", item.preparationStyle],
            ["Spice", `${spice(item.spiceLevel)} (${item.spiceLevel}/3). ${item.spiceAdjustment.note}`],
            ["Preparation time", `${item.prepTimeMinutes} minutes`],
            ["Contains (ingredients)", allergenList(comp.allergens)],
            ["May contain (traces)", comp.mayContain.length ? allergenList(comp.mayContain) : "No specific trace warnings beyond the general kitchen statement"],
            ["Diet", `${comp.diet}; ${tagList(comp.dietaryTags)}`],
            ["Fulfilment", `Dine-in: ${yes(item.fulfilment.dineIn)} · Pickup: ${yes(item.fulfilment.pickup)} · Delivery: ${yes(item.fulfilment.delivery)} · Dine-in pre-order: ${yes(item.fulfilment.dineInPreorder)}`],
            ["Max per order", `${item.maxPerOrder}${item.dailyLimit !== null ? ` (daily limit ${item.dailyLimit} portions)` : ""}`],
            [
              "Catering / large orders",
              item.bulk.eligible
                ? `${item.bulk.bulkOnly ? "Catering only. " : "Eligible. "}${item.bulk.minQuantity ? `Min ${item.bulk.minQuantity}. ` : ""}${item.bulk.maxQuantityPerDay ? `Max ${item.bulk.maxQuantityPerDay} per day. ` : ""}${item.bulk.minNoticeHours ? `At least ${item.bulk.minNoticeHours} h notice. ` : ""}${item.bulk.note ?? ""}`.trim()
                : "Not available in catering quantities (cooked to order).",
            ],
            ["Kitchen portions", String(item.kitchenPortions)],
          ],
        ),
        "",
        item.description,
        "",
        "**Ingredients**",
        "",
        table(
          ["Ingredient", "Quantity", "Removable", "Allergens"],
          item.ingredients.map((i) => {
            const ing = k.catalog.ingredientsById.get(i.ingredientId)!;
            return [ing.name + (i.note ? ` (${i.note})` : ""), i.quantity, i.removable ? "yes" : "no", ing.allergens.length ? allergenList(ing.allergens) : "—"];
          }),
        ),
        "",
      );
      if (item.sauces.length) {
        out.push(
          "**Sauces, marinades and named preparations**",
          "",
          table(
            ["Preparation", "Role", "Allergens", "Details"],
            item.sauces.map((s) => {
              const sauce = k.catalog.saucesById.get(s.sauceId)!;
              return [sauce.name, s.role + (s.note ? ` (${s.note})` : ""), allergenList(composeSauce(k.catalog, sauce.id).allergens), `see ingredients-and-sauces.md#${sauce.slug}`];
            }),
          ),
          "",
        );
      }
      if (item.customizations.length) {
        out.push("**Customisations**", "");
        for (const g of item.customizations) {
          out.push(
            `- *${g.name}* (${g.selection === "single" ? "choose one" : `choose up to ${g.max}`}${g.required ? ", required" : ""}): ` +
              g.options.map((o) => `\`${o.id}\` ${o.name}${o.priceDeltaFils ? ` (${o.priceDeltaFils > 0 ? "+" : ""}${aed(o.priceDeltaFils)})` : ""}${o.default ? " — default" : ""}`).join("; "),
          );
        }
        out.push("");
      }
      const avoidable = avoid.filter((a) => a.avoidableWith);
      const fixed = avoid.filter((a) => !a.avoidableWith);
      if (avoid.length) {
        out.push(
          "**Removing allergens**",
          "",
          ...avoidable.map((a) => `- ${ALLERGEN_LABELS[a.allergen]} can be left out of the recipe by choosing: ${a.avoidableWith!.join(" + ")} (traces may remain).`),
          ...fixed.map((a) => `- ${ALLERGEN_LABELS[a.allergen]} cannot be removed from this dish.`),
          "",
        );
      }
      if (item.crossContactNotes.length) out.push("**Cross-contact notes**", "", ...item.crossContactNotes.map((n) => `- ${n}`), "");
      if (item.pairings.length) out.push(`**Pairs well with:** ${item.pairings.map((p) => k.catalog.itemsById.get(p)?.name ?? p).join(", ")}`, "");
      if (item.customerQA.length) {
        out.push("**Customer questions**", "");
        for (const qa of item.customerQA) out.push(`- **Q:** ${qa.question}  `, `  **A:** ${qa.answer}`);
        out.push("");
      }
    }
  }
  return out.join("\n");
}

const yes = (b: boolean) => (b ? "yes" : "no");

export function ingredientsAndSaucesDoc(k: KnowledgeContext): string {
  const sauces = [...k.catalog.saucesById.values()];
  const house = sauces.filter((s) => s.houseSpecial);
  const out: string[] = [
    header(k, "ingredients-and-sauces", "Ingredients & Sauces", "Complete definitions of every sauce, dip, marinade, spice blend, topping and syrup, plus the full ingredient catalogue."),
    "## House preparations — read this first",
    "",
    `We have ${house.length} named house preparations: ${house.map((s) => `**${s.name}**`).join(", ")}. ` +
      "When a guest asks about “the house sauce”, ask which dish they mean — two different sauces are called “house sauce” by guests: Al Ghaf House Red (contains walnuts and wheat) and Al Ghaf House Green (no nut, dairy, gluten or sesame ingredients, but made on the same station as the Red).",
    "",
    table(
      ["Preparation", "Type", "Contains", "May contain", "Spice", "Served with"],
      house.map((s) => {
        const c = composeSauce(k.catalog, s.id);
        const usedIn = k.catalog.items.filter((i) => i.sauces.some((x) => x.sauceId === s.id)).map((i) => i.name);
        return [s.name, s.kind.replace("_", " "), allergenList(c.allergens), c.mayContain.length ? allergenList(c.mayContain) : "—", spice(s.spiceLevel), usedIn.join(", ") || "—"];
      }),
    ),
    "",
    "## All sauces, marinades, blends, toppings and syrups",
    "",
    table(
      ["Name", "Arabic", "Kind", "Contains", "Diet", "Spice", "Extra side"],
      sauces.map((s) => {
        const c = composeSauce(k.catalog, s.id);
        return [s.name, s.arabicName ?? "—", s.kind.replace("_", " "), allergenList(c.allergens), c.diet, spice(s.spiceLevel), s.sidePriceFils !== null ? aed(s.sidePriceFils) : "not sold separately"];
      }),
    ),
    "",
  ];
  for (const s of sauces) {
    const c = composeSauce(k.catalog, s.id);
    const usedIn = [
      ...k.catalog.items.flatMap((i) => i.sauces.filter((x) => x.sauceId === s.id).map((x) => `${i.name} (${x.role})`)),
      ...sauces.filter((p) => (p.includesSauces ?? []).some((n) => n.sauceId === s.id)).map((p) => `${p.name} (component)`),
      ...k.catalog.items.flatMap((i) => i.customizations.flatMap((g) => g.options.filter((o) => o.addsSauceIds?.includes(s.id)).map(() => `${i.name} (optional extra)`))),
    ];
    out.push(
      `<a id="${s.slug}"></a>`,
      `### ${s.name}${s.arabicName ? ` (${s.arabicName})` : ""}`,
      "",
      `ID \`${s.id}\` · slug \`${s.slug}\` · ${s.kind.replace("_", " ")}${s.houseSpecial ? " · **house preparation**" : ""}${s.aliases?.length ? ` · also called: ${s.aliases.join(", ")}` : ""}`,
      "",
      s.description,
      "",
      `- **Flavour:** ${s.flavourProfile}`,
      `- **Spice:** ${spice(s.spiceLevel)} (${s.spiceLevel}/3)`,
      `- **Contains:** ${allergenList(c.allergens)}`,
      `- **May contain:** ${c.mayContain.length ? allergenList(c.mayContain) : "no specific trace warnings"}`,
      `- **Diet:** ${c.diet}; ${tagList(c.dietaryTags)}`,
      `- **Served:** ${s.servedTemperature}`,
      `- **Batch:** ${s.batchYield}`,
      `- **Method:** ${s.preparation}`,
      `- **Used in:** ${[...new Set(usedIn)].join("; ") || "—"}`,
      `- **Extra portion:** ${s.sidePriceFils !== null ? aed(s.sidePriceFils) + " where offered as an extra" : "not sold separately"}`,
      "",
      "Full composition:",
      "",
      table(
        ["Ingredient", "Quantity per batch", "Allergens"],
        [
          ...s.ingredients.map((i) => {
            const ing = k.catalog.ingredientsById.get(i.ingredientId)!;
            return [ing.name, i.quantity, ing.allergens.length ? allergenList(ing.allergens) : "—"];
          }),
          ...(s.includesSauces ?? []).map((n) => {
            const nested = k.catalog.saucesById.get(n.sauceId)!;
            return [`${nested.name} (see its own entry)`, n.quantity, allergenList(composeSauce(k.catalog, nested.id).allergens)];
          }),
        ],
      ),
      "",
      ...(s.crossContactNotes.length ? ["Cross-contact:", "", ...s.crossContactNotes.map((n) => `- ${n}`), ""] : []),
    );
  }
  out.push("## Ingredient catalogue", "", "Every ingredient used anywhere in the kitchen. Diet: vegan < vegetarian (dairy/egg/honey) < pescatarian (fish/seafood) < meat.", "");
  const ingr = [...k.catalog.ingredientsById.values()].sort((a, b) => a.name.localeCompare(b.name));
  out.push(
    table(
      ["Ingredient", "Arabic", "ID", "Diet", "Allergens", "May contain", "Used in"],
      ingr.map((i) => {
        const dishes = k.catalog.items.filter((it) => it.ingredients.some((x) => x.ingredientId === i.id)).map((it) => it.name);
        const inSauces = sauces.filter((s) => sauceIngredientIds(k.catalog, s.id).includes(i.id) && s.ingredients.some((x) => x.ingredientId === i.id)).map((s) => s.name);
        const used = [...dishes, ...inSauces.map((n) => `${n} (sauce)`)];
        return [
          i.name + (i.aliases?.length ? ` (also: ${i.aliases.join(", ")})` : ""),
          i.arabicName ?? "—",
          `\`${i.id}\``,
          i.diet,
          i.allergens.length ? allergenList(i.allergens) : "—",
          i.mayContain?.length ? allergenList(i.mayContain) : "—",
          used.length > 6 ? `${used.slice(0, 6).join(", ")} and ${used.length - 6} more` : used.join(", ") || "—",
        ];
      }),
    ),
    "",
    "Ingredient notes:",
    "",
    ...ingr.filter((i) => i.notes).map((i) => `- **${i.name}:** ${i.notes}`),
    "- **Loomi** (dried black lime, sometimes called “dried lemon”) is a sun-dried lime — a citrus fruit, not an allergen.",
    "- **Ghee** is clarified butter and is a milk (dairy) product.",
    "- **Camel milk** is a milk allergen and contains lactose.",
    "- **Nutmeg** is a seed spice, not a tree nut. **Pine nuts** are labelled as tree nuts.",
    "- **Golden raisins** contain sulphites (sulphur dioxide).",
    "- We do not use coconut, peanuts, molluscs, lupin, pork, gelatine or alcohol in any recipe.",
    "",
  );
  return out.join("\n");
}

export function allergensGuideDoc(k: KnowledgeContext): string {
  const items = k.catalog.items.filter((i) => i.isVisible);
  const comps = new Map(items.map((i) => [i.id, composeItem(k.catalog, i)]));
  const short: Record<Allergen, string> = {
    gluten: "Glu", crustaceans: "Cru", molluscs: "Mol", eggs: "Egg", fish: "Fish", peanuts: "Pea", soy: "Soy", milk: "Milk", tree_nuts: "Nuts", celery: "Cel", mustard: "Mus", sesame: "Ses", sulphites: "Sul", lupin: "Lup",
  };
  const withTag = (tag: DietaryTag) => items.filter((i) => comps.get(i.id)!.dietaryTags.includes(tag)).map((i) => i.name);
  const veganWithOptions = items
    .filter((i) => comps.get(i.id)!.diet !== "vegan")
    .flatMap((i) => i.customizations.flatMap((g) => g.options.filter((o) => composeItem(k.catalog, i, [o.id]).diet === "vegan").map((o) => `${i.name} (${o.name})`)));
  const handled = allergensHandledInKitchen(k.catalog);
  const notUsed = allergensNotUsedAsIngredients(k.catalog);
  return [
    header(k, "allergens-and-dietary-guide", "Allergens & Dietary Guide", "Known allergens, dietary categories, ingredient caveats and cross-contamination policies."),
    "## The kitchen allergen statement (read this to guests with allergies)",
    "",
    `> ${kitchenAllergenStatement(k.catalog)}`,
    "",
    "## Rules for answering allergen questions",
    "",
    "1. Answer from the dish's ingredient list: say what the dish **contains as ingredients** and what it **may contain** (traces).",
    "2. **Never** say a dish is “safe”, “allergen-free”, “100% free” or guarantee no cross-contamination. We have one shared kitchen.",
    "3. For a severe allergy (anaphylaxis, EpiPen, coeliac disease), recommend speaking to the duty manager before ordering and add the allergy to the order notes — orders with allergy notes are flagged for a call-back.",
    "4. If the guest is unsure which dish or sauce they mean, ask (e.g. there are two different “house sauces”).",
    "5. Removing an ingredient (e.g. “no sesame seeds”) removes it from the recipe, not from the kitchen. Always add the trace warning.",
    "6. We cannot make the whole menu free from any allergen, and we cannot cook in a separate allergen-free kitchen.",
    "7. All meat and poultry are halal. No pork, alcohol or gelatine is used.",
    "",
    "## The 14 major allergens in our kitchen",
    "",
    table(
      ["Allergen", "Used as an ingredient?", "Dishes containing it (default recipe)"],
      ALLERGENS.map((a) => {
        const dishes = items.filter((i) => comps.get(i.id)!.allergens.includes(a)).map((i) => i.name);
        return [ALLERGEN_LABELS[a], handled.includes(a) ? "Yes" : "No (traces possible from suppliers)", dishes.length ? `${dishes.length}: ${dishes.join(", ")}` : "none"];
      }),
    ),
    "",
    `Not used as ingredients: ${notUsed.map((a) => ALLERGEN_LABELS[a]).join(", ")}.`,
    "",
    "## Allergen matrix",
    "",
    "● = contains as an ingredient (default recipe) · ○ = may contain traces · blank = not present as an ingredient (general kitchen statement still applies).",
    "",
    table(
      ["Dish", ...ALLERGENS.map((a) => short[a])],
      items.map((i) => {
        const c = comps.get(i.id)!;
        return [i.name, ...ALLERGENS.map((a) => (c.allergens.includes(a) ? "●" : c.mayContain.includes(a) ? "○" : ""))];
      }),
    ),
    "",
    `Key: ${ALLERGENS.map((a) => `${short[a]} = ${ALLERGEN_LABELS[a]}`).join("; ")}.`,
    "",
    "## Dietary lists (default recipes)",
    "",
    `- **Vegan (${withTag("vegan").length}):** ${withTag("vegan").join(", ")}.`,
    `- **Vegan with a customisation:** ${veganWithOptions.join("; ") || "none"}.`,
    `- **Vegetarian (${withTag("vegetarian").length}):** ${withTag("vegetarian").join(", ")}.`,
    `- **Pescatarian (fish/seafood, no meat):** ${withTag("pescatarian").join(", ")}.`,
    `- **No gluten-containing ingredients (${withTag("gluten_free_ingredients").length}):** ${withTag("gluten_free_ingredients").join(", ")}. None are certified gluten-free; wheat is handled throughout the kitchen and fryers are shared.`,
    `- **No dairy ingredients:** ${withTag("dairy_free").join(", ")}.`,
    `- **No egg ingredients:** ${withTag("egg_free").join(", ")}.`,
    `- **No nut ingredients:** ${withTag("nut_free_ingredients").join(", ")}. Not a nut-free kitchen.`,
    `- **No sesame ingredients:** ${withTag("sesame_free_ingredients").join(", ")}. Sesame (tahini, sesame oil, seeds) is used in the kitchen.`,
    `- **No crustaceans or molluscs:** ${withTag("shellfish_free").join(", ")}. Prawns are cooked on the shared grill.`,
    "",
    "## Ingredient caveats guests often ask about",
    "",
    "- **Ghee** (in machboos, harees, balaleet, many sweets) is a dairy product.",
    "- **Bezar** spice blend has no major allergens as ingredients but may contain traces of mustard and celery (supplier).",
    "- **Vegetable stock** contains celery — it is used in Shorbat Adas, Vegetable Machboos, Pumpkin & Chickpea Saloona and the Iftar set.",
    "- **Hashu** (machboos topping) contains ghee (milk) and golden raisins (sulphites).",
    "- **Mehyawa** is a fermented fish sauce with mustard seed.",
    "- **Sauce No. 7** contains soy sauce (soy and wheat) and sesame oil; it glazes the lamb chops and the camel burger.",
    "- **Al Ghaf House Red** contains walnuts and breadcrumbs (wheat).",
    "- **Toum** is egg-free and dairy-free (garlic, oil, lemon, salt). **Loomi Aioli** contains egg and mustard.",
    "- **Hummus** contains tahini (sesame) and is topped with pine nuts (tree nuts).",
    "- **Luqaimat** contain milk powder and are topped with sesame seeds; they share a fryer with sambousa and khanfaroosh.",
    "- **Camel milk** (ice cream, optional karak/shake) is still a milk allergen.",
    "",
    "## Shared equipment",
    "",
    "- **General fryer:** sambousa, luqaimat, khanfaroosh, potato wedges (gluten, milk, eggs, sesame).",
    "- **Seafood fryer:** safi (rabbitfish) only.",
    "- **Charcoal grill:** lamb, camel, chicken, hammour and prawns; some items glazed with Sauce No. 7.",
    "- **Breakfast plancha / bread station:** regag, eggs, cheese, chebab; mehyawa regag is also made here.",
    "- **Sauce station blender:** Al Ghaf House Red and Green.",
    "",
  ].join("\n");
}

export { describeRuleSummary, DIETARY_TAG_LABELS };
