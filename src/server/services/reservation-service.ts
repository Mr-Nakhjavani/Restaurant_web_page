import { Prisma, type Reservation, type ReservationEvent, type DiningTable, type Order } from "@prisma/client";
import type { z } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import { money } from "@/domain/money";
import { checkPhone, maskPhone } from "@/domain/phone";
import { generateAccessToken, generateReference, hashToken, normaliseReference } from "@/domain/references";
import {
  chooseTable,
  describeSeatingHours,
  listReservationSlots,
  nearestAlternatives,
  reservationDuration,
  slotMatches,
  terraceAvailableOn,
  validateReservationRequest,
  type ExistingBooking,
  type ReservationRequest,
  type SeatingPreference,
} from "@/domain/reservation-rules";
import { RESERVATION_STATUS_INFO, TABLE_HOLDING_RESERVATION_STATUSES, canTransitionReservation, type ReservationStatus } from "@/domain/status";
import { addDays, formatHumanDate, localDay, RESTAURANT_TZ, toIsoLocal, toLocalDate } from "@/domain/time";
import { SEATING_AREA_LABELS, WEEKDAY_NAMES, type SeatingArea, type IsoWeekday } from "@/domain/types";
import type { ReservationAvailabilitySchema, ReservationSchema, CreateReservationSchema, UpdateReservationSchema } from "../contracts/reservations";
import { prisma, type Tx } from "../db";
import { ApiError, type ErrorCode } from "../errors";
import { logger } from "../logger";
import { actorName, channelFor, isStaff, sourceFor, type Principal } from "../auth/principal";
import { assertRecordAccess, requireVerificationInput, type VerificationInput } from "../auth/verification";
import { loadRestaurantContext, type RestaurantContext } from "../repositories/catalog-repo";
import { withDateLocks } from "./locks";

export type ReservationDto = z.infer<typeof ReservationSchema>;
export type ReservationAvailability = z.infer<typeof ReservationAvailabilitySchema>;
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;

type ReservationRow = Reservation & { table: DiningTable; events: ReservationEvent[]; orders: Pick<Order, "number" | "status">[] };
const reservationInclude = {
  table: true,
  events: { orderBy: { createdAt: "asc" } },
  orders: { select: { number: true, status: true } },
} satisfies Prisma.ReservationInclude;

const iso = (d: Date) => toIsoLocal(DateTime.fromJSDate(d).setZone(RESTAURANT_TZ));

