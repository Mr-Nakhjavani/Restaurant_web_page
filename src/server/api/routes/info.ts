import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "../../db";
import { envelope, errorResponses, jsonContent, LocalDateSchema, MoneySchema } from "../../contracts/common";
import { checkDeliveryArea, getDeliveryZones, getHours, getLocation, getPolicies, getRestaurant, getTransportation } from "../../services/restaurant-service";
import type { AppEnv } from "../types";
import { API_VERSION } from "../version";
import { readLimit } from "./shared";

const Loose = z.record(z.string(), z.any());

const RestaurantSchema = z
  .object({
    id: z.string(),
    name: z.string().openapi({ example: "Bayt Al Ghaf" }),
    arabicName: z.string().openapi({ example: "بيت الغاف" }),
    tagline: z.string(),
    meaning: z.string(),
    description: z.string(),
    cuisine: z.array(z.string()),
    established: z.number().int(),
    fictional: z.literal(true),
    fictionalNotice: z.string(),
    address: Loose,
    coordinates: Loose,
    contact: Loose,
    capacity: Loose,
    seatingAreas: z.array(z.object({ id: z.string(), label: z.string(), tables: z.number().int(), seats: z.number().int() })),
    facilities: z.array(z.string()),
    houseRules: z.record(z.string(), z.string()),
    paymentMethodsAccepted: z.array(z.string()),
    paymentMethodsNotAccepted: z.array(z.string()),
    announcement: z.string().nullable(),
    timezone: z.string(),
    currency: z.string(),
    pricesIncludeVat: z.boolean(),
    vatRatePercent: z.number(),
    links: z.record(z.string(), z.string()),
    settingsUpdatedAt: z.string().nullable(),
  })
  .openapi("Restaurant");

const DayHoursSchema = z
  .object({
    date: LocalDateSchema,
    weekday: z.string(),
    isOpen: z.boolean(),
    opensAt: z.string().nullable(),
    closesAt: z.string().nullable(),
    kitchenLastOrderAt: z.string().nullable(),
    windows: z.object({ dining: z.array(z.object({ start: z.string(), end: z.string() })), orders: z.array(z.object({ start: z.string(), end: z.string() })) }),
    hoursSource: z.enum(["weekly", "special_period"]),
    specialPeriods: z.array(Loose),
    closures: z.array(Loose),
    notes: z.array(z.string()),
  })
  .openapi("DayHours");

const HoursSchema = z
  .object({
    timezone: z.string(),
    now: z.object({
      localDate: z.string(),
      localTime: z.string(),
      isOpen: z.boolean(),
      kitchenOpen: z.boolean(),
      closesAt: z.string().nullable(),
      kitchenLastOrderAt: z.string().nullable(),
      nextOpening: z.object({ date: z.string(), time: z.string() }).nullable(),
    }),
    regularWeek: z.array(Loose),
    breakfast: z.object({ start: z.string(), end: z.string() }),
    delivery: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
    kitchenLastOrderMinutesBeforeClose: z.number().int(),
    days: z.array(DayHoursSchema),
    specialPeriods: z.array(Loose),
    closures: z.array(Loose),
  })
  .openapi("Hours");

const DeliveryCheckSchema = z
  .object({
    area: z.string(),
    served: z.boolean(),
    regularDelivery: z.boolean(),
    cateringDelivery: z.boolean(),
    zone: z.object({ id: z.string(), name: z.string(), fee: MoneySchema, minimumOrder: MoneySchema, freeDeliveryAbove: MoneySchema.nullable(), driveMinutes: z.number().int() }).nullable(),
    message: z.string(),
    servedAreas: z.array(z.string()),
  })
  .openapi("DeliveryCheck");

export function registerInfoRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/restaurant/*", readLimit);
  app.use("/restaurant", readLimit);
  app.use("/delivery/*", readLimit);

  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      tags: ["System"],
      summary: "Health check (API + database)",
      responses: {
        200: jsonContent(z.object({ status: z.string(), database: z.string(), version: z.string(), time: z.string() }).openapi("Health"), "Healthy"),
        503: jsonContent(z.object({ status: z.string(), database: z.string(), version: z.string(), time: z.string() }), "Database unavailable"),
      },
    }),
    async (c) => {
      let database = "ok";
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        database = "unavailable";
      }
      const body = { status: database === "ok" ? "ok" : "degraded", database, version: API_VERSION, time: new Date().toISOString() };
      return database === "ok" ? c.json(body, 200) : c.json(body, 503);
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/restaurant", tags: ["Restaurant"], summary: "Restaurant identity, address, contact, facilities and house rules", responses: { 200: jsonContent(envelope(RestaurantSchema), "Restaurant profile") } }),
    async (c) => c.json({ data: await getRestaurant() }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/restaurant/hours",
      tags: ["Restaurant"],
      summary: "Opening hours for a date range, including Ramadan/holiday overrides and closures",
      description: "Returns whether the restaurant is open now, the regular week, and the exact hours for `days` dates starting at `date` (default today, Dubai time).",
      request: { query: z.object({ date: LocalDateSchema.optional(), days: z.coerce.number().int().min(1).max(31).optional().openapi({ example: 7 }) }) },
      responses: { 200: jsonContent(envelope(HoursSchema), "Hours"), ...errorResponses(400) },
    }),
    async (c) => {
      const q = c.req.valid("query");
      return c.json({ data: await getHours(c.get("now"), q.date, q.days ?? 7) }, 200);
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/restaurant/location", tags: ["Restaurant"], summary: "Address, coordinates, entrance and landmarks", responses: { 200: jsonContent(envelope(Loose.openapi("Location")), "Location") } }),
    async (c) => c.json({ data: await getLocation() }, 200),
  );

  app.openapi(
    createRoute({ method: "get", path: "/restaurant/transportation", tags: ["Restaurant"], summary: "Directions by car, taxi, metro, bus, abra and on foot; parking; accessibility", responses: { 200: jsonContent(envelope(Loose.openapi("Transportation")), "Transportation") } }),
    async (c) => c.json({ data: await getTransportation() }, 200),
  );

  app.openapi(
    createRoute({ method: "get", path: "/restaurant/policies", tags: ["Restaurant"], summary: "Structured operating policies with the live numeric limits", responses: { 200: jsonContent(envelope(Loose.openapi("Policies")), "Policies") } }),
    async (c) => c.json({ data: await getPolicies() }, 200),
  );

  app.openapi(
    createRoute({ method: "get", path: "/delivery/zones", tags: ["Restaurant"], summary: "Delivery zones, fees and minimum orders", responses: { 200: jsonContent(envelope(Loose.openapi("DeliveryZones")), "Delivery zones") } }),
    async (c) => c.json({ data: await getDeliveryZones() }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/delivery/check",
      tags: ["Restaurant"],
      summary: "Check whether an area is served for delivery",
      request: { query: z.object({ area: z.string().min(1).max(80).openapi({ example: "Al Karama" }) }) },
      responses: { 200: jsonContent(envelope(DeliveryCheckSchema), "Result (served may be false)"), ...errorResponses(400) },
    }),
    async (c) => c.json({ data: await checkDeliveryArea(c.req.valid("query").area) }, 200),
  );
}
