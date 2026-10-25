import { z } from "@hono/zod-openapi";
import { IsoDateTimeSchema, LocalDateSchema, LocalTimeSchema, MoneySchema } from "./common";
import { DeliveryAddressSchema, OrderLineInputSchema, OrderTotalsSchema, QuoteLineSchema } from "./orders";
import { CustomerSchema } from "./reservations";

export const BulkQuoteRequestSchema = z
  .object({
    items: z.array(OrderLineInputSchema).min(1).max(30),
    fulfilment: z.object({
      type: z.enum(["pickup", "delivery"]),
      date: LocalDateSchema,
      time: LocalTimeSchema,
    }),
    deliveryArea: z.string().trim().max(80).optional().openapi({ description: "Required for delivery (area name in Dubai)", example: "Business Bay" }),
    guestCount: z.number().int().min(1).max(2000).optional().openapi({ example: 40 }),
    eventType: z.enum(["office_lunch", "family_gathering", "wedding", "religious_occasion", "corporate_event", "other"]).optional(),
  })
  .openapi("BulkQuoteRequest");

export const BulkIssueSchema = z
  .object({ code: z.string(), message: z.string(), itemId: z.string().nullable(), blocking: z.boolean().openapi({ description: "true = cannot be solved by choosing another date" }) })
  .openapi("BulkIssue");

export const BulkQuoteSchema = z
  .object({
    quoteId: z.string().openapi({ example: "QTE-310552" }),
    status: z.enum(["feasible", "needs_changes", "not_possible"]).openapi({
      description: "feasible = can be ordered as requested; needs_changes = possible on another date/time (see alternatives); not_possible = exceeds limits, escalate",
    }),
    feasible: z.boolean(),
    issues: z.array(BulkIssueSchema),
    lines: z.array(QuoteLineSchema),
    portions: z.number().int(),
    guestCount: z.number().int().nullable(),
    totals: OrderTotalsSchema,
    leadTime: z.object({
      requiredHours: z.number().int(),
      availableHours: z.number().int(),
      earliestFeasibleAt: IsoDateTimeSchema.nullable(),
    }),
    capacity: z.object({ dailyCapacityPortions: z.number().int(), alreadyCommitted: z.number().int(), remaining: z.number().int(), requested: z.number().int() }),
    fulfilment: z.object({ type: z.enum(["pickup", "delivery"]), date: LocalDateSchema, time: LocalTimeSchema, at: IsoDateTimeSchema, window: z.string() }),
    delivery: z.object({ area: z.string(), zone: z.string(), fee: MoneySchema, minimumOrder: MoneySchema }).nullable(),
    alternatives: z.array(z.object({ date: LocalDateSchema, time: LocalTimeSchema, at: IsoDateTimeSchema })),
    validUntil: IsoDateTimeSchema,
    nextSteps: z.array(z.string()),
    escalation: z.object({ reason: z.string(), contact: z.string() }).nullable(),
  })
  .openapi("BulkQuote");

export const CreateBulkOrderSchema = z
  .object({
    quoteId: z.string().openapi({ example: "QTE-310552" }),
    customer: CustomerSchema,
    companyName: z.string().trim().max(120).optional(),
    deliveryAddress: DeliveryAddressSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .openapi("CreateBulkOrderRequest");