export function toReservationDto(row: ReservationRow, ctx: RestaurantContext, principal: Principal, now: DateTime): ReservationDto {
  const status = row.status as ReservationStatus;
  const info = RESERVATION_STATUS_INFO[status];
  const start = DateTime.fromJSDate(row.startAt).setZone(RESTAURANT_TZ);
  const cutoff = start.minus({ minutes: ctx.settings.reservations.modificationCutoffMinutes });
  const active = status === "pending_confirmation" || status === "confirmed";
  const canModify = active && now < cutoff;
  const canCancel = active && now < start;
  const notes = [
    `We hold tables for ${ctx.settings.reservations.lateArrivalGraceMinutes} minutes after the booking time; after that the table may be released.`,
    `Changes can be made until ${ctx.settings.reservations.modificationCutoffMinutes / 60} hours before the booking; cancellations are free at any time before the booking.`,
  ];
  if (row.seatingArea === "majlis") {
    notes.push(`Majlis rooms have a minimum spend of ${money(ctx.settings.reservations.majlis.minimumSpendPerPersonFils).formatted} per person, settled at the end of the meal.`);
  }
  if (row.seatingArea === "terrace") notes.push("Terrace tables are outdoors; in bad weather we move guests indoors where space allows.");
  return {
    reference: row.reference,
    status,
    statusLabel: info.label,
    statusDescription: info.description,
    confirmed: status === "confirmed" || status === "seated" || status === "completed",
    date: row.date,
    time: row.time,
    startAt: iso(row.startAt),
    endAt: iso(row.endAt),
    durationMinutes: row.durationMinutes,
    partySize: row.partySize,
    seatingPreference: row.seatingPreference as SeatingPreference,
    seatingArea: row.seatingArea as SeatingArea,
    seatingAreaLabel: SEATING_AREA_LABELS[row.seatingArea as SeatingArea],
    preferenceMet: row.preferenceMet,
    tableCode: isStaff(principal) ? row.table.code : null,
    customer: { name: row.customerName, phone: row.phone, email: row.email },
    specialRequests: row.specialRequests,
    occasion: row.occasion,
    childrenCount: row.childrenCount,
    highChairs: row.highChairs,
    wheelchairAccess: row.wheelchairAccess,
    channel: row.channel,
    majlisMinimumSpendPerPerson: row.seatingArea === "majlis" ? money(ctx.settings.reservations.majlis.minimumSpendPerPersonFils) : null,
    policies: {
      lateArrivalGraceMinutes: ctx.settings.reservations.lateArrivalGraceMinutes,
      modifiableUntil: toIsoLocal(cutoff),
      cancellableUntil: toIsoLocal(start),
      notes,
    },
    allowedActions: {
      modify: canModify,
      cancel: canCancel,
      reason: !active
        ? `The reservation is ${info.label.toLowerCase()}.`
        : !canModify
          ? `Online changes close ${ctx.settings.reservations.modificationCutoffMinutes / 60} hours before the booking; please call the restaurant.`
          : null,
    },
    preOrders: row.orders.map((o) => ({ number: o.number, status: o.status })),
    history: row.events.map((e) => ({ at: iso(e.createdAt), type: e.type, status: e.toStatus, note: e.note, actor: e.actor })),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function summaryMessage(r: ReservationDto): string {
  const when = `${formatHumanDate(r.date)} at ${r.time}`;
  const base =
    r.status === "pending_confirmation"
      ? `Your request ${r.reference} for ${r.partySize} guests on ${when} has been received and a table is held, but it is NOT yet confirmed. Our team will confirm by phone.`
      : `Your table for ${r.partySize} on ${when} is confirmed — reference ${r.reference}, ${r.seatingAreaLabel.toLowerCase()}.`;
  return `${base} We hold tables for ${r.policies.lateArrivalGraceMinutes} minutes.`;
}

async function activeBookings(tx: Tx, date: string, ignoreId?: string): Promise<(ExistingBooking & { phone: string; reference: string; endAt: DateTime })[]> {
  const rows = await tx.reservation.findMany({
    where: { date, status: { in: TABLE_HOLDING_RESERVATION_STATUSES }, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, tableId: true, startAt: true, endAt: true, blockedUntil: true, phone: true, reference: true },
  });
  return rows.map((r) => ({
    id: r.id,
    tableId: r.tableId,
    startAt: DateTime.fromJSDate(r.startAt).setZone(RESTAURANT_TZ),
    endAt: DateTime.fromJSDate(r.endAt).setZone(RESTAURANT_TZ),
    blockedUntil: DateTime.fromJSDate(r.blockedUntil).setZone(RESTAURANT_TZ),
    phone: r.phone,
    reference: r.reference,
  }));
}

const DATE_LEVEL_CODES = new Set(["RESERVATIONS_PAUSED", "INVALID_PARTY_SIZE", "PARTY_TOO_LARGE", "TOO_FAR_IN_ADVANCE", "RESTAURANT_CLOSED", "MAJLIS_MIN_PARTY", "TERRACE_CLOSED"]);

export async function reservationAvailability(
  q: { date: string; partySize: number; time?: string; seatingPreference?: SeatingPreference; wheelchair?: boolean },
  now: DateTime,
): Promise<ReservationAvailability> {
  const ctx = await loadRestaurantContext();
  const pref = q.seatingPreference ?? "no_preference";
  const today = toLocalDate(now);
  const probeTime = q.time ?? "12:00";
  const violations = validateReservationRequest({ date: q.date, time: probeTime, partySize: q.partySize, preference: pref }, now, ctx)
    .filter((v) => (q.time ? true : DATE_LEVEL_CODES.has(v.code) || (v.code === "DATE_IN_PAST" && q.date < today)));
  const dateBlocked = violations.some((v) => DATE_LEVEL_CODES.has(v.code) || (v.code === "DATE_IN_PAST" && q.date < today));
  const existing = await activeBookings(prisma, q.date);
  const slots = dateBlocked ? [] : listReservationSlots(q.date, q.partySize, ctx.tables, existing, now, ctx, { wheelchair: q.wheelchair });
  const area: SeatingArea = pref === "no_preference" ? "indoor" : pref;
  let requested: ReservationAvailability["requested"] = null;
  if (q.time) {
    const slot = slots.find((s) => s.time === q.time);
    const reasons = violations.filter((v) => !DATE_LEVEL_CODES.has(v.code));
    const matches = !!slot && slotMatches(slot, pref, q.partySize, ctx.tables);
    requested = {
      time: q.time,
      available: matches && reasons.length === 0,
      areas: slot?.areas ?? [],
      preferenceAvailable: matches,
      reasons,
    };
  }
  const match = (s: (typeof slots)[number]) => slotMatches(s, pref, q.partySize, ctx.tables);
  const alternatives = q.time ? nearestAlternatives(slots, q.time, pref, 4, match) : [];
  const hasAvailability = slots.some(match);
  const otherDates: ReservationAvailability["otherDates"] = [];
  if (!dateBlocked && (!hasAvailability || (requested && !requested.available))) {
    for (let i = 1; i <= 7 && otherDates.length < 3; i++) {
      const d = addDays(q.date, i);
      const v = validateReservationRequest({ date: d, time: probeTime, partySize: q.partySize, preference: pref }, now, ctx).filter((x) => DATE_LEVEL_CODES.has(x.code));
      if (v.length) continue;
      const ex = await activeBookings(prisma, d);
      const s = listReservationSlots(d, q.partySize, ctx.tables, ex, now, ctx, { wheelchair: q.wheelchair });
      const times = (q.time ? nearestAlternatives(s, q.time, pref, 3, match) : s.filter(match).slice(0, 3)).map((x) => x.time);
      if (times.length) otherDates.push({ date: d, weekday: WEEKDAY_NAMES[localDay(d).weekday as IsoWeekday], times });
    }
  }
  const notes: string[] = [];
  if (q.partySize > ctx.settings.reservations.autoConfirmMaxPartySize && q.partySize <= ctx.settings.reservations.maxPartySize) {
    notes.push(`Groups of more than ${ctx.settings.reservations.autoConfirmMaxPartySize} are held as a request and confirmed by our team within ${ctx.settings.bulk.reviewResponseHours} hours.`);
  }
  if (!terraceAvailableOn(q.date, ctx)) notes.push("The outdoor terrace is not available on this date.");
  notes.push("Some tables are kept for walk-in guests and are never shown online.");
  return {
    date: q.date,
    weekday: WEEKDAY_NAMES[localDay(q.date).weekday as IsoWeekday],
    partySize: q.partySize,
    seatingPreference: pref,
    bookable: !dateBlocked && hasAvailability,
    violations,
    durationMinutes: reservationDuration(q.partySize, area, ctx),
    seatingHours: describeSeatingHours(q.date, q.partySize, area, ctx),
    terraceAvailable: terraceAvailableOn(q.date, ctx),
    requested,
    slots,
    alternatives,
    otherDates,
    requiresConfirmation: q.partySize > ctx.settings.reservations.autoConfirmMaxPartySize,
    notes,
  };
}

function isExclusionViolation(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Reservation_no_overlapping_table_bookings") || msg.includes("23P01") || msg.includes("exclusion constraint");
}

async function uniqueReference(tx: Tx): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const ref = generateReference("reservation");
    const exists = await tx.reservation.findUnique({ where: { reference: ref }, select: { id: true } });
    if (!exists) return ref;
  }
  throw new ApiError("INTERNAL_ERROR", "Could not allocate a reservation reference.");
}

