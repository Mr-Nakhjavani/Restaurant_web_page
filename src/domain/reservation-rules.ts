import type { DateTime } from "luxon";
import type { CalendarContext, ServiceWindow } from "./hours";
import { getDayService, serviceWindows } from "./hours";
import type { DiningTableDef, SeatingArea } from "./types";
import { SEATING_AREAS } from "./types";
import { daysBetween, isWithinMonthDayRange, localDateTime, minutesToTime, timeToMinutes, toIsoLocal, toLocalDate } from "./time";

export type SeatingPreference = SeatingArea | "no_preference";

export interface ExistingBooking {
  id: string;
  tableId: string;
  startAt: DateTime;
  /** End of the booking plus turnover buffer. */
  blockedUntil: DateTime;
}

export interface ReservationRequest {
  date: string;
  time: string;
  partySize: number;
  preference: SeatingPreference;
  wheelchair?: boolean;
  /** When provided, enforces the majlis minimum notice during table selection. */
  now?: DateTime;
}

export type ReservationRuleCode =
  | "RESERVATIONS_PAUSED"
  | "INVALID_PARTY_SIZE"
  | "PARTY_TOO_LARGE"
  | "DATE_IN_PAST"
  | "TOO_FAR_IN_ADVANCE"
  | "INSUFFICIENT_NOTICE"
  | "RESTAURANT_CLOSED"
  | "OUTSIDE_SEATING_HOURS"
  | "INVALID_TIME"
  | "MAJLIS_MIN_PARTY"
  | "MAJLIS_NOTICE"
  | "TERRACE_CLOSED";

export interface RuleViolation {
  code: ReservationRuleCode;
  message: string;
}

export function reservationDuration(partySize: number, area: SeatingArea, ctx: CalendarContext): number {
  const r = ctx.settings.reservations;
  if (area === "majlis") return r.majlis.durationMinutes;
  const tier = [...r.durations].sort((a, b) => a.maxPartySize - b.maxPartySize).find((d) => partySize <= d.maxPartySize);
  return (tier ?? r.durations[r.durations.length - 1]).minutes;
}

export function terraceAvailableOn(date: string, ctx: CalendarContext): boolean {
  const r = ctx.settings.reservations;
  return r.terraceOpen && isWithinMonthDayRange(date, r.terraceSeason.startMonthDay, r.terraceSeason.endMonthDay);
}

/** Seating windows (start minute ranges) for a date. */
export function seatingWindows(date: string, ctx: CalendarContext): ServiceWindow[] {
  return serviceWindows(getDayService(date, ctx), "reservations");
}

/** Is a start time within seating hours, given the booking's duration? */
export function startAllowed(minute: number, duration: number, windows: ServiceWindow[], ctx: CalendarContext): boolean {
  const last = ctx.settings.reservations.lastSeatingMinutesBeforeClose;
  return windows.some((w) => {
    if (minute < w.start) return false;
    if (w.endsAtClosure) return minute + duration <= w.end;
    return minute <= w.end - last;
  });
}

