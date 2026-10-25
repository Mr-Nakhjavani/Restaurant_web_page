import { z } from "@hono/zod-openapi";
import { AVAILABILITY_REASON_CODES } from "@/domain/availability";
import { ITEM_KINDS } from "@/domain/types";
import { AllergenSchema, DietaryTagSchema, IsoDateTimeSchema, LocalDateSchema, LocalTimeSchema, MoneySchema } from "./common";

export const FulfilmentModeSchema = z.enum(["pickup", "delivery", "dine_in_preorder", "dine_in"]).openapi("FulfilmentMode", {
  description: "How the guest receives the dish. `dine_in` = eating at the restaurant without a pre-order.",
});

export const ItemAvailabilitySchema = z
  .object({
    itemId: z.string(),
    orderable: z.boolean().openapi({ description: "true only if every rule passes for the checked date, time and mode" }),
    status: z.enum(["available", "unavailable", "sold_out"]),
    reasons: z.array(z.object({ code: z.enum(AVAILABILITY_REASON_CODES), message: z.string() })),
    servingWindow: z.object({ start: LocalTimeSchema, end: LocalTimeSchema }).nullable(),
    remainingOnDate: z.number().int().nullable().openapi({ description: "For dishes with a daily limit: portions still available on that date" }),
    nextAvailable: z
      .object({ date: LocalDateSchema, time: LocalTimeSchema, at: IsoDateTimeSchema, description: z.string() })
      .nullable(),
    checkedFor: z.object({ date: LocalDateSchema, time: LocalTimeSchema, at: IsoDateTimeSchema, mode: FulfilmentModeSchema.nullable() }),
  })
  .openapi("ItemAvailability");

export const AvailabilityRuleSchema = z
  .object({ type: z.string() })
  .catchall(z.any())
  .openapi("AvailabilityRule", {
    description:
      "Machine-readable rule. Types: days_of_week{days:1–7, 1=Monday}, time_window{start,end}, date_range{start,end}, during_period{periodType}, not_during_period{periodType}, order_types{allowed}, min_notice_hours{hours}, same_day_cutoff{time}, orders_open_from{date}, min_quantity{quantity}, channels{allowed}.",
  });

export const ModifierOptionSchema = z
  .object({
    id: z.string().openapi({ example: "hashu_no_raisins" }),
    name: z.string(),
    priceDelta: MoneySchema,
    default: z.boolean(),
    description: z.string().nullable(),
    spiceLevel: z.number().int().nullable(),
    removes: z.array(z.string()).openapi({ description: "Ingredient/sauce names removed by this option" }),
    adds: z.array(z.string()).openapi({ description: "Ingredient/sauce names added by this option" }),
  })
  .openapi("ModifierOption");

export const ModifierGroupSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    selection: z.enum(["single", "multiple"]),
    required: z.boolean(),
    min: z.number().int(),
    max: z.number().int(),
    options: z.array(ModifierOptionSchema),
  })
  .openapi("ModifierGroup");

export const CategoryRefSchema = z.object({ id: z.string(), slug: z.string(), name: z.string() });

export const MenuItemSummarySchema = z
  .object({
    id: z.string().openapi({ example: "mi_lamb_machboos" }),
    slug: z.string().openapi({ example: "lamb-machboos" }),
    name: z.string().openapi({ example: "Lamb Machboos" }),
    arabicName: z.string().openapi({ example: "مجبوس لحم" }),
    category: CategoryRefSchema,
    kind: z.enum(ITEM_KINDS),
    kindLabel: z.string(),
    shortDescription: z.string(),
    price: MoneySchema,
    portion: z.object({ description: z.string(), servesPeople: z.number().int(), pieces: z.number().int().nullable() }),
    spiceLevel: z.number().int().min(0).max(3),
    spiceLabel: z.string(),
    dietaryTags: z.array(DietaryTagSchema),
    allergens: z.array(AllergenSchema).openapi({ description: "Allergens present as ingredients in the default recipe (derived from ingredient records)" }),
    mayContain: z.array(AllergenSchema).openapi({ description: "Possible traces from shared equipment or supplier statements" }),
    prepTimeMinutes: z.number().int(),
    image: z.object({ url: z.string(), alt: z.string() }),
    featured: z.boolean(),
    signature: z.boolean(),
    fulfilment: z.object({ pickup: z.boolean(), delivery: z.boolean(), dineIn: z.boolean(), dineInPreorder: z.boolean() }),
    bulkOnly: z.boolean(),
    availabilityNote: z.string(),
    availability: ItemAvailabilitySchema,
    url: z.string(),
  })
  .openapi("MenuItemSummary");

