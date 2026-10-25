/**
 * Core domain vocabulary for Bayt Al Ghaf.
 *
 * These types are shared by the canonical seed data (src/data), the business
 * rules (src/domain), the database mappers (src/server) and the knowledge-base
 * generators. Keep string literal unions stable: they are part of the public
 * API contract consumed by external agents.
 */

export const ALLERGENS = [
  "gluten",
  "crustaceans",
  "molluscs",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "tree_nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Cereals containing gluten (wheat)",
  crustaceans: "Crustaceans (prawns/shrimp)",
  molluscs: "Molluscs",
  eggs: "Eggs",
  fish: "Fish",
  peanuts: "Peanuts",
  soy: "Soy",
  milk: "Milk / dairy",
  tree_nuts: "Tree nuts",
  celery: "Celery",
  mustard: "Mustard",
  sesame: "Sesame",
  sulphites: "Sulphites",
  lupin: "Lupin",
};

/** Dietary class of a single ingredient, from least to most restrictive for vegans. */
export const DIET_CLASSES = ["vegan", "vegetarian", "pescatarian", "meat"] as const;
export type DietClass = (typeof DIET_CLASSES)[number];

export const DIETARY_TAGS = [
  "vegan",
  "vegetarian",
  "pescatarian",
  "gluten_free_ingredients",
  "dairy_free",
  "egg_free",
  "nut_free_ingredients",
  "sesame_free_ingredients",
  "shellfish_free",
  "halal",
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian (fish/seafood, no meat)",
  gluten_free_ingredients: "No gluten-containing ingredients (not certified gluten-free)",
  dairy_free: "No dairy ingredients",
  egg_free: "No egg ingredients",
  nut_free_ingredients: "No nut ingredients (not a nut-free kitchen)",
  sesame_free_ingredients: "No sesame ingredients",
  shellfish_free: "No crustaceans or molluscs",
  halal: "Halal",
};

export const ORDER_TYPES = ["pickup", "delivery", "dine_in_preorder"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/** Channel through which a request reached the restaurant. `phone` is the external voice agent. */
export const CHANNELS = ["website", "phone", "staff"] as const;
export type Channel = (typeof CHANNELS)[number];

export const ITEM_KINDS = ["permanent", "daily_special", "limited_time", "catering"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  permanent: "Permanent menu",
  daily_special: "Daily / weekly special",
  limited_time: "Limited-time offer",
  catering: "Catering & large orders only",
};

export const SPECIAL_PERIOD_TYPES = [
  "ramadan",
  "eid_al_fitr",
  "eid_al_adha",
  "national_day",
  "seasonal",
  "custom",
] as const;
export type SpecialPeriodType = (typeof SPECIAL_PERIOD_TYPES)[number];

export type SpiceLevel = 0 | 1 | 2 | 3;
export const SPICE_LABELS: Record<SpiceLevel, string> = {
  0: "Not spicy",
  1: "Mild",
  2: "Medium",
  3: "Hot",
};

/** Weekday numbers follow ISO-8601 / Luxon: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAY_NAMES: Record<IsoWeekday, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export type AvailabilityRule =
  | { type: "days_of_week"; days: IsoWeekday[] }
  | { type: "time_window"; start: string; end: string }
  | { type: "date_range"; start: string; end: string }
  | { type: "during_period"; periodType: SpecialPeriodType }
  | { type: "not_during_period"; periodType: SpecialPeriodType }
  | { type: "order_types"; allowed: OrderType[] }
  | { type: "min_notice_hours"; hours: number }
  | { type: "same_day_cutoff"; time: string }
  | { type: "orders_open_from"; date: string }
  | { type: "min_quantity"; quantity: number }
  | { type: "channels"; allowed: Channel[] };

export interface ModifierOption {
  id: string;
  name: string;
  /** Price change in fils (1 AED = 100 fils). May be negative. */
  priceDeltaFils: number;
  default?: boolean;
  description?: string;
  removesIngredientIds?: string[];
  addsIngredientIds?: string[];
  removesSauceIds?: string[];
  addsSauceIds?: string[];
  /** Overrides the dish spice level when selected. */
  spiceLevel?: SpiceLevel;
}

export interface ModifierGroup {
  id: string;
  name: string;
  /** single = choose exactly one (radio); multiple = choose any number up to max. */
  selection: "single" | "multiple";
  required: boolean;
  min: number;
  max: number;
  options: ModifierOption[];
}

