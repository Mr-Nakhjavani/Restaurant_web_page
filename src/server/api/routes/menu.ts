import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { money } from "@/domain/money";
import { envelope, errorResponses, jsonContent, LocalDateSchema, MoneySchema } from "../../contracts/common";
import {
  AvailabilityQuerySchema,
  AvailabilityRuleSchema,
  FulfilmentModeSchema,
  IngredientSchema,
  ItemAvailabilitySchema,
  MenuCategorySchema,
  MenuItemDetailSchema,
  MenuItemSummarySchema,
  MenuQuerySchema,
  SauceSchema,
} from "../../contracts/menu";
import {
  feedingSuggestions,
  getIngredient,
  getItemAvailability,
  getMenuItem,
  getSauce,
  listIngredients,
  listMenu,
  listSauces,
  listSpecials,
  parseAllergens,
  parseDietary,
  searchMenu,
} from "../../services/menu-service";
import type { AppEnv } from "../types";
import { readLimit } from "./shared";

const IdParam = z.object({ id: z.string().min(1).max(80).openapi({ param: { name: "id", in: "path" }, example: "mi_lamb_machboos" }) });

const MenuResponse = z.object({
  data: z.array(MenuItemSummarySchema),
  meta: z.object({
    count: z.number().int(),
    categories: z.array(MenuCategorySchema),
    checkedFor: z.object({ date: z.string(), time: z.string().nullable(), mode: z.string() }),
    kitchenAllergenStatement: z.string(),
  }),
});

const AlternativeSchema = z.object({ id: z.string(), slug: z.string(), name: z.string(), price: MoneySchema, reason: z.string() });