export const MenuItemDetailSchema = MenuItemSummarySchema.extend({
  description: z.string(),
  aliases: z.array(z.string()),
  cookingMethod: z.string(),
  preparationStyle: z.string(),
  spiceAdjustment: z.object({ canReduce: z.boolean(), canIncrease: z.boolean(), note: z.string() }),
  ingredients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      arabicName: z.string().nullable(),
      quantity: z.string(),
      removable: z.boolean(),
      note: z.string().nullable(),
      allergens: z.array(AllergenSchema),
      diet: z.string(),
    }),
  ),
  sauces: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      kind: z.string(),
      role: z.string().openapi({ description: "included | marinade | glaze | topping | side" }),
      note: z.string().nullable(),
      houseSpecial: z.boolean(),
      spiceLevel: z.number().int(),
      allergens: z.array(AllergenSchema),
      url: z.string(),
    }),
  ),
  allergenDetails: z.array(
    z.object({
      allergen: AllergenSchema,
      label: z.string(),
      sources: z.array(z.string()).openapi({ description: "Which ingredients or sauces contain it" }),
      avoidableWith: z.array(z.string()).nullable().openapi({ description: "Option names that remove it from the recipe; null = cannot be removed" }),
    }),
  ),
  crossContactNotes: z.array(z.string()),
  kitchenAllergenStatement: z.string(),
  customizations: z.array(ModifierGroupSchema),
  bulk: z.object({
    eligible: z.boolean(),
    bulkOnly: z.boolean(),
    minQuantity: z.number().int().nullable(),
    maxQuantityPerDay: z.number().int().nullable(),
    minNoticeHours: z.number().int().nullable(),
    note: z.string().nullable(),
  }),
  maxPerOrder: z.number().int(),
  dailyLimit: z.number().int().nullable(),
  availabilityRules: z.array(AvailabilityRuleSchema),
  pairings: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string() })),
  customerQA: z.array(z.object({ question: z.string(), answer: z.string() })),
  updatedAt: z.string().nullable(),
}).openapi("MenuItemDetail");

export const MenuCategorySchema = z
  .object({ id: z.string(), slug: z.string(), name: z.string(), arabicName: z.string(), description: z.string(), itemCount: z.number().int() })
  .openapi("MenuCategory");

export const IngredientSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    arabicName: z.string().nullable(),
    aliases: z.array(z.string()),
    description: z.string(),
    diet: z.string(),
    allergens: z.array(AllergenSchema),
    mayContain: z.array(AllergenSchema),
    notes: z.string().nullable(),
    usedIn: z.array(z.object({ type: z.enum(["menu_item", "sauce"]), id: z.string(), slug: z.string(), name: z.string() })),
  })
  .openapi("Ingredient");

export const SauceSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    arabicName: z.string().nullable(),
    aliases: z.array(z.string()),
    kind: z.string(),
    houseSpecial: z.boolean(),
    description: z.string(),
    flavourProfile: z.string(),
    spiceLevel: z.number().int(),
    spiceLabel: z.string(),
    ingredients: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.string(), allergens: z.array(AllergenSchema) })),
    includes: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string(), quantity: z.string() })),
    allergens: z.array(AllergenSchema),
    mayContain: z.array(AllergenSchema),
    diet: z.string(),
    dietaryTags: z.array(DietaryTagSchema),
    batchYield: z.string(),
    preparation: z.string(),
    servedTemperature: z.string(),
    crossContactNotes: z.array(z.string()),
    sidePrice: MoneySchema.nullable(),
    usedIn: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string(), role: z.string() })),
    url: z.string(),
  })
  .openapi("Sauce");

export const MenuQuerySchema = z.object({
  category: z.string().optional().openapi({ description: "Category id or slug", example: "rice-and-machboos" }),
  kind: z.enum(ITEM_KINDS).optional(),
  search: z.string().max(200).optional().openapi({ description: "Free text; tolerant of spelling variants (majboos, lugaimat…)", example: "majboos" }),
  dietary: z.string().optional().openapi({ description: "Comma-separated dietary tags that must all apply", example: "vegan,gluten_free_ingredients" }),
  excludeAllergens: z.string().optional().openapi({ description: "Comma-separated allergens that must NOT be ingredients", example: "tree_nuts,sesame" }),
  maxSpice: z.coerce.number().int().min(0).max(3).optional(),
  minPriceAed: z.coerce.number().min(0).optional(),
  maxPriceAed: z.coerce.number().min(0).optional(),
  date: LocalDateSchema.optional().openapi({ description: "Check availability for this Dubai date (default: today)" }),
  time: LocalTimeSchema.optional().openapi({ description: "Check availability at this Dubai time (default: now, or 13:00 for future dates)" }),
  mode: FulfilmentModeSchema.optional().openapi({ description: "Fulfilment mode for availability (default dine_in)" }),
  availableOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true")
    .openapi({ description: "Only return items orderable at the checked date/time/mode" }),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const AvailabilityQuerySchema = z.object({
  date: LocalDateSchema.optional(),
  time: LocalTimeSchema.optional(),
  mode: FulfilmentModeSchema.optional(),
  quantity: z.coerce.number().int().min(1).max(500).optional(),
});