const AREA_SHORT: Record<SeatingArea, string> = { indoor: "main-hall", window: "creek-view window", terrace: "terrace", majlis: "majlis" };

function noTableError(req: ReservationRequest, ctx: RestaurantContext, existing: ExistingBooking[], now: DateTime): ApiError {
  const slots = listReservationSlots(req.date, req.partySize, ctx.tables, existing, now, ctx, { wheelchair: req.wheelchair });
  const sameTime = slots.find((s) => s.time === req.time);
  const match = (s: (typeof slots)[number]) => slotMatches(s, req.preference, req.partySize, ctx.tables);
  if (req.preference !== "no_preference" && sameTime?.available) {
    return new ApiError(
      "SEATING_PREFERENCE_UNAVAILABLE",
      `All ${AREA_SHORT[req.preference]} tables are booked at ${req.time}. Other areas are available at that time.`,
      { availableAreas: sameTime.areas, alternatives: nearestAlternatives(slots, req.time, req.preference, 4, match) },
    );
  }
  return new ApiError("NO_TABLE_AVAILABLE", `We have no table for ${req.partySize} at ${req.time} on ${formatHumanDate(req.date)}.`, {
    alternatives: nearestAlternatives(slots, req.time, req.preference, 4, match),
  });
}

function violationError(v: { code: string; message: string }[], extra?: Record<string, unknown>): ApiError {
  const first = v[0];
  return new ApiError(first.code as ErrorCode, first.message, { violations: v, ...extra });
}