/** Validation that does not depend on existing bookings. */
export function validateReservationRequest(req: ReservationRequest, now: DateTime, ctx: CalendarContext): RuleViolation[] {
  const r = ctx.settings.reservations;
  const v: RuleViolation[] = [];
  if (!r.acceptingReservations) {
    v.push({ code: "RESERVATIONS_PAUSED", message: "We are not taking new reservations at the moment. Walk-ins are welcome subject to availability." });
    return v;
  }
  if (!Number.isInteger(req.partySize) || req.partySize < r.minPartySize) {
    v.push({ code: "INVALID_PARTY_SIZE", message: `Party size must be at least ${r.minPartySize}.` });
    return v;
  }
  if (req.partySize > r.maxPartySize) {
    v.push({
      code: "PARTY_TOO_LARGE",
      message: `We can book tables for up to ${r.maxPartySize} guests. For larger groups or a private event, please contact our events team.`,
    });
    return v;
  }
  const minute = timeToMinutes(req.time);
  if (minute % r.slotMinutes !== 0) {
    v.push({ code: "INVALID_TIME", message: `Reservations start on ${r.slotMinutes}-minute slots (e.g. 19:00, 19:15, 19:30).` });
  }
  const start = localDateTime(req.date, minute);
  const today = toLocalDate(now);
  if (req.date < today || start < now) {
    v.push({ code: "DATE_IN_PAST", message: "That date and time has already passed." });
    return v;
  }
  if (daysBetween(today, req.date) > r.maxAdvanceDays) {
    v.push({ code: "TOO_FAR_IN_ADVANCE", message: `Reservations open ${r.maxAdvanceDays} days in advance.` });
  }
  if (start.diff(now, "minutes").minutes < r.minNoticeMinutes) {
    v.push({ code: "INSUFFICIENT_NOTICE", message: `Online and phone reservations must be made at least ${r.minNoticeMinutes} minutes ahead. For a table sooner, walk-ins are welcome subject to availability.` });
  }
  const windows = seatingWindows(req.date, ctx);
  if (windows.length === 0) {
    v.push({ code: "RESTAURANT_CLOSED", message: `The dining room is closed on ${req.date}.` });
    return v;
  }
  const area: SeatingArea = req.preference === "no_preference" ? "indoor" : req.preference;
  const duration = reservationDuration(req.partySize, area, ctx);
  if (!startAllowed(minute, duration, windows, ctx)) {
    v.push({ code: "OUTSIDE_SEATING_HOURS", message: describeSeatingHours(req.date, req.partySize, area, ctx) });
  }
  if (req.preference === "majlis") {
    if (req.partySize < r.majlis.minPartySize) {
      v.push({ code: "MAJLIS_MIN_PARTY", message: `The private majlis rooms are for groups of ${r.majlis.minPartySize} or more.` });
    }
    if (start.diff(now, "hours").hours < r.majlis.minNoticeHours) {
      v.push({ code: "MAJLIS_NOTICE", message: `Majlis rooms must be booked at least ${r.majlis.minNoticeHours} hours in advance.` });
    }
  }
  if (req.preference === "terrace" && !terraceAvailableOn(req.date, ctx)) {
    v.push({
      code: "TERRACE_CLOSED",
      message: r.terraceOpen
        ? `The terrace is open seasonally from ${r.terraceSeason.startMonthDay.split("-").reverse().join("/")} to ${r.terraceSeason.endMonthDay.split("-").reverse().join("/")} (day/month). Indoor and window tables are available year-round.`
        : "The terrace is closed at the moment (weather). Indoor and window tables are available.",
    });
  }
  return v;
}

export function describeSeatingHours(date: string, partySize: number, area: SeatingArea, ctx: CalendarContext): string {
  const windows = seatingWindows(date, ctx);
  const duration = reservationDuration(partySize, area, ctx);
  const last = ctx.settings.reservations.lastSeatingMinutesBeforeClose;
  const ranges = windows
    .map((w) => {
      const lastStart = w.endsAtClosure ? w.end - duration : w.end - last;
      return lastStart >= w.start ? `${minutesToTime(w.start)}–${minutesToTime(lastStart)}` : null;
    })
    .filter(Boolean);
  return ranges.length
    ? `On ${date}, reservations for ${partySize} can start between ${ranges.join(" and ")}.`
    : `There are no reservation times on ${date} for a party of ${partySize}.`;
}

function areaOrder(pref: SeatingPreference, date: string, ctx: CalendarContext): SeatingArea[] {
  if (pref !== "no_preference") return [pref];
  const areas: SeatingArea[] = ["indoor", "terrace", "window"];
  return areas.filter((a) => a !== "terrace" || terraceAvailableOn(date, ctx));
}

export function tableFits(t: DiningTableDef, partySize: number, wheelchair?: boolean): boolean {
  return t.onlineBookable && partySize >= t.minCovers && partySize <= t.maxCovers && (!wheelchair || t.features.includes("wheelchair_accessible"));
}

export function isTableFree(tableId: string, start: DateTime, blockedUntil: DateTime, existing: ExistingBooking[], ignoreId?: string): boolean {
  return !existing.some((b) => b.tableId === tableId && b.id !== ignoreId && b.startAt < blockedUntil && start < b.blockedUntil);
}

export interface TableChoice {
  table: DiningTableDef;
  area: SeatingArea;
  startAt: DateTime;
  endAt: DateTime;
  blockedUntil: DateTime;
  durationMinutes: number;
}