export interface IngredientDef {
  id: string;
  name: string;
  arabicName?: string;
  aliases?: string[];
  description: string;
  diet: DietClass;
  allergens: Allergen[];
  /** Precautionary "may contain" statements carried over from suppliers. */
  mayContain?: Allergen[];
  notes?: string;
}

export type SauceKind =
  | "sauce"
  | "dip"
  | "marinade"
  | "spice_blend"
  | "topping"
  | "syrup"
  | "dressing"
  | "glaze";

export interface SauceDef {
  id: string;
  slug: string;
  name: string;
  arabicName?: string;
  aliases?: string[];
  kind: SauceKind;
  houseSpecial: boolean;
  description: string;
  flavourProfile: string;
  spiceLevel: SpiceLevel;
  ingredients: { ingredientId: string; quantity: string }[];
  /** Other named preparations used inside this one (e.g. bezar inside a marinade). */
  includesSauces?: { sauceId: string; quantity: string }[];
  batchYield: string;
  preparation: string;
  servedTemperature: string;
  crossContactNotes: string[];
  /** Traces from shared equipment (e.g. the blender shared with a nut sauce). */
  mayContain?: Allergen[];
  /** Extra charge when ordered as an additional side portion, in fils. null = not sold separately. */
  sidePriceFils: number | null;
}

export type ItemSauceRole = "included" | "marinade" | "glaze" | "topping" | "side";

export interface MenuItemDef {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  aliases: string[];
  categoryId: string;
  kind: ItemKind;
  shortDescription: string;
  description: string;
  priceFils: number;
  portion: { description: string; servesPeople: number; pieces?: number };
  cookingMethod: string;
  preparationStyle: string;
  spiceLevel: SpiceLevel;
  spiceAdjustment: { canReduce: boolean; canIncrease: boolean; note: string };
  prepTimeMinutes: number;
  /** Kitchen capacity units consumed by one unit of this item (0 for drinks). */
  kitchenPortions: number;
  ingredients: { ingredientId: string; quantity: string; removable?: boolean; note?: string }[];
  sauces: { sauceId: string; role: ItemSauceRole; note?: string }[];
  customizations: ModifierGroup[];
  /** Allergens that may be present through shared equipment, in addition to supplier statements. */
  mayContain: Allergen[];
  crossContactNotes: string[];
  fulfilment: { pickup: boolean; delivery: boolean; dineIn: boolean; dineInPreorder: boolean };
  bulk: {
    eligible: boolean;
    bulkOnly: boolean;
    minQuantity?: number;
    maxQuantityPerDay?: number;
    minNoticeHours?: number;
    note?: string;
  };
  maxPerOrder: number;
  dailyLimit: number | null;
  availabilityRules: AvailabilityRule[];
  availabilityNote: string;
  pairings: string[];
  customerQA: { question: string; answer: string }[];
  featured: boolean;
  signature: boolean;
  groupMeal: boolean;
  image: { src: string; alt: string };
  sortOrder: number;
}

export interface MenuCategoryDef {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  description: string;
  sortOrder: number;
}

export interface SpecialPeriodDef {
  id: string;
  slug: string;
  type: SpecialPeriodType;
  name: string;
  startDate: string;
  endDate: string;
  provisional: boolean;
  notes: string;
  /** Optional override of opening hours for every day of the period. */
  hoursOverride?: { open: string; close: string } | null;
}

export interface ClosureDef {
  id: string;
  date: string;
  /** Local start/end time; null means the whole day. */
  startTime: string | null;
  endTime: string | null;
  scope: "all" | "reservations" | "orders";
  reason: string;
  publicNote: string;
}

export const SEATING_AREAS = ["indoor", "window", "terrace", "majlis"] as const;
export type SeatingArea = (typeof SEATING_AREAS)[number];
export const SEATING_AREA_LABELS: Record<SeatingArea, string> = {
  indoor: "Main dining hall (indoor)",
  window: "Creek-view window tables (indoor)",
  terrace: "Creek terrace (outdoor, seasonal)",
  majlis: "Private majlis room (floor seating)",
};

export interface DiningTableDef {
  id: string;
  code: string;
  area: SeatingArea;
  minCovers: number;
  maxCovers: number;
  onlineBookable: boolean;
  features: string[];
  sortOrder: number;
}