export async function createReservation(input: CreateReservationInput, principal: Principal, now: DateTime) {
  const phone = checkPhone(input.customer.phone);
  if (!phone.valid) throw new ApiError("INVALID_PHONE", phone.error, { field: "customer.phone" });
  const ctx = await loadRestaurantContext();
  const req: ReservationRequest = {
    date: input.date,
    time: input.time,
    partySize: input.partySize,
    preference: input.seatingPreference,
    wheelchair: input.wheelchairAccess,
    now,
  };
  const violations = validateReservationRequest(req, now, ctx);
  if (violations.length) {
    const existing = await activeBookings(prisma, input.date);
    const slots = listReservationSlots(input.date, input.partySize, ctx.tables, existing, now, ctx, { wheelchair: input.wheelchairAccess });
    throw violationError(violations, {
      alternatives: nearestAlternatives(slots, input.time, input.seatingPreference, 4, (s) => slotMatches(s, input.seatingPreference, input.partySize, ctx.tables)),
    });
  }
  const token = generateAccessToken();
  try {
    const row = await withDateLocks(prisma, ["reservations:" + input.date], async (tx) => {
      const existing = await activeBookings(tx, input.date);
      const start = DateTime.fromISO(`${input.date}T${input.time}`, { zone: RESTAURANT_TZ });
      const dup = existing.find((b) => b.phone === phone.e164 && b.startAt < start.plus({ hours: 2 }) && start < b.endAt);
      if (dup) {
        throw new ApiError("DUPLICATE_RESERVATION", `There is already a reservation for this phone number at an overlapping time (${dup.reference}).`, { existingReference: dup.reference });
      }
      const choice = chooseTable(req, ctx.tables, existing, ctx);
      if (!choice) throw noTableError(req, ctx, existing, now);
      const status: ReservationStatus = input.partySize > ctx.settings.reservations.autoConfirmMaxPartySize ? "pending_confirmation" : "confirmed";
      const reference = await uniqueReference(tx);
      return tx.reservation.create({
        data: {
          reference,
          createdAt: now.toJSDate(),
          accessTokenHash: hashToken(token),
          status,
          date: input.date,
          time: input.time,
          startAt: choice.startAt.toJSDate(),
          endAt: choice.endAt.toJSDate(),
          blockedUntil: choice.blockedUntil.toJSDate(),
          durationMinutes: choice.durationMinutes,
          partySize: input.partySize,
          seatingPreference: input.seatingPreference,
          seatingArea: choice.area,
          preferenceMet: input.seatingPreference === "no_preference" || input.seatingPreference === choice.area,
          tableId: choice.table.id,
          customerName: input.customer.name,
          phone: phone.e164!,
          email: input.customer.email ?? null,
          specialRequests: input.specialRequests ?? null,
          occasion: input.occasion ?? null,
          childrenCount: input.childrenCount ?? 0,
          highChairs: input.highChairs ?? 0,
          wheelchairAccess: input.wheelchairAccess ?? false,
          channel: channelFor(principal),
          source: sourceFor(principal),
          apiKeyId: principal.kind === "api_key" ? principal.id : null,
          events: {
            create: {
              type: "created",
              toStatus: status,
              actor: actorName(principal),
              note: status === "pending_confirmation" ? "Large group — awaiting staff confirmation" : null,
            },
          },
        },
        include: reservationInclude,
      });
    });
    logger.info("reservation.created", { reference: row.reference, date: row.date, startTime: row.time, partySize: row.partySize, phone: maskPhone(row.phone), status: row.status });
    const dto = toReservationDto(row, ctx, principal, now);
    return { reservation: dto, accessToken: token, message: summaryMessage(dto) };
  } catch (e) {
    if (isExclusionViolation(e)) {
      const existing = await activeBookings(prisma, input.date);
      throw noTableError(req, ctx, existing, now);
    }
    throw e;
  }
}

