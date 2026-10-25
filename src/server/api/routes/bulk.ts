import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { envelope, errorResponses, IdempotencyHeaderSchema, jsonContent } from "../../contracts/common";
import { BulkQuoteRequestSchema, BulkQuoteSchema, CreateBulkOrderSchema } from "../../contracts/bulk";
import { OrderCreatedSchema } from "../../contracts/orders";
import { createBulkOrder, getBulkQuote, quoteBulkOrder } from "../../services/bulk-service";
import { withIdempotency } from "../middleware/idempotency";
import type { AppEnv } from "../types";
import { OPTIONAL_KEY, readLimit, writeLimit } from "./shared";

export function registerBulkRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/bulk-orders/quotes", writeLimit);
  app.openapi(
    createRoute({
      method: "post",
      path: "/bulk-orders/quotes",
      tags: ["Catering"],
      summary: "Feasibility check and price quote for a catering / large order",
      description:
        "Considers quantities, per-dish daily maxima, notice tiers, daily catering capacity, fulfilment hours, delivery zone and volume discounts. Returns `status` feasible | needs_changes | not_possible with issues, alternatives and escalation details. The quote is stored for 48 hours.",
      security: OPTIONAL_KEY,
      request: { body: { content: { "application/json": { schema: BulkQuoteRequestSchema } }, required: true } },
      responses: { 200: jsonContent(envelope(BulkQuoteSchema), "Quote"), ...errorResponses(400, 429) },
    }),
    async (c) => c.json({ data: await quoteBulkOrder(c.req.valid("json"), c.get("principal"), c.get("now")) }, 200),
  );

  app.use("/bulk-orders/quotes/:quoteId", readLimit);
  app.openapi(
    createRoute({
      method: "get",
      path: "/bulk-orders/quotes/{quoteId}",
      tags: ["Catering"],
      summary: "Retrieve a stored catering quote",
      request: { params: z.object({ quoteId: z.string().openapi({ param: { name: "quoteId", in: "path" }, example: "QTE-310552" }) }) },
      responses: { 200: jsonContent(envelope(BulkQuoteSchema), "Quote"), ...errorResponses(404) },
    }),
    async (c) => c.json({ data: await getBulkQuote(c.req.valid("param").quoteId) }, 200),
  );

  app.use("/bulk-orders", writeLimit);
  app.openapi(
    createRoute({
      method: "post",
      path: "/bulk-orders",
      tags: ["Catering"],
      summary: "Place a catering order from a feasible quote",
      description: "Capacity is re-checked under a lock; the price is locked to the quote. The order is always created as `pending_confirmation` — the catering team confirms by phone.",
      security: OPTIONAL_KEY,
      request: { headers: IdempotencyHeaderSchema, body: { content: { "application/json": { schema: CreateBulkOrderSchema } }, required: true } },
      responses: { 201: jsonContent(envelope(OrderCreatedSchema), "Catering order received (pending confirmation)"), ...errorResponses(400, 404, 409, 422, 429) },
    }),
    async (c) => {
      const body = c.req.valid("json");
      return withIdempotency(c, "POST /bulk-orders", body, async () => ({ status: 201, body: { data: await createBulkOrder(body, c.get("principal"), c.get("now")) } })) as never;
    },
  );
}
