import type { Catalog } from "./catalog";
import { composeItem } from "./catalog";
import { ALLERGENS, ALLERGEN_LABELS, type Allergen } from "./types";

/** Allergens present as an ingredient somewhere in the kitchen (derived, never hand-typed). */
export function allergensHandledInKitchen(catalog: Catalog): Allergen[] {
  const set = new Set<Allergen>();
  for (const i of catalog.ingredientsById.values()) i.allergens.forEach((a) => set.add(a));
  return ALLERGENS.filter((a) => set.has(a));
}

export function allergensNotUsedAsIngredients(catalog: Catalog): Allergen[] {
  const used = new Set(allergensHandledInKitchen(catalog));
  return ALLERGENS.filter((a) => !used.has(a));
}

export function kitchenAllergenStatement(catalog: Catalog): string {
  const handled = allergensHandledInKitchen(catalog).map((a) => ALLERGEN_LABELS[a].toLowerCase());
  const notUsed = allergensNotUsedAsIngredients(catalog).map((a) => ALLERGEN_LABELS[a].toLowerCase());
  return (
    `Our single kitchen handles ${handled.join(", ")}. ` +
    `${notUsed.length ? `We do not use ${notUsed.join(", ")} as ingredients, but supplier products may carry traces. ` : ""}` +
    "We take care to limit cross-contact, but we cannot guarantee that any dish is completely free from any allergen. " +
    "Guests with severe allergies should speak to the duty manager before ordering."
  );
}

/** Items whose default recipe contains none of the given allergens as ingredients. */
export function itemsWithout(catalog: Catalog, exclude: Allergen[]) {
  return catalog.items.filter((item) => {
    const comp = composeItem(catalog, item);
    return !exclude.some((a) => comp.allergens.includes(a));
  });
}

export const ALLERGY_KEYWORDS = /\b(allerg\w*|anaphyla\w*|epipen|coeliac|celiac|intoleran\w*|nut[- ]?free|gluten[- ]?free|dairy[- ]?free)\b/i;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_pickup: "Cash on collection (AED)",
  card_on_pickup: "Card or Apple Pay / Google Pay on collection",
  cash_on_delivery: "Cash on delivery (AED)",
  card_on_delivery: "Card on delivery (driver's card machine)",
  pay_at_table: "Pay at the table after the meal",
  bank_transfer_deposit: "Deposit by bank transfer, arranged by the catering team",
};
