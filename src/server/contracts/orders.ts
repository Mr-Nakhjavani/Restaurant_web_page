import { z } from "@hono/zod-openapi";
import { ORDER_STATUSES } from "@/domain/status";
import { PAYMENT_METHODS } from "@/domain/settings";
import { AllergenSchema, IsoDateTimeSchema, LocalDateSchema, LocalTimeSchema, MoneySchema, OrderTypeSchema } from "./common";
import { CustomerSchema } from "./reservations";
import { ItemAvailabilitySchema } from "./menu";

export const OrderLineInputSchema = z
  .object({
    itemId: z.string().min(1).openapi({ description: "Menu item id (mi_…) or slug", example: "mi_lamb_machboos" }),
    quantity: z.number().int().min(1).max(500).openapi({ example: 2 }),
    options: z.array(z.string()).max(20).optional().openapi({ description: "Selected option ids from the item's customizations. Omitted groups use their defaults.", example: ["hashu_no_raisins"] }),
    notes: z.string().trim().max(200).optional().openapi({ example: "Extra crispy please" }),
  })
  .openapi("OrderLineInput");

export const DeliveryAddressSchema = z
  .object({
    emirate: z.literal("Dubai").default("Dubai").openapi({ description: "We deliver within Dubai only" }),
    area: z.string().trim().min(2).max(80).openapi({ example: "Al Karama" }),
    building: z.string().trim().min(1).max(120).openapi({ description: "Building name/number or villa number", example: "Al Attar Tower" }),
    street: z.string().trim().min(1).max(120).openapi({ example: "Sheikh Khalifa Bin Zayed Street" }),
    unit: z.string().trim().max(40).optional().openapi({ description: "Apartment / office / villa unit", example: "Apt 1204" }),
    floor: z.string().trim().max(20).optional(),
    landmark: z.string().trim().max(120).optional().openapi({ example: "Opposite Karama Park" }),
    makaniNumber: z.string().trim().regex(/^\d{5}\s?\d{5}$/, "Makani numbers have 10 digits").optional(),
    latitude: z.number().min(22).max(27).optional(),
    longitude: z.number().min(51).max(57).optional(),
    instructions: z.string().trim().max(200).optional().openapi({ example: "Call on arrival; security desk on ground floor" }),
  })
  .openapi("DeliveryAddress");

export const FulfilmentInputSchema = z
  .object({
    type: OrderTypeSchema,
    asap: z.boolean().optional().openapi({ description: "Earliest available time. Ignored when date and time are given." }),
    date: LocalDateSchema.optional(),
    time: LocalTimeSchema.optional().openapi({ description: "Pickup time, delivery arrival time, or (dine-in pre-order) the time food should be served" }),
    reservationReference: z.string().optional().openapi({ description: "Required for dine_in_preorder", example: "RES-482913" }),
  })
  .openapi("FulfilmentInput");

export const OrderQuoteRequestSchema = z
  .object({
    items: z.array(OrderLineInputSchema).min(1).max(30),
    fulfilment: FulfilmentInputSchema,
    deliveryAddress: DeliveryAddressSchema.optional(),
    customerPhone: z.string().optional().openapi({ description: "Optional; lets the quote validate dine-in reservation links and delivery phone rules" }),
  })
  .openapi("OrderQuoteRequest");

export const CreateOrderSchema = z
  .object({
    items: z.array(OrderLineInputSchema).min(1).max(30),
    fulfilment: FulfilmentInputSchema,
    deliveryAddress: DeliveryAddressSchema.optional(),
    customer: CustomerSchema,
    recipient: z
      .object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(25).optional() })
      .optional()
      .openapi({ description: "Person collecting or receiving the order, if different from the customer" }),
    specialInstructions: z.string().trim().max(300).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional().openapi({ description: "Defaults to cash/card on collection or delivery. No online card payment in this environment." }),
  })
  .openapi("CreateOrderRequest");

export const UpdateOrderSchema = z
  .object({
    items: z.array(OrderLineInputSchema).min(1).max(30).optional(),
    fulfilment: z.object({ asap: z.boolean().optional(), date: LocalDateSchema.optional(), time: LocalTimeSchema.optional() }).optional(),
    deliveryAddress: DeliveryAddressSchema.optional(),
    recipient: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(25).optional() }).optional(),
    specialInstructions: z.string().trim().max(300).optional(),
  })
  .openapi("UpdateOrderRequest");

export const SlotOptionSchema = z
  .object({ time: LocalTimeSchema, at: IsoDateTimeSchema, readyAt: IsoDateTimeSchema, remainingPortions: z.number().int(), available: z.boolean() })
  .openapi("SlotOption");

export const QuoteIssueSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    lineIndex: z.number().int().nullable(),
    itemId: z.string().nullable(),
    details: z.record(z.string(), z.any()).nullable(),
  })
  .openapi("QuoteIssue");

export const OrderTotalsSchema = z
  .object({
    subtotal: MoneySchema,
    discount: MoneySchema,
    discountPercent: z.number(),
    deliveryFee: MoneySchema,
    total: MoneySchema,
    vatIncluded: MoneySchema.openapi({ description: "5% UAE VAT contained in the total (prices are VAT-inclusive)" }),
    depositRequired: MoneySchema,
  })
  .openapi("OrderTotals");