async function findForAccess(reference: string, principal: Principal, v: VerificationInput) {
  requireVerificationInput(principal, v);
  const ref = normaliseReference(reference, "reservation");
  const row = ref ? await prisma.reservation.findUnique({ where: { reference: ref }, include: reservationInclude }) : null;
  assertRecordAccess(principal, ref ?? reference.toUpperCase(), row, v);
  return row as ReservationRow;
}

export async function getReservation(reference: string, principal: Principal, v: VerificationInput, now: DateTime) {
  const row = await findForAccess(reference, principal, v);
  const ctx = await loadRestaurantContext();
  return toReservationDto(row, ctx, principal, now);
}

export async function updateReservation(reference: string, input: UpdateReservationInput, principal: Principal, v: VerificationInput, now: DateTime) {
  const row = await findForAccess(reference, principal, v);
  const ctx = await loadRestaurantContext();
  const status = row.status as ReservationStatus;
  if (status !== "pending_confirmation" && status !== "confirmed") {
    throw new ApiError("RESERVATION_NOT_MODIFIABLE", `Reservation ${row.reference} is ${RESERVATION_STATUS_INFO[status].label.toLowerCase()} and cannot be changed.`);
  }
  const start = DateTime.fromJSDate(row.startAt).setZone(RESTAURANT_TZ);
  const cutoff = start.minus({ minutes: ctx.settings.reservations.modificationCutoffMinutes });
  if (now >= cutoff && !isStaff(principal)) {
    throw new ApiError("MODIFICATION_WINDOW_CLOSED", `Online changes close ${ctx.settings.reservations.modificationCutoffMinutes / 60} hours before the booking (${cutoff.toFormat("HH:mm")}). Please call the restaurant.`);
  }
  const next: ReservationRequest = {
    date: input.date ?? row.date,
    time: input.time ?? row.time,
    partySize: input.partySize ?? row.partySize,
    preference: (input.seatingPreference ?? row.seatingPreference) as SeatingPreference,
    wheelchair: input.wheelchairAccess ?? row.wheelchairAccess,
    now,
  };
  const slotChanged =
    next.date !== row.date || next.time !== row.time || next.partySize !== row.partySize || next.preference !== row.seatingPreference || next.wheelchair !== row.wheelchairAccess;
  if (slotChanged) {
    const violations = validateReservationRequest(next, now, ctx);
    if (violations.length) throw violationError(violations);
  }
  const locks = [...new Set(["reservations:" + row.date, "reservations:" + next.date])].sort();
  try {
    const updated = await withDateLocks(prisma, locks, async (tx) => {
      const data: Prisma.ReservationUpdateInput = {
        customerName: input.customer?.name ?? undefined,
        email: input.customer?.email ?? undefined,
        specialRequests: input.specialRequests ?? undefined,
        occasion: input.occasion ?? undefined,
        childrenCount: input.childrenCount ?? undefined,
        highChairs: input.highChairs ?? undefined,
      };
      const changes: string[] = [];
      if (slotChanged) {
        const existing = await activeBookings(tx, next.date, row.id);
        const choice = chooseTable(next, ctx.tables, existing, ctx, row.id);
        if (!choice) throw noTableError(next, ctx, existing, now);
        const newStatus: ReservationStatus = next.partySize > ctx.settings.reservations.autoConfirmMaxPartySize ? "pending_confirmation" : "confirmed";
        Object.assign(data, {
          date: next.date,
          time: next.time,
          partySize: next.partySize,
          seatingPreference: next.preference,
          wheelchairAccess: next.wheelchair ?? false,
          seatingArea: choice.area,
          preferenceMet: next.preference === "no_preference" || next.preference === choice.area,
          table: { connect: { id: choice.table.id } },
          startAt: choice.startAt.toJSDate(),
          endAt: choice.endAt.toJSDate(),
          blockedUntil: choice.blockedUntil.toJSDate(),
          durationMinutes: choice.durationMinutes,
          status: newStatus,
        });
        changes.push(`moved to ${next.date} ${next.time} for ${next.partySize} (${choice.area})`);
        if (newStatus !== status) changes.push(`status ${status} → ${newStatus}`);
      }
      for (const k of ["specialRequests", "occasion", "childrenCount", "highChairs"] as const) if (input[k] !== undefined) changes.push(`${k} updated`);
      if (input.customer) changes.push("contact details updated");
      return tx.reservation.update({
        where: { id: row.id },
        data: {
          ...data,
          events: { create: { type: "modified", fromStatus: status, toStatus: (data.status as string) ?? status, note: changes.join("; ") || "No changes", actor: actorName(principal) } },
        },
        include: reservationInclude,
      });
    });
    const dto = toReservationDto(updated, ctx, principal, now);
    return { reservation: dto, message: `Reservation ${dto.reference} updated: ${formatHumanDate(dto.date)} at ${dto.time} for ${dto.partySize}. Status: ${dto.statusLabel}.` };
  } catch (e) {
    if (isExclusionViolation(e)) throw new ApiError("NO_TABLE_AVAILABLE", "That table was just taken. Please choose another time.");
    throw e;
  }
}

