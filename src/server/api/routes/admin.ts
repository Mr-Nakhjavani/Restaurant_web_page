import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { ORDER_STATUSES, RESERVATION_STATUSES } from "@/domain/status";
import { SPECIAL_PERIOD_TYPES } from "@/domain/types";
import { toLocalDate } from "@/domain/time";
import { envelope, errorResponses, jsonContent, LocalDateSchema, LocalTimeSchema, MoneySchema, PaginationQuerySchema } from "../../contracts/common";
import { OrderSchema } from "../../contracts/orders";
import { ReservationSchema } from "../../contracts/reservations";
import { getConfig } from "../../config";
import { ApiError } from "../../errors";
import { API_KEY_SCOPES } from "../../auth/api-keys";
import { hasCapability, requireCapability } from "../../auth/principal";
import { clearSessionCookie, sessionCookie } from "../../auth/session";
import * as admin from "../../services/admin-service";
import { listOrders, removeOrderLine, transitionOrder } from "../../services/order-service";
import { listReservations, transitionReservation } from "../../services/reservation-service";
import type { AppEnv } from "../types";
import { loginLimit, STAFF_ONLY } from "./shared";

const Loose = z.record(z.string(), z.any());
const secure = () => getConfig().APP_BASE_URL.startsWith("https://");
const staff = (c: Context<AppEnv>) => requireCapability(c.get("principal"), "staff");
const adminOnly = (c: Context<AppEnv>) => requireCapability(c.get("principal"), "admin");

const AdminMenuItemSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    arabicName: z.string(),
    categoryId: z.string(),
    category: z.string(),
    kind: z.string(),
    price: MoneySchema,
    availabilityStatus: z.enum(["available", "sold_out", "paused"]),
    soldOutUntil: z.string().nullable(),
    isVisible: z.boolean(),
    featured: z.boolean(),
    dailyLimit: z.number().int().nullable(),
    orderedToday: z.number().int(),
    prepTimeMinutes: z.number().int(),
    shortDescription: z.string(),
    availabilityNote: z.string(),
    image: z.string(),
    updatedAt: z.string().nullable(),
  })
  .openapi("AdminMenuItem");

const PeriodInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(SPECIAL_PERIOD_TYPES),
  name: z.string().min(2).max(120),
  startDate: LocalDateSchema,
  endDate: LocalDateSchema,
  provisional: z.boolean().optional(),
  notes: z.string().max(500).optional(),
  hoursOverride: z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) }).nullable().optional(),
});

const ClosureInputSchema = z.object({
  date: LocalDateSchema,
  startTime: LocalTimeSchema.nullable().optional(),
  endTime: z.string().regex(/^(\d{2}:\d{2}|24:00)$/).nullable().optional(),
  scope: z.enum(["all", "reservations", "orders"]),
  reason: z.string().min(2).max(200),
  publicNote: z.string().min(2).max(400),
});

const listMeta = (page: number, pageSize: number, total: number) => ({ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });

export function registerAdminRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/admin/auth/login", loginLimit);

  app.openapi(
    createRoute({
      method: "post",
      path: "/admin/auth/login",
      tags: ["Admin"],
      summary: "Log in to the back office (sets an HttpOnly session cookie)",
      request: { body: { content: { "application/json": { schema: z.object({ email: z.string().email(), password: z.string().min(1).max(200) }) } }, required: true } },
      responses: { 200: jsonContent(envelope(z.object({ user: z.object({ id: z.string(), email: z.string(), name: z.string(), role: z.string() }) })), "Logged in"), ...errorResponses(400, 401, 429) },
    }),
    async (c) => {
      const { email, password } = c.req.valid("json");
      const { token, user } = await admin.login(email, password);
      c.header("Set-Cookie", sessionCookie(token, secure()));
      return c.json({ data: { user } }, 200);
    },
  );

  app.openapi(
    createRoute({ method: "post", path: "/admin/auth/logout", tags: ["Admin"], summary: "Log out", responses: { 200: jsonContent(envelope(z.object({ loggedOut: z.boolean() })), "Logged out") } }),
    async (c) => {
      c.header("Set-Cookie", clearSessionCookie(secure()));
      return c.json({ data: { loggedOut: true } }, 200);
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/admin/auth/me", tags: ["Admin"], summary: "Current staff identity", security: STAFF_ONLY, responses: { 200: jsonContent(envelope(Loose), "Identity"), ...errorResponses(401, 403) } }),
    async (c) => {
      staff(c);
      const p = c.get("principal");
      return c.json({ data: { ...p, isAdmin: hasCapability(p, "admin") } }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/admin/dashboard",
      tags: ["Admin"],
      summary: "Today's counts and items needing attention",
      security: STAFF_ONLY,
      request: { query: z.object({ date: LocalDateSchema.optional() }) },
      responses: { 200: jsonContent(envelope(Loose.openapi("Dashboard")), "Dashboard"), ...errorResponses(401, 403) },
    }),
    async (c) => {
      staff(c);
      return c.json({ data: await admin.dashboard(c.req.valid("query").date ?? toLocalDate(c.get("now"))) }, 200);
    },
  );

  // --- orders -----------------------------------------------------------
  app.openapi(
    createRoute({
      method: "get",
      path: "/admin/orders",
      tags: ["Admin"],
      summary: "List orders",
      security: STAFF_ONLY,
      request: { query: PaginationQuerySchema.extend({ date: LocalDateSchema.optional(), status: z.enum(ORDER_STATUSES).optional(), kind: z.enum(["regular", "bulk"]).optional(), q: z.string().max(80).optional() }) },
      responses: { 200: jsonContent(z.object({ data: z.array(OrderSchema), meta: Loose }), "Orders"), ...errorResponses(401, 403) },
    }),
    async (c) => {
      staff(c);
      const q = c.req.valid("query");
      const r = await listOrders(q, c.get("now"));
      return c.json({ data: r.items, meta: listMeta(q.page, q.pageSize, r.total) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/admin/orders/{number}/status",
      tags: ["Admin"],
      summary: "Move an order to a new status (state machine enforced)",
      security: STAFF_ONLY,
      request: {
        params: z.object({ number: z.string().openapi({ param: { name: "number", in: "path" } }) }),
        body: { content: { "application/json": { schema: z.object({ status: z.enum(ORDER_STATUSES), note: z.string().max(300).optional() }) } }, required: true },
      },
      responses: { 200: jsonContent(envelope(OrderSchema), "Updated"), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      staff(c);
      const { status, note } = c.req.valid("json");
      return c.json({ data: await transitionOrder(c.req.valid("param").number, status, note, c.get("principal"), c.get("now")) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/admin/orders/{number}/lines/{lineId}/remove",
      tags: ["Admin"],
      summary: "Remove a line that became unavailable after ordering (re-totals the order)",
      security: STAFF_ONLY,
      request: {
        params: z.object({ number: z.string().openapi({ param: { name: "number", in: "path" } }), lineId: z.string().openapi({ param: { name: "lineId", in: "path" } }) }),
        body: { content: { "application/json": { schema: z.object({ reason: z.string().min(2).max(300) }) } }, required: true },
      },
      responses: { 200: jsonContent(envelope(OrderSchema), "Updated"), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      staff(c);
      const { number, lineId } = c.req.valid("param");
      return c.json({ data: await removeOrderLine(number, lineId, c.req.valid("json").reason, c.get("principal"), c.get("now")) }, 200);
    },
  );

  // --- reservations -----------------------------------------------------
  app.openapi(
    createRoute({
      method: "get",
      path: "/admin/reservations",
      tags: ["Admin"],
      summary: "List reservations",
      security: STAFF_ONLY,
      request: { query: PaginationQuerySchema.extend({ date: LocalDateSchema.optional(), from: LocalDateSchema.optional(), to: LocalDateSchema.optional(), status: z.enum(RESERVATION_STATUSES).optional(), q: z.string().max(80).optional() }) },
      responses: { 200: jsonContent(z.object({ data: z.array(ReservationSchema), meta: Loose }), "Reservations"), ...errorResponses(401, 403) },
    }),
    async (c) => {
      staff(c);
      const q = c.req.valid("query");
      const r = await listReservations(q, c.get("principal"), c.get("now"));
      return c.json({ data: r.items, meta: listMeta(q.page, q.pageSize, r.total) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/admin/reservations/{reference}/status",
      tags: ["Admin"],
      summary: "Confirm, seat, complete, reject, cancel or mark a reservation as no-show",
      security: STAFF_ONLY,
      request: {
        params: z.object({ reference: z.string().openapi({ param: { name: "reference", in: "path" } }) }),
        body: { content: { "application/json": { schema: z.object({ status: z.enum(RESERVATION_STATUSES), note: z.string().max(300).optional() }) } }, required: true },
      },
      responses: { 200: jsonContent(envelope(ReservationSchema), "Updated"), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      staff(c);
      const { status, note } = c.req.valid("json");
      return c.json({ data: await transitionReservation(c.req.valid("param").reference, status, note, c.get("principal"), c.get("now")) }, 200);
    },
  );

  // --- menu ---------------------------------------------------------------
  app.openapi(
    createRoute({ method: "get", path: "/admin/menu/items", tags: ["Admin"], summary: "All menu items with operational state", security: STAFF_ONLY, responses: { 200: jsonContent(z.object({ data: z.array(AdminMenuItemSchema) }), "Items"), ...errorResponses(401, 403) } }),
    async (c) => {
      staff(c);
      return c.json({ data: await admin.adminMenuItems(c.get("now")) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/admin/menu/items/{id}",
      tags: ["Admin"],
      summary: "Update price, availability (sold out / paused), visibility, texts or limits",
      description: "Staff may change availabilityStatus/soldOutUntil; other fields need the admin role. `sold_out` defaults to the end of today (Dubai).",
      security: STAFF_ONLY,
      request: {
        params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) }),
        body: {
          content: {
            "application/json": {
              schema: z
                .object({
                  priceFils: z.number().int().min(100).max(1_000_000).optional(),
                  availabilityStatus: z.enum(["available", "sold_out", "paused"]).optional(),
                  soldOutUntil: z.string().nullable().optional(),
                  isVisible: z.boolean().optional(),
                  featured: z.boolean().optional(),
                  shortDescription: z.string().min(5).max(200).optional(),
                  description: z.string().min(10).max(2000).optional(),
                  availabilityNote: z.string().min(5).max(400).optional(),
                  dailyLimit: z.number().int().min(0).max(1000).nullable().optional(),
                  prepTimeMinutes: z.number().int().min(1).max(600).optional(),
                })
                .openapi("AdminMenuItemPatch"),
            },
          },
          required: true,
        },
      },
      responses: { 200: jsonContent(envelope(AdminMenuItemSchema), "Updated"), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      staff(c);
      const patch = c.req.valid("json");
      const nonAvailability = Object.keys(patch).filter((k) => k !== "availabilityStatus" && k !== "soldOutUntil");
      if (nonAvailability.length && !hasCapability(c.get("principal"), "admin")) {
        throw new ApiError("FORBIDDEN", `Changing ${nonAvailability.join(", ")} requires the admin role.`);
      }
      return c.json({ data: await admin.updateMenuItem(c.req.valid("param").id, patch, c.get("principal"), c.get("now")) }, 200);
    },
  );

  // --- settings & calendar ----------------------------------------------
  app.openapi(
    createRoute({ method: "get", path: "/admin/settings", tags: ["Admin"], summary: "Operating settings", security: STAFF_ONLY, responses: { 200: jsonContent(envelope(Loose.openapi("SettingsEnvelope")), "Settings"), ...errorResponses(401, 403) } }),
    async (c) => {
      staff(c);
      return c.json({ data: await admin.getSettings() }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/admin/settings",
      tags: ["Admin"],
      summary: "Update settings (deep-merged, fully validated; admin only)",
      security: STAFF_ONLY,
      request: { body: { content: { "application/json": { schema: Loose } }, required: true } },
      responses: { 200: jsonContent(envelope(Loose), "Updated settings"), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.updateSettings(c.req.valid("json"), c.get("principal")) }, 200);
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/admin/special-periods", tags: ["Admin"], summary: "Special periods (Ramadan, National Day, seasons)", security: STAFF_ONLY, responses: { 200: jsonContent(z.object({ data: z.array(Loose) }), "Periods"), ...errorResponses(401, 403) } }),
    async (c) => {
      staff(c);
      return c.json({ data: await admin.listPeriods() }, 200);
    },
  );
  app.openapi(
    createRoute({ method: "post", path: "/admin/special-periods", tags: ["Admin"], summary: "Create a special period (admin)", security: STAFF_ONLY, request: { body: { content: { "application/json": { schema: PeriodInputSchema } }, required: true } }, responses: { 201: jsonContent(envelope(Loose), "Created"), ...errorResponses(400, 401, 403) } }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.upsertPeriod(null, c.req.valid("json"), c.get("principal")) }, 201);
    },
  );
  app.openapi(
    createRoute({
      method: "patch",
      path: "/admin/special-periods/{id}",
      tags: ["Admin"],
      summary: "Update a special period, e.g. confirm Ramadan dates (admin)",
      security: STAFF_ONLY,
      request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) }), body: { content: { "application/json": { schema: PeriodInputSchema } }, required: true } },
      responses: { 200: jsonContent(envelope(Loose), "Updated"), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.upsertPeriod(c.req.valid("param").id, c.req.valid("json"), c.get("principal")) }, 200);
    },
  );
  app.openapi(
    createRoute({ method: "delete", path: "/admin/special-periods/{id}", tags: ["Admin"], summary: "Delete a special period (admin)", security: STAFF_ONLY, request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) }) }, responses: { 200: jsonContent(envelope(Loose), "Deleted"), ...errorResponses(401, 403, 404) } }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.deletePeriod(c.req.valid("param").id, c.get("principal")) }, 200);
    },
  );

  app.openapi(
    createRoute({ method: "get", path: "/admin/closures", tags: ["Admin"], summary: "Closures and blackout periods", security: STAFF_ONLY, responses: { 200: jsonContent(z.object({ data: z.array(Loose) }), "Closures"), ...errorResponses(401, 403) } }),
    async (c) => {
      staff(c);
      return c.json({ data: await admin.listClosures() }, 200);
    },
  );
  app.openapi(
    createRoute({ method: "post", path: "/admin/closures", tags: ["Admin"], summary: "Add a closure / blackout (admin)", security: STAFF_ONLY, request: { body: { content: { "application/json": { schema: ClosureInputSchema } }, required: true } }, responses: { 201: jsonContent(envelope(Loose), "Created"), ...errorResponses(400, 401, 403) } }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.createClosure(c.req.valid("json"), c.get("principal")) }, 201);
    },
  );
  app.openapi(
    createRoute({ method: "delete", path: "/admin/closures/{id}", tags: ["Admin"], summary: "Remove a closure (admin)", security: STAFF_ONLY, request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) }) }, responses: { 200: jsonContent(envelope(Loose), "Deleted"), ...errorResponses(401, 403, 404) } }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.deleteClosure(c.req.valid("param").id, c.get("principal")) }, 200);
    },
  );

  // --- API keys & audit ------------------------------------------------------
  app.openapi(
    createRoute({ method: "get", path: "/admin/api-keys", tags: ["Admin"], summary: "API keys (secrets are never shown again)", security: STAFF_ONLY, responses: { 200: jsonContent(z.object({ data: z.array(Loose) }), "Keys"), ...errorResponses(401, 403) } }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.listApiKeys() }, 200);
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/admin/api-keys",
      tags: ["Admin"],
      summary: "Create an API key (e.g. scope agent for the voice assistant). The key is returned once.",
      security: STAFF_ONLY,
      request: { body: { content: { "application/json": { schema: z.object({ name: z.string().min(2).max(80), scopes: z.array(z.enum(API_KEY_SCOPES)).min(1) }) } }, required: true } },
      responses: { 201: jsonContent(envelope(Loose), "Created"), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      adminOnly(c);
      const { name, scopes } = c.req.valid("json");
      return c.json({ data: await admin.createApiKey(name, scopes, c.get("principal")) }, 201);
    },
  );
  app.openapi(
    createRoute({ method: "delete", path: "/admin/api-keys/{id}", tags: ["Admin"], summary: "Revoke an API key", security: STAFF_ONLY, request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) }) }, responses: { 200: jsonContent(envelope(Loose), "Revoked"), ...errorResponses(401, 403, 404) } }),
    async (c) => {
      adminOnly(c);
      return c.json({ data: await admin.revokeApiKey(c.req.valid("param").id, c.get("principal")) }, 200);
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/admin/audit-log",
      tags: ["Admin"],
      summary: "Audit trail of administrative changes",
      security: STAFF_ONLY,
      request: { query: z.object({ entityType: z.string().optional(), entityId: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).optional() }) },
      responses: { 200: jsonContent(z.object({ data: z.array(Loose) }), "Audit entries"), ...errorResponses(401, 403) },
    }),
    async (c) => {
      adminOnly(c);
      const q = c.req.valid("query");
      return c.json({ data: await admin.auditLog(q.entityType, q.entityId, q.limit ?? 50) }, 200);
    },
  );
}
