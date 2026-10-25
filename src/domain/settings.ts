import { z } from "zod";

/** "HH:mm" in restaurant local time. "24:00" is allowed to express midnight closing. */
export const LocalTimeSchema = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Expected a local time in HH:mm format (00:00–24:00)");

export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a local date in YYYY-MM-DD format");

const DayHoursSchema = z
  .object({ open: LocalTimeSchema, close: LocalTimeSchema })
  .nullable()
  .describe("null means closed all day");

export const DeliveryZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  areas: z.array(z.string()).min(1),
  feeFils: z.number().int().min(0),
  minimumOrderFils: z.number().int().min(0),
  freeDeliveryAboveFils: z.number().int().min(0).nullable(),
  /** Typical door-to-door drive time used to schedule dispatch. */
  driveMinutes: z.number().int().min(5).max(120),
  regularOrders: z.boolean().describe("false = catering/bulk deliveries only"),
});
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;

export const PAYMENT_METHODS = [
  "cash_on_pickup",
  "card_on_pickup",
  "cash_on_delivery",
  "card_on_delivery",
  "pay_at_table",
  "bank_transfer_deposit",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SettingsSchema = z.object({
  timezone: z.literal("Asia/Dubai"),
  currency: z.literal("AED"),
  vatRatePercent: z.number().min(0).max(20),
  pricesIncludeVat: z.boolean(),
  announcement: z.string().max(280).nullable(),
  weeklyHours: z.object({
    "1": DayHoursSchema,
    "2": DayHoursSchema,
    "3": DayHoursSchema,
    "4": DayHoursSchema,
    "5": DayHoursSchema,
    "6": DayHoursSchema,
    "7": DayHoursSchema,
  }),
  breakfast: z.object({ start: LocalTimeSchema, end: LocalTimeSchema }),
  kitchenLastOrderMinutesBeforeClose: z.number().int().min(0).max(120),
  ordering: z.object({
    acceptingOrders: z.boolean(),
    slotMinutes: z.number().int().min(5).max(60),
    minLeadMinutes: z.number().int().min(0).max(240),
    prepBufferMinutes: z.number().int().min(0).max(60),
    firstReadyMinutesAfterOpen: z.number().int().min(0).max(120),
    lastReadyMinutesBeforeClose: z.number().int().min(0).max(120),
    maxAdvanceDays: z.number().int().min(0).max(30),
    slotCapacityPortions: z.number().int().min(1).max(500),
    maxOrdersPerSlot: z.number().int().min(1).max(100),
    maxPortionsPerOrder: z.number().int().min(1).max(100),
    maxQuantityPerLine: z.number().int().min(1).max(100),
    modificationCutoffMinutes: z.number().int().min(0).max(240),
    pickupHoldMinutes: z.number().int().min(0).max(240),
    autoConfirm: z.boolean(),
    manualReviewAboveFils: z.number().int().min(0),
    notCollectedReviewThreshold: z.number().int().min(1).max(10),
    paymentMethods: z.object({
      pickup: z.array(z.enum(PAYMENT_METHODS)),
      delivery: z.array(z.enum(PAYMENT_METHODS)),
      dine_in_preorder: z.array(z.enum(PAYMENT_METHODS)),
    }),
  }),
  delivery: z.object({
    enabled: z.boolean(),
    start: LocalTimeSchema,
    end: LocalTimeSchema,
    emirate: z.literal("Dubai"),
    zones: z.array(DeliveryZoneSchema).min(1),
  }),
  reservations: z.object({
    acceptingReservations: z.boolean(),
    slotMinutes: z.number().int().min(5).max(60),
    minPartySize: z.number().int().min(1),
    maxPartySize: z.number().int().min(1).max(60),
    autoConfirmMaxPartySize: z.number().int().min(1).max(60),
    minNoticeMinutes: z.number().int().min(0).max(1440),
    maxAdvanceDays: z.number().int().min(1).max(365),
    lastSeatingMinutesBeforeClose: z.number().int().min(0).max(240),
    turnoverBufferMinutes: z.number().int().min(0).max(60),
    durations: z
      .array(z.object({ maxPartySize: z.number().int().min(1), minutes: z.number().int().min(30).max(360) }))
      .min(1),
    majlis: z.object({
      minPartySize: z.number().int().min(1),
      minNoticeHours: z.number().int().min(0),
      durationMinutes: z.number().int().min(60).max(360),
      minimumSpendPerPersonFils: z.number().int().min(0),
    }),
    terraceSeason: z.object({
      startMonthDay: z.string().regex(/^\d{2}-\d{2}$/),
      endMonthDay: z.string().regex(/^\d{2}-\d{2}$/),
    }),
    terraceOpen: z.boolean().describe("Operational toggle, e.g. closed for wind, rain or extreme heat"),
    modificationCutoffMinutes: z.number().int().min(0).max(1440),
    lateArrivalGraceMinutes: z.number().int().min(0).max(60),
  }),
  bulk: z.object({
    acceptingBulkOrders: z.boolean(),
    maxPortionsPerOrder: z.number().int().min(1),
    dailyCapacityPortions: z.number().int().min(1),
    noticeTiers: z.array(z.object({ maxPortions: z.number().int().min(1), hours: z.number().int().min(0) })).min(1),
    discountTiers: z.array(z.object({ minPortions: z.number().int().min(1), percent: z.number().min(0).max(50) })),
    quoteValidityHours: z.number().int().min(1).max(720),
    depositThresholdFils: z.number().int().min(0),
    depositPercent: z.number().min(0).max(100),
    fulfilmentStart: LocalTimeSchema,
    fulfilmentEnd: LocalTimeSchema,
    maxAdvanceDays: z.number().int().min(1).max(365),
    freeCancellationHours: z.number().int().min(0),
    reviewResponseHours: z.number().int().min(1).max(72),
  }),
});

export type RestaurantSettings = z.infer<typeof SettingsSchema>;
