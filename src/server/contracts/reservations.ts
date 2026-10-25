import { z } from "@hono/zod-openapi";
import { RESERVATION_STATUSES } from "@/domain/status";
import { IsoDateTimeSchema, LocalDateSchema, LocalTimeSchema, MoneySchema, ReasonSchema, SeatingAreaSchema } from "./common";

export const SeatingPreferenceSchema = z
  .enum(["no_preference", "indoor", "window", "terrace", "majlis"])
  .openapi("SeatingPreference", {
    description:
      "no_preference = any regular table. A specific area is treated as a requirement: if it is full the request is rejected with alternatives (never silently moved).",
  });

export const ReservationSlotSchema = z
  .object({ time: LocalTimeSchema, at: IsoDateTimeSchema, available: z.boolean(), areas: z.array(SeatingAreaSchema) })
  .openapi("ReservationSlot");

export const ReservationAvailabilityQuerySchema = z.object({
  date: LocalDateSchema,
  partySize: z.coerce.number().int().min(1).max(100).openapi({ example: 6 }),
  time: LocalTimeSchema.optional().openapi({ description: "Optional preferred time; the response then says whether it is free and suggests the nearest alternatives" }),
  seatingPreference: SeatingPreferenceSchema.optional(),
  wheelchair: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true")
    .openapi({ description: "Only consider wheelchair-accessible tables" }),
});

export const ReservationAvailabilitySchema = z
  .object({
    date: LocalDateSchema,
    weekday: z.string(),
    partySize: z.number().int(),
    seatingPreference: SeatingPreferenceSchema,
    bookable: z.boolean().openapi({ description: "false when the date/party cannot be booked at all (see violations)" }),
    violations: z.array(ReasonSchema),
    durationMinutes: z.number().int(),
    seatingHours: z.string(),
    terraceAvailable: z.boolean(),
    requested: z
      .object({ time: LocalTimeSchema, available: z.boolean(), areas: z.array(SeatingAreaSchema), preferenceAvailable: z.boolean(), reasons: z.array(ReasonSchema) })
      .nullable(),
    slots: z.array(ReservationSlotSchema),
    alternatives: z.array(ReservationSlotSchema),
    otherDates: z.array(z.object({ date: LocalDateSchema, weekday: z.string(), times: z.array(LocalTimeSchema) })),
    requiresConfirmation: z.boolean().openapi({ description: "true for groups above the auto-confirm limit: the booking will be pending until staff confirm" }),
    notes: z.array(z.string()),
  })
  .openapi("ReservationAvailability");

export const CustomerSchema = z.object({
  name: z.string().trim().min(2, "Please give a name for the booking").max(80).openapi({ example: "Mariam Al Suwaidi" }),
  phone: z.string().trim().min(5).max(25).openapi({ example: "050 123 4567" }),
  email: z.string().trim().email().max(120).optional().openapi({ example: "mariam@example.com" }),
});

export const CreateReservationSchema = z
  .object({
    date: LocalDateSchema,
    time: LocalTimeSchema,
    partySize: z.number().int().min(1).max(100),
    seatingPreference: SeatingPreferenceSchema.default("no_preference"),
    customer: CustomerSchema,
    specialRequests: z.string().trim().max(500).optional().openapi({ example: "Celebrating a birthday — a quiet corner if possible." }),
    occasion: z.enum(["birthday", "anniversary", "business", "family_gathering", "celebration", "other"]).optional(),
    childrenCount: z.number().int().min(0).max(20).optional(),
    highChairs: z.number().int().min(0).max(4).optional(),
    wheelchairAccess: z.boolean().optional(),
  })
  .openapi("CreateReservationRequest");

export const UpdateReservationSchema = z
  .object({
    date: LocalDateSchema.optional(),
    time: LocalTimeSchema.optional(),
    partySize: z.number().int().min(1).max(100).optional(),
    seatingPreference: SeatingPreferenceSchema.optional(),
    customer: z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().trim().email().max(120).optional() }).optional(),
    specialRequests: z.string().trim().max(500).optional(),
    occasion: z.enum(["birthday", "anniversary", "business", "family_gathering", "celebration", "other"]).optional(),
    childrenCount: z.number().int().min(0).max(20).optional(),
    highChairs: z.number().int().min(0).max(4).optional(),
    wheelchairAccess: z.boolean().optional(),
  })
  .openapi("UpdateReservationRequest");

export const CancelSchema = z
  .object({ reason: z.string().trim().max(300).optional().openapi({ example: "Plans changed" }) })
  .openapi("CancelRequest");

export const ReservationSchema = z
  .object({
    reference: z.string().openapi({ example: "RES-482913" }),
    status: z.enum(RESERVATION_STATUSES),
    statusLabel: z.string(),
    statusDescription: z.string(),
    confirmed: z.boolean().openapi({ description: "true only when status = confirmed (or seated/completed)" }),
    date: LocalDateSchema,
    time: LocalTimeSchema,
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
    durationMinutes: z.number().int(),
    partySize: z.number().int(),
    seatingPreference: SeatingPreferenceSchema,
    seatingArea: SeatingAreaSchema,
    seatingAreaLabel: z.string(),
    preferenceMet: z.boolean(),
    tableCode: z.string().nullable().openapi({ description: "Only visible to staff" }),
    customer: z.object({ name: z.string(), phone: z.string(), email: z.string().nullable() }),
    specialRequests: z.string().nullable(),
    occasion: z.string().nullable(),
    childrenCount: z.number().int(),
    highChairs: z.number().int(),
    wheelchairAccess: z.boolean(),
    channel: z.string(),
    majlisMinimumSpendPerPerson: MoneySchema.nullable(),
    policies: z.object({
      lateArrivalGraceMinutes: z.number().int(),
      modifiableUntil: IsoDateTimeSchema,
      cancellableUntil: IsoDateTimeSchema,
      notes: z.array(z.string()),
    }),
    allowedActions: z.object({ modify: z.boolean(), cancel: z.boolean(), reason: z.string().nullable() }),
    preOrders: z.array(z.object({ number: z.string(), status: z.string() })),
    history: z.array(z.object({ at: IsoDateTimeSchema, type: z.string(), status: z.string().nullable(), note: z.string().nullable(), actor: z.string() })),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .openapi("Reservation");

export const ReservationCreatedSchema = z
  .object({
    reservation: ReservationSchema,
    accessToken: z.string().openapi({ description: "Secret token for this booking. Store it to fetch/modify without the phone number. Shown only once." }),
    message: z.string().openapi({ description: "Plain-English summary built from the stored record — safe to read to the customer" }),
  })
  .openapi("ReservationCreated");
