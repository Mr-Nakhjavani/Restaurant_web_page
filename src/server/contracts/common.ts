import { z } from "@hono/zod-openapi";
import { ALLERGENS, DIETARY_TAGS, ORDER_TYPES, SEATING_AREAS } from "@/domain/types";
import { ERROR_CATALOG } from "../errors";

export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD (Dubai local date)")
  .openapi({ description: "Local date in Dubai (Asia/Dubai, UTC+04:00), YYYY-MM-DD", example: "2026-10-30" });

export const LocalTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour, Dubai local time)")
  .openapi({ description: "Local time in Dubai, 24-hour HH:mm, on a 15-minute slot", example: "19:30" });

export const IsoDateTimeSchema = z.string().openapi({ description: "ISO-8601 timestamp with the +04:00 Dubai offset", example: "2026-10-30T19:30:00.000+04:00" });

export const MoneySchema = z
  .object({
    amountFils: z.number().int().openapi({ description: "Integer amount in fils (1 AED = 100 fils)", example: 7200 }),
    amount: z.number().openapi({ example: 72 }),
    currency: z.literal("AED"),
    formatted: z.string().openapi({ example: "AED 72" }),
  })
  .openapi("Money");

export const AllergenSchema = z.enum(ALLERGENS).openapi("Allergen");
export const DietaryTagSchema = z.enum(DIETARY_TAGS).openapi("DietaryTag");
export const OrderTypeSchema = z.enum(ORDER_TYPES).openapi("OrderType");
export const SeatingAreaSchema = z.enum(SEATING_AREAS).openapi("SeatingArea");

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(Object.keys(ERROR_CATALOG) as [string, ...string[]]).openapi({ example: "ITEM_UNAVAILABLE" }),
      message: z.string().openapi({ example: "Friday Family Machboos Platter is only available on Fridays; Tuesday 27 October 2026 is a Tuesday." }),
      status: z.number().int().openapi({ example: 422 }),
      category: z.string().openapi({ example: "unavailable_item" }),
      retryable: z.boolean(),
      requestId: z.string().openapi({ example: "req_01HF8Z3K2Y" }),
      details: z.record(z.string(), z.any()).optional(),
    }),
  })
  .openapi("Error");

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).openapi({ example: 25 }),
});

export const PaginationMetaSchema = z
  .object({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int() })
  .openapi("PaginationMeta");

export const envelope = <T extends z.ZodTypeAny>(schema: T) => z.object({ data: schema });
export const listEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ data: z.array(schema), meta: z.record(z.string(), z.any()).optional() });

export const VerificationHeadersSchema = z.object({
  "x-customer-phone": z.string().optional().openapi({ description: "Phone number used for the booking/order (any format). One of X-Customer-Phone or X-Access-Token is required unless the caller has staff access.", example: "+971501234567" }),
  "x-access-token": z.string().optional().openapi({ description: "Access token returned when the record was created.", example: "q3V0n3JmYk9yY2xxV2l0aE1hY2hib29z" }),
});

export const IdempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().min(8).max(128).optional().openapi({ description: "Unique key per logical create request (e.g. a UUID). Retrying with the same key and body returns the original result instead of creating a duplicate.", example: "call-7d2f-order-1" }),
});

export const ReasonSchema = z.object({ code: z.string(), message: z.string() }).openapi("Reason");

export const jsonContent = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

export const errorResponses = (...statuses: number[]) =>
  Object.fromEntries(statuses.map((s) => [s, jsonContent(ErrorSchema, errorDescription(s))])) as Record<number, ReturnType<typeof jsonContent>>;

function errorDescription(status: number): string {
  switch (status) {
    case 400: return "Validation error (VALIDATION_ERROR, INVALID_JSON)";
    case 401: return "Authentication or customer verification required";
    case 403: return "Forbidden — missing scope or role";
    case 404: return "Not found";
    case 409: return "Conflict (slot/table taken, duplicate, invalid state)";
    case 413: return "Payload too large";
    case 422: return "Business rule rejected the request (see error.code and error.details)";
    case 429: return "Rate limited";
    case 500: return "Internal error";
    case 503: return "Service unavailable";
    default: return "Error";
  }
}
