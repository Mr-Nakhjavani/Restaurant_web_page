import type { AvailabilityRule, MenuItemDef, ModifierGroup, SpiceLevel } from "@/domain/types";

/** Convert dirhams to fils (integer minor units). */
export const aed = (amount: number) => Math.round(amount * 100);

export const ing = (ingredientId: string, quantity: string, extra?: { removable?: boolean; note?: string }) => ({
  ingredientId,
  quantity,
  ...extra,
});

export const BREAKFAST_RULES: AvailabilityRule[] = [
  { type: "time_window", start: "08:00", end: "11:30" },
  { type: "not_during_period", periodType: "ramadan" },
];

export const ALL_FULFILMENT: MenuItemDef["fulfilment"] = { pickup: true, delivery: true, dineIn: true, dineInPreorder: true };
export const NO_DELIVERY: MenuItemDef["fulfilment"] = { pickup: true, delivery: false, dineIn: true, dineInPreorder: true };
export const DINE_IN_ONLY: MenuItemDef["fulfilment"] = { pickup: false, delivery: false, dineIn: true, dineInPreorder: true };

export const NO_BULK: MenuItemDef["bulk"] = { eligible: false, bulkOnly: false };
export const bulk = (maxQuantityPerDay: number, extra?: Partial<MenuItemDef["bulk"]>): MenuItemDef["bulk"] => ({
  eligible: true,
  bulkOnly: false,
  maxQuantityPerDay,
  ...extra,
});

/** Standard spice-level choice for dishes where the chef can adjust chilli. */
export function spiceChoice(defaultLevel: SpiceLevel, opts?: { allowHot?: boolean; allowNone?: boolean }): ModifierGroup {
  const options = [
    ...(opts?.allowNone ? [{ id: "spice_none", name: "No chilli", priceDeltaFils: 0, spiceLevel: 0 as SpiceLevel }] : []),
    { id: "spice_mild", name: "Mild", priceDeltaFils: 0, spiceLevel: 1 as SpiceLevel },
    { id: "spice_medium", name: "Medium", priceDeltaFils: 0, spiceLevel: 2 as SpiceLevel },
    ...(opts?.allowHot === false ? [] : [{ id: "spice_hot", name: "Hot", priceDeltaFils: 0, spiceLevel: 3 as SpiceLevel }]),
  ].map((o) => ({ ...o, default: o.spiceLevel === defaultLevel }));
  if (!options.some((o) => o.default)) options[0].default = true;
  return { id: "spice", name: "Spice level", selection: "single", required: true, min: 1, max: 1, options };
}

export function extraSides(options: { sauceId: string; name: string; priceFils: number }[]): ModifierGroup {
  return {
    id: "extras",
    name: "Extra sauces",
    selection: "multiple",
    required: false,
    min: 0,
    max: options.length,
    options: options.map((o) => ({
      id: `extra_${o.sauceId.replace(/^sau_/, "")}`,
      name: `Extra ${o.name}`,
      priceDeltaFils: o.priceFils,
      addsSauceIds: [o.sauceId],
    })),
  };
}

export const SHARED_FRYER_NOTE =
  "Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).";
export const SHARED_FRYER_ALLERGENS = ["gluten", "milk", "eggs", "sesame"] as const;

export const SHARED_GRILL_NOTE =
  "Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).";
export const SHARED_GRILL_ALLERGENS = ["fish", "crustaceans", "soy", "gluten", "sesame"] as const;

export const PLANCHA_NOTE = "Cooked on the shared breakfast plancha used for regag, eggs and cheese.";