export const QuoteLineSchema = z
  .object({
    lineIndex: z.number().int(),
    itemId: z.string(),
    name: z.string(),
    quantity: z.number().int(),
    options: z.array(z.object({ groupName: z.string(), optionId: z.string(), name: z.string(), priceDelta: MoneySchema })),
    unitPrice: MoneySchema,
    lineTotal: MoneySchema,
    kitchenPortions: z.number().int(),
    allergens: z.array(AllergenSchema),
    availability: ItemAvailabilitySchema.nullable(),
    alternatives: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string(), price: MoneySchema, reason: z.string() })),
  })
  .openapi("QuoteLine");

export const OrderQuoteSchema = z
  .object({
    valid: z.boolean().openapi({ description: "true when POST /orders with the same body would be accepted right now" }),
    issues: z.array(QuoteIssueSchema),
    lines: z.array(QuoteLineSchema),
    totals: OrderTotalsSchema,
    kitchenPortions: z.number().int(),
    requiresBulkOrder: z.boolean(),
    fulfilment: z.object({
      type: OrderTypeSchema,
      requested: z.object({ asap: z.boolean(), date: LocalDateSchema.nullable(), time: LocalTimeSchema.nullable() }),
      accepted: z.object({ date: LocalDateSchema, time: LocalTimeSchema, at: IsoDateTimeSchema, readyAt: IsoDateTimeSchema }).nullable(),
      leadTimeMinutes: z.number().int(),
      alternatives: z.array(SlotOptionSchema),
      availableSlots: z.array(SlotOptionSchema).openapi({ description: "All slots on the requested (or earliest) date, with availability for this order size" }),
    }),
    delivery: z
      .object({
        zone: z.object({ id: z.string(), name: z.string(), driveMinutes: z.number().int() }).nullable(),
        area: z.string().nullable(),
        fee: MoneySchema,
        minimumOrder: MoneySchema.nullable(),
        freeDeliveryAbove: MoneySchema.nullable(),
      })
      .nullable(),
    paymentMethods: z.array(z.object({ id: z.string(), label: z.string() })),
    requiresManualReview: z.boolean().openapi({ description: "If true the order will be created as pending_confirmation, not confirmed" }),
    notices: z.array(z.string()),
  })
  .openapi("OrderQuote");

export const OrderSchema = z
  .object({
    number: z.string().openapi({ example: "ORD-604215" }),
    kind: z.enum(["regular", "bulk"]),
    status: z.enum(ORDER_STATUSES),
    statusLabel: z.string(),
    statusDescription: z.string(),
    confirmed: z.boolean().openapi({ description: "true once the restaurant has accepted the order (confirmed or later, not cancelled/rejected)" }),
    type: OrderTypeSchema,
    channel: z.string(),
    customer: z.object({ name: z.string(), phone: z.string(), email: z.string().nullable() }),
    recipient: z.object({ name: z.string(), phone: z.string().nullable() }).nullable(),
    items: z.array(
      z.object({
        id: z.string(),
        itemId: z.string(),
        name: z.string(),
        quantity: z.number().int(),
        options: z.array(z.object({ groupName: z.string(), optionId: z.string(), name: z.string(), priceDelta: MoneySchema })),
        unitPrice: MoneySchema,
        lineTotal: MoneySchema,
        allergens: z.array(AllergenSchema),
        notes: z.string().nullable(),
        status: z.enum(["active", "removed"]),
        removedReason: z.string().nullable(),
      }),
    ),
    totals: OrderTotalsSchema,
    payment: z.object({ method: z.string(), methodLabel: z.string(), status: z.string(), note: z.string() }),
    fulfilment: z.object({
      promisedAt: IsoDateTimeSchema,
      date: LocalDateSchema,
      time: LocalTimeSchema,
      readyAt: IsoDateTimeSchema,
      estimatedWindow: z.object({ from: LocalTimeSchema, to: LocalTimeSchema }).nullable(),
      holdUntil: IsoDateTimeSchema.nullable(),
      requestedAsap: z.boolean(),
    }),
    deliveryAddress: DeliveryAddressSchema.nullable(),
    deliveryZone: z.string().nullable(),
    reservationReference: z.string().nullable(),
    specialInstructions: z.string().nullable(),
    allergyNoteFlagged: z.boolean(),
    requiresReview: z.boolean(),
    reviewReason: z.string().nullable(),
    catering: z
      .object({ quoteId: z.string().nullable(), guestCount: z.number().int().nullable(), eventType: z.string().nullable(), companyName: z.string().nullable() })
      .nullable(),
    allowedActions: z.object({
      modify: z.boolean(),
      cancel: z.boolean(),
      modifiableUntil: IsoDateTimeSchema.nullable(),
      cancellableUntil: IsoDateTimeSchema.nullable(),
      reason: z.string().nullable(),
    }),
    history: z.array(z.object({ at: IsoDateTimeSchema, type: z.string(), status: z.string().nullable(), note: z.string().nullable(), actor: z.string() })),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .openapi("Order");

export const OrderCreatedSchema = z
  .object({
    order: OrderSchema,
    accessToken: z.string().openapi({ description: "Secret token for this order (shown once). Use it with X-Access-Token to read or change the order." }),
    message: z.string(),
  })
  .openapi("OrderCreated");

export const OrderStatusSchema = z
  .object({
    number: z.string(),
    status: z.enum(ORDER_STATUSES),
    statusLabel: z.string(),
    statusDescription: z.string(),
    confirmed: z.boolean(),
    type: OrderTypeSchema,
    promisedAt: IsoDateTimeSchema,
    readyAt: IsoDateTimeSchema,
    isFinal: z.boolean(),
    nextStep: z.string(),
    updatedAt: IsoDateTimeSchema,
  })
  .openapi("OrderStatus");