export function registerMenuRoutes(app: OpenAPIHono<AppEnv>) {
  for (const p of ["/menu", "/menu/*", "/ingredients", "/ingredients/*", "/sauces", "/sauces/*"]) app.use(p, readLimit);

  app.openapi(
    createRoute({
      method: "get",
      path: "/menu",
      tags: ["Menu"],
      summary: "Full menu with filters and date-aware availability",
      description:
        "Every item includes `availability` evaluated for `date`/`time`/`mode` (default: now, dine-in). Filter by category, kind, dietary tags, excluded allergens, spice, price or free-text search (spelling-variant tolerant).",
      request: { query: MenuQuerySchema },
      responses: { 200: jsonContent(MenuResponse, "Menu items"), ...errorResponses(400, 404) },
    }),
    async (c) => {
      const q = c.req.valid("query");
      const result = await listMenu(c.get("now"), {
        category: q.category,
        kind: q.kind,
        search: q.search,
        dietary: parseDietary(q.dietary),
        excludeAllergens: parseAllergens(q.excludeAllergens),
        maxSpice: q.maxSpice,
        minPriceFils: q.minPriceAed !== undefined ? Math.round(q.minPriceAed * 100) : undefined,
        maxPriceFils: q.maxPriceAed !== undefined ? Math.round(q.maxPriceAed * 100) : undefined,
        date: q.date,
        time: q.time,
        mode: q.mode,
        availableOnly: q.availableOnly,
        featured: q.featured,
      });
      return c.json(
        { data: result.items, meta: { count: result.items.length, categories: result.categories, checkedFor: result.checkedFor, kitchenAllergenStatement: result.kitchenAllergenStatement } },
        200,
      );
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/menu/categories", tags: ["Menu"], summary: "Menu categories", responses: { 200: jsonContent(z.object({ data: z.array(MenuCategorySchema) }), "Categories") } }),
    async (c) => c.json({ data: (await listMenu(c.get("now"), {})).categories }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/menu/search",
      tags: ["Menu"],
      summary: "Find dishes from free text (names, transliterations, ingredients, descriptions)",
      description: "Example: `q=rice meat dried lemon` → Lamb Machboos. Handles majboos/machbous/kabsa, lugaimat, harris, etc.",
      request: { query: z.object({ q: z.string().min(1).max(200).openapi({ example: "rice meat dried lemon" }), limit: z.coerce.number().int().min(1).max(20).optional() }) },
      responses: {
        200: jsonContent(z.object({ data: z.array(z.object({ score: z.number(), matchedTerms: z.array(z.string()), item: MenuItemSummarySchema })) }), "Ranked matches"),
        ...errorResponses(400),
      },
    }),
    async (c) => {
      const q = c.req.valid("query");
      return c.json({ data: await searchMenu(q.q, c.get("now"), q.limit ?? 5) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/menu/specials",
      tags: ["Menu"],
      summary: "Daily, weekly and limited-time specials for a date",
      request: { query: z.object({ date: LocalDateSchema.optional() }) },
      responses: {
        200: jsonContent(
          envelope(
            z
              .object({
                date: LocalDateSchema,
                today: z.array(MenuItemSummarySchema).openapi({ description: "Specials served on the date (check availability for ordering)" }),
                notToday: z.array(MenuItemSummarySchema),
                weeklySchedule: z.array(z.object({ id: z.string(), name: z.string(), days: z.array(z.number().int()), note: z.string() })),
              })
              .openapi("Specials"),
          ),
          "Specials",
        ),
        ...errorResponses(400),
      },
    }),
    async (c) => c.json({ data: await listSpecials(c.get("now"), c.req.valid("query").date) }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/menu/feeding-suggestions",
      tags: ["Menu"],
      summary: "Cheapest combinations of available main dishes to feed N people",
      request: {
        query: z.object({
          guests: z.coerce.number().int().min(1).max(250).openapi({ example: 15 }),
          date: LocalDateSchema.optional(),
          time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          mode: FulfilmentModeSchema.optional(),
        }),
      },
      responses: {
        200: jsonContent(
          envelope(
            z
              .object({
                guests: z.number().int(),
                date: z.string(),
                mode: z.string(),
                options: z.array(
                  z.object({
                    total: MoneySchema,
                    perPerson: MoneySchema,
                    servings: z.number().int(),
                    kitchenPortions: z.number().int(),
                    requiresBulkOrder: z.boolean(),
                    lines: z.array(z.object({ itemId: z.string(), name: z.string(), quantity: z.number().int(), servesPeople: z.number().int(), lineTotal: MoneySchema })),
                  }),
                ),
                notes: z.array(z.string()),
              })
              .openapi("FeedingSuggestions"),
          ),
          "Suggestions",
        ),
        ...errorResponses(400),
      },
    }),
    async (c) => {
      const q = c.req.valid("query");
      return c.json({ data: await feedingSuggestions(c.get("now"), q.guests, { date: q.date, time: q.time, mode: q.mode }) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/menu/items/{id}",
      tags: ["Menu"],
      summary: "Full dish details: ingredients with quantities, sauces, allergens (with sources), customisations, rules, Q&A",
      request: { params: IdParam, query: AvailabilityQuerySchema },
      responses: { 200: jsonContent(envelope(MenuItemDetailSchema), "Dish"), ...errorResponses(400, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const q = c.req.valid("query");
      return c.json({ data: await getMenuItem(id, c.get("now"), q) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/menu/items/{id}/availability",
      tags: ["Menu"],
      summary: "Is a dish available on a date/time for a fulfilment mode?",
      description:
        "Evaluates every rule (weekday, time window, date range, special period, order type, notice, pre-order opening, minimum quantity, sold out, daily limit) in Dubai time. Without `time`, checks the dish's first serving time that day. Returns reasons, `nextAvailable` and orderable alternatives.",
      request: { params: IdParam, query: AvailabilityQuerySchema },
      responses: {
        200: jsonContent(
          envelope(
            z
              .object({
                item: z.object({ id: z.string(), slug: z.string(), name: z.string(), kind: z.string(), availabilityNote: z.string() }),
                availability: ItemAvailabilitySchema,
                rules: z.array(AvailabilityRuleSchema),
                alternatives: z.array(AlternativeSchema),
              })
              .openapi("ItemAvailabilityResponse"),
          ),
          "Availability (orderable may be false — that is not an error)",
        ),
        ...errorResponses(400, 404),
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json({ data: await getItemAvailability(id, c.get("now"), c.req.valid("query")) }, 200);
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/ingredients", tags: ["Menu"], summary: "All ingredients with allergens and where they are used", responses: { 200: jsonContent(z.object({ data: z.array(IngredientSchema) }), "Ingredients") } }),
    async (c) => c.json({ data: await listIngredients() }, 200),
  );

  app.openapi(
    createRoute({ method: "get", path: "/ingredients/{id}", tags: ["Menu"], summary: "One ingredient", request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "ing_loomi" }) }) }, responses: { 200: jsonContent(envelope(IngredientSchema), "Ingredient"), ...errorResponses(404) } }),
    async (c) => c.json({ data: await getIngredient(c.req.valid("param").id) }, 200),
  );

  app.openapi(
    createRoute({ method: "get", path: "/sauces", tags: ["Menu"], summary: "All sauces, dips, marinades, spice blends, toppings and syrups with full composition", responses: { 200: jsonContent(z.object({ data: z.array(SauceSchema) }), "Sauces") } }),
    async (c) => c.json({ data: await listSauces() }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/sauces/{id}",
      tags: ["Menu"],
      summary: "One sauce / named preparation (id or slug)",
      request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "sauce-no-7" }) }) },
      responses: { 200: jsonContent(envelope(SauceSchema), "Sauce"), ...errorResponses(404) },
    }),
    async (c) => c.json({ data: await getSauce(c.req.valid("param").id) }, 200),
  );

  void money;
}