/** Pick the best-fitting free table (smallest that fits, in area preference order). */
export function chooseTable(
  req: ReservationRequest,
  tables: DiningTableDef[],
  existing: ExistingBooking[],
  ctx: CalendarContext,
  ignoreReservationId?: string,
): TableChoice | null {
  const minute = timeToMinutes(req.time);
  const startAt = localDateTime(req.date, minute);
  const windows = seatingWindows(req.date, ctx);
  const order = areaOrder(req.preference, req.date, ctx);
  // Groups too large for any regular table are offered the majlis even without a stated preference.
  if (req.preference === "no_preference" && req.partySize > largestRegularTable(tables)) order.push("majlis");
  for (const area of order) {
    if (area === "terrace" && !terraceAvailableOn(req.date, ctx)) continue;
    if (area === "majlis" && req.partySize < ctx.settings.reservations.majlis.minPartySize) continue;
    if (area === "majlis" && req.now && startAt.diff(req.now, "hours").hours < ctx.settings.reservations.majlis.minNoticeHours) continue;
    const duration = reservationDuration(req.partySize, area, ctx);
    if (!startAllowed(minute, duration, windows, ctx)) continue;
    const endAt = startAt.plus({ minutes: duration });
    const blockedUntil = endAt.plus({ minutes: ctx.settings.reservations.turnoverBufferMinutes });
    const candidates = tables
      .filter((t) => t.area === area && tableFits(t, req.partySize, req.wheelchair))
      .sort((a, b) => a.maxCovers - b.maxCovers || a.sortOrder - b.sortOrder);
    for (const table of candidates) {
      if (isTableFree(table.id, startAt, blockedUntil, existing, ignoreReservationId)) {
        return { table, area, startAt, endAt, blockedUntil, durationMinutes: duration };
      }
    }
  }
  return null;
}

export interface ReservationSlot {
  time: string;
  at: string;
  available: boolean;
  areas: SeatingArea[];
}

/** Every bookable start time on a date for a party, with the areas that still have a table. */
export function listReservationSlots(
  date: string,
  partySize: number,
  tables: DiningTableDef[],
  existing: ExistingBooking[],
  now: DateTime,
  ctx: CalendarContext,
  opts?: { wheelchair?: boolean; ignoreReservationId?: string },
): ReservationSlot[] {
  const r = ctx.settings.reservations;
  const windows = seatingWindows(date, ctx);
  if (windows.length === 0) return [];
  const slots: ReservationSlot[] = [];
  const first = Math.min(...windows.map((w) => w.start));
  const lastEnd = Math.max(...windows.map((w) => w.end));
  for (let m = Math.ceil(first / r.slotMinutes) * r.slotMinutes; m < lastEnd; m += r.slotMinutes) {
    const at = localDateTime(date, m);
    if (at.diff(now, "minutes").minutes < r.minNoticeMinutes) continue;
    const areas: SeatingArea[] = [];
    for (const area of SEATING_AREAS) {
      if (area === "majlis" && (partySize < r.majlis.minPartySize || at.diff(now, "hours").hours < r.majlis.minNoticeHours)) continue;
      const choice = chooseTable({ date, time: minutesToTime(m), partySize, preference: area, wheelchair: opts?.wheelchair }, tables, existing, ctx, opts?.ignoreReservationId);
      if (choice) areas.push(area);
    }
    const anyStart = SEATING_AREAS.some((a) => startAllowed(m, reservationDuration(partySize, a, ctx), windows, ctx));
    if (!anyStart) continue;
    slots.push({ time: minutesToTime(m), at: toIsoLocal(at), available: areas.length > 0, areas });
  }
  return slots;
}

export function largestRegularTable(tables: DiningTableDef[]): number {
  return Math.max(0, ...tables.filter((t) => t.area !== "majlis" && t.onlineBookable).map((t) => t.maxCovers));
}

/**
 * Does a slot satisfy a preference the same way chooseTable would? With no preference,
 * the majlis only counts for groups too large for any regular table.
 */
export function slotMatches(slot: ReservationSlot, preference: SeatingPreference, partySize: number, tables: DiningTableDef[]): boolean {
  if (!slot.available) return false;
  if (preference !== "no_preference") return slot.areas.includes(preference);
  return slot.areas.some((a) => a !== "majlis" || partySize > largestRegularTable(tables));
}

/** Nearest available alternatives around a requested time. */
export function nearestAlternatives(
  slots: ReservationSlot[],
  requestedTime: string,
  preference: SeatingPreference,
  count = 4,
  match?: (slot: ReservationSlot) => boolean,
): ReservationSlot[] {
  const target = timeToMinutes(requestedTime);
  return slots
    .filter((s) => (match ? match(s) : s.available && (preference === "no_preference" ? s.areas.some((a) => a !== "majlis") : s.areas.includes(preference))))
    .sort((a, b) => Math.abs(timeToMinutes(a.time) - target) - Math.abs(timeToMinutes(b.time) - target))
    .slice(0, count)
    .sort((a, b) => a.time.localeCompare(b.time));
}
