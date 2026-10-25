import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { envelope, errorResponses, IdempotencyHeaderSchema, jsonContent, VerificationHeadersSchema } from "../../contracts/common";
import { CreateOrderSchema, OrderCreatedSchema, OrderQuoteRequestSchema, OrderQuoteSchema, OrderSchema, OrderStatusSchema, UpdateOrderSchema } from "../../contracts/orders";
import { CancelSchema } from "../../contracts/reservations";
import { cancelOrder, createOrder, getOrder, getOrderStatus, quoteOrder, updateOrder } from "../../services/order-service";
import { withIdempotency } from "../middleware/idempotency";
import type { AppEnv } from "../types";
import { lookupLimit, OPTIONAL_KEY, readLimit, SECURED_CUSTOMER, verificationFrom, writeLimit } from "./shared";

const NumberParam = z.object({ number: z.string().min(6).max(20).openapi({ param: { name: "number", in: "path" }, example: "ORD-604215" }) });

export function registerOrderRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/orders/quote", readLimit);
  app.openapi(
    createRoute({
      method: "post",
      path: "/orders/quote",
      tags: ["Orders"],
      summary: "Price, validate and schedule an order without creating it",
      description:
        "Server-side pricing (options, VAT, delivery fee), per-line availability for the fulfilment time, kitchen capacity, lead time and alternatives. `valid: true` means POST /orders with the same body would succeed now. Use it before reading a total to the customer.",
      security: OPTIONAL_KEY,
      request: { body: { content: { "application/json": { schema: OrderQuoteRequestSchema } }, required: true } },
      responses: { 200: jsonContent(envelope(OrderQuoteSchema), "Quote (may contain issues)"), ...errorResponses(400, 429) },
    }),
    async (c) => c.json({ data: await quoteOrder(c.req.valid("json"), c.get("principal"), c.get("now")) }, 200),
  );

  app.use("/orders", async (c, next) => (c.req.method === "POST" ? writeLimit(c, next) : next()));
  app.openapi(
    createRoute({
      method: "post",
      path: "/orders",
      tags: ["Orders"],
      summary: "Place a pickup, delivery or dine-in pre-order",
      description:
        "Re-validates everything server-side under a lock (prices from the database, availability, capacity). Returns `confirmed`, or `pending_confirmation` when manual review applies (large totals, uncollected-order history). Rejections carry `error.details.issues` and alternatives. Payment is in person; no card data is accepted.",
      security: OPTIONAL_KEY,
      request: { headers: IdempotencyHeaderSchema, body: { content: { "application/json": { schema: CreateOrderSchema } }, required: true } },
      responses: { 201: jsonContent(envelope(OrderCreatedSchema), "Order created"), ...errorResponses(400, 409, 422, 429) },
    }),
    async (c) => {
      const body = c.req.valid("json");
      return withIdempotency(c, "POST /orders", body, async () => ({ status: 201, body: { data: await createOrder(body, c.get("principal"), c.get("now")) } })) as never;
    },
  );

  app.use("/orders/:number", lookupLimit);
  app.use("/orders/:number/*", lookupLimit);
  app.openapi(
    createRoute({
      method: "get",
      path: "/orders/{number}",
      tags: ["Orders"],
      summary: "Get an order (requires verification)",
      security: SECURED_CUSTOMER,
      request: { params: NumberParam, headers: VerificationHeadersSchema },
      responses: { 200: jsonContent(envelope(OrderSchema), "Order"), ...errorResponses(401, 404, 429) },
    }),
    async (c) => c.json({ data: await getOrder(c.req.valid("param").number, c.get("principal"), verificationFrom(c), c.get("now")) }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/orders/{number}/status",
      tags: ["Orders"],
      summary: "Compact order status (requires verification)",
      security: SECURED_CUSTOMER,
      request: { params: NumberParam, headers: VerificationHeadersSchema },
      responses: { 200: jsonContent(envelope(OrderStatusSchema), "Status"), ...errorResponses(401, 404, 429) },
    }),
    async (c) => c.json({ data: await getOrderStatus(c.req.valid("param").number, c.get("principal"), verificationFrom(c), c.get("now")) }, 200),
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/orders/{number}",
      tags: ["Orders"],
      summary: "Change items, time, address or instructions",
      description: "Allowed while pending/confirmed and before the cut-off (30 min before, or preparation start). The whole order is re-validated and re-priced; on failure the order is unchanged (`details.unchanged: true`).",
      security: SECURED_CUSTOMER,
      request: { params: NumberParam, headers: VerificationHeadersSchema, body: { content: { "application/json": { schema: UpdateOrderSchema } }, required: true } },
      responses: { 200: jsonContent(envelope(z.object({ order: OrderSchema, message: z.string() })), "Updated"), ...errorResponses(400, 401, 404, 409, 422, 429) },
    }),
    async (c) => c.json({ data: await updateOrder(c.req.valid("param").number, c.req.valid("json"), c.get("principal"), verificationFrom(c), c.get("now")) }, 200),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/orders/{number}/cancel",
      tags: ["Orders"],
      summary: "Cancel an order",
      security: SECURED_CUSTOMER,
      request: { params: NumberParam, headers: VerificationHeadersSchema, body: { content: { "application/json": { schema: CancelSchema } }, required: false } },
      responses: { 200: jsonContent(envelope(z.object({ order: OrderSchema, message: z.string() })), "Cancelled"), ...errorResponses(401, 404, 409, 422, 429) },
    }),
    async (c) => {
      let reason: string | undefined;
      try {
        reason = (c.req.valid("json") as { reason?: string } | undefined)?.reason;
      } catch {
        reason = undefined;
      }
      return c.json({ data: await cancelOrder(c.req.valid("param").number, reason, c.get("principal"), verificationFrom(c), c.get("now")) }, 200);
    },
  );
}
