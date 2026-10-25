import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { envelope, errorResponses, IdempotencyHeaderSchema, jsonContent, VerificationHeadersSchema } from "../../contracts/common";
import {
  CancelSchema,
  CreateReservationSchema,
  ReservationAvailabilityQuerySchema,
  ReservationAvailabilitySchema,
  ReservationCreatedSchema,
  ReservationSchema,
  UpdateReservationSchema,
} from "../../contracts/reservations";
import { cancelReservation, createReservation, getReservation, reservationAvailability, updateReservation } from "../../services/reservation-service";
import { withIdempotency } from "../middleware/idempotency";
import type { AppEnv } from "../types";
import { lookupLimit, OPTIONAL_KEY, readLimit, SECURED_CUSTOMER, verificationFrom, writeLimit } from "./shared";

const RefParam = z.object({ reference: z.string().min(6).max(20).openapi({ param: { name: "reference", in: "path" }, example: "RES-482913" }) });

export function registerReservationRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/reservations/availability", readLimit);

  app.openapi(
    createRoute({
      method: "get",
      path: "/reservations/availability",
      tags: ["Reservations"],
      summary: "Bookable times for a date and party size (optionally a preferred time and seating area)",
      description: "Returns every slot with the areas that still have a table, the status of the requested time, the nearest alternatives and other dates if the day is full. Read-only; nothing is held.",
      request: { query: ReservationAvailabilityQuerySchema },
      responses: { 200: jsonContent(envelope(ReservationAvailabilitySchema), "Availability"), ...errorResponses(400) },
    }),
    async (c) => {
      const q = c.req.valid("query");
      return c.json({ data: await reservationAvailability(q, c.get("now")) }, 200);
    },
  );

  app.use("/reservations", async (c, next) => (c.req.method === "POST" ? writeLimit(c, next) : next()));
  app.openapi(
    createRoute({
      method: "post",
      path: "/reservations",
      tags: ["Reservations"],
      summary: "Create a reservation",
      description:
        "Allocates a table atomically (per-date lock plus a database exclusion constraint, so two callers can never get the same table). Status is `confirmed`, or `pending_confirmation` for groups above the auto-confirm size. Errors include alternatives.",
      security: OPTIONAL_KEY,
      request: { headers: IdempotencyHeaderSchema, body: { content: { "application/json": { schema: CreateReservationSchema } }, required: true } },
      responses: {
        201: jsonContent(envelope(ReservationCreatedSchema), "Reservation created"),
        ...errorResponses(400, 409, 422, 429),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      return withIdempotency(c, "POST /reservations", body, async () => ({
        status: 201,
        body: { data: await createReservation(body, c.get("principal"), c.get("now")) },
      })) as never;
    },
  );

  app.use("/reservations/:reference", lookupLimit);
  app.use("/reservations/:reference/*", lookupLimit);
  app.openapi(
    createRoute({
      method: "get",
      path: "/reservations/{reference}",
      tags: ["Reservations"],
      summary: "Get a reservation (requires verification)",
      security: SECURED_CUSTOMER,
      request: { params: RefParam, headers: VerificationHeadersSchema },
      responses: { 200: jsonContent(envelope(ReservationSchema), "Reservation"), ...errorResponses(401, 404, 429) },
    }),
    async (c) => c.json({ data: await getReservation(c.req.valid("param").reference, c.get("principal"), verificationFrom(c), c.get("now")) }, 200),
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/reservations/{reference}",
      tags: ["Reservations"],
      summary: "Change a reservation (date, time, party size, area, requests)",
      description: "Allowed until the change cut-off (2 hours before). Date/time/size/area changes are re-validated and a table re-allocated atomically; if impossible the original booking is unchanged.",
      security: SECURED_CUSTOMER,
      request: { params: RefParam, headers: VerificationHeadersSchema, body: { content: { "application/json": { schema: UpdateReservationSchema } }, required: true } },
      responses: {
        200: jsonContent(envelope(z.object({ reservation: ReservationSchema, message: z.string() })), "Updated"),
        ...errorResponses(400, 401, 404, 409, 422, 429),
      },
    }),
    async (c) => c.json({ data: await updateReservation(c.req.valid("param").reference, c.req.valid("json"), c.get("principal"), verificationFrom(c), c.get("now")) }, 200),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/reservations/{reference}/cancel",
      tags: ["Reservations"],
      summary: "Cancel a reservation",
      security: SECURED_CUSTOMER,
      request: { params: RefParam, headers: VerificationHeadersSchema, body: { content: { "application/json": { schema: CancelSchema } }, required: false } },
      responses: {
        200: jsonContent(envelope(z.object({ reservation: ReservationSchema, lateCancellation: z.boolean(), message: z.string() })), "Cancelled"),
        ...errorResponses(401, 404, 409, 422, 429),
      },
    }),
    async (c) => {
      let reason: string | undefined;
      try {
        reason = (c.req.valid("json") as { reason?: string } | undefined)?.reason;
      } catch {
        reason = undefined;
      }
      return c.json({ data: await cancelReservation(c.req.valid("param").reference, reason, c.get("principal"), verificationFrom(c), c.get("now")) }, 200);
    },
  );
}