export async function cancelReservation(reference: string, reason: string | undefined, principal: Principal, v: VerificationInput, now: DateTime) {
  const row = await findForAccess(reference, principal, v);
  const ctx = await loadRestaurantContext();
  const status = row.status as ReservationStatus;
  if (status !== "pending_confirmation" && status !== "confirmed") {
    throw new ApiError("RESERVATION_NOT_MODIFIABLE", `Reservation ${row.reference} is already ${RESERVATION_STATUS_INFO[status].label.toLowerCase()}.`);
  }
  const start = DateTime.fromJSDate(row.startAt).setZone(RESTAURANT_TZ);
  if (now >= start && !isStaff(principal)) {
    throw new ApiError("CANCELLATION_WINDOW_CLOSED", "The reservation time has already passed. Please call the restaurant.");
  }
  const late = start.diff(now, "minutes").minutes < ctx.settings.reservations.modificationCutoffMinutes;
  const updated = await prisma.$transaction(async (tx) => {
    const cancelledOrders: string[] = [];
    const preorders = await tx.order.findMany({ where: { reservationId: row.id, status: { in: ["pending_confirmation", "confirmed"] } } });
    for (const o of preorders) {
      await tx.order.update({
        where: { id: o.id },
        data: {
          status: "cancelled",
          cancelledAt: now.toJSDate(),
          cancelledBy: actorName(principal),
          cancellationReason: `Linked reservation ${row.reference} was cancelled`,
          events: { create: { type: "status_changed", fromStatus: o.status, toStatus: "cancelled", note: `Linked reservation ${row.reference} cancelled`, actor: actorName(principal) } },
        },
      });
      cancelledOrders.push(o.number);
    }
    return tx.reservation.update({
      where: { id: row.id },
      data: {
        status: "cancelled",
        cancelledAt: now.toJSDate(),
        cancelledBy: actorName(principal),
        cancellationReason: reason ?? null,
        events: {
          create: {
            type: "cancelled",
            fromStatus: status,
            toStatus: "cancelled",
            note: [reason, late ? "Late cancellation (less than 2 hours before)" : null, cancelledOrders.length ? `Cancelled pre-orders: ${cancelledOrders.join(", ")}` : null].filter(Boolean).join(" · ") || null,
            actor: actorName(principal),
          },
        },
      },
      include: reservationInclude,
    });
  });
  const dto = toReservationDto(updated, ctx, principal, now);
  return {
    reservation: dto,
    lateCancellation: late,
    message: `Reservation ${dto.reference} for ${formatHumanDate(dto.date)} at ${dto.time} has been cancelled.${dto.preOrders.length ? " Any linked pre-order has also been cancelled." : ""}`,
  };
}

// --- staff operations ------------------------------------------------------

export async function listReservations(
  filter: { date?: string; from?: string; to?: string; status?: ReservationStatus; q?: string; page: number; pageSize: number },
  principal: Principal,
  now: DateTime,
) {
  const ctx = await loadRestaurantContext();
  const where: Prisma.ReservationWhereInput = {
    ...(filter.date ? { date: filter.date } : {}),
    ...(filter.from || filter.to ? { date: { gte: filter.from ?? "0000-00-00", lte: filter.to ?? "9999-12-31" } } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q
      ? { OR: [{ reference: { contains: filter.q.toUpperCase() } }, { customerName: { contains: filter.q, mode: "insensitive" } }, { phone: { contains: filter.q.replace(/\D/g, "") || "~" } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({ where, include: reservationInclude, orderBy: [{ startAt: "asc" }], skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize }),
  ]);
  return { items: rows.map((r) => toReservationDto(r, ctx, principal, now)), total };
}

export async function transitionReservation(reference: string, to: ReservationStatus, note: string | undefined, principal: Principal, now: DateTime) {
  const ref = normaliseReference(reference, "reservation");
  const row = ref ? await prisma.reservation.findUnique({ where: { reference: ref }, include: reservationInclude }) : null;
  if (!row) throw new ApiError("NOT_FOUND", `No reservation ${reference}.`);
  const from = row.status as ReservationStatus;
  if (!canTransitionReservation(from, to)) {
    throw new ApiError("INVALID_STATUS_TRANSITION", `Cannot change reservation from ${from} to ${to}.`, { from, to });
  }
  const updated = await prisma.reservation.update({
    where: { id: row.id },
    data: {
      status: to,
      ...(to === "cancelled" ? { cancelledAt: now.toJSDate(), cancelledBy: actorName(principal), cancellationReason: note ?? null } : {}),
      events: { create: { type: "status_changed", fromStatus: from, toStatus: to, note: note ?? null, actor: actorName(principal) } },
    },
    include: reservationInclude,
  });
  const ctx = await loadRestaurantContext();
  return toReservationDto(updated, ctx, principal, now);
}

export { localDay };
