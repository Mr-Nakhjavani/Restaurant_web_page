import type { DateTime } from "luxon";
import type { CalendarContext } from "./hours";
import { getDayService, serviceWindows } from "./hours";
import type { DeliveryZone } from "./settings";
import type { OrderType } from "./types";
import {
  addDays,
  daysBetween,
  floorToSlot,
  localDateTime,
  minutesOfDay,
  minutesToTime,
  roundUpToSlot,
  timeToMinutes,
  toIsoLocal,
  toLocalDate,
} from "./time";

export interface SlotUsage {
  portions: number;
  orders: number;
}

/** Usage keyed by the ISO local start of each kitchen slot (ready time floored to the slot). */
export type CapacityUsage = Map<string, SlotUsage>;

export interface FulfilmentRequest {
  type: OrderType;
  /** Customer-facing time: pickup time, delivery arrival time, or dine-in arrival time. */
  date?: string;
  time?: string;
  asap?: boolean;
  zone?: DeliveryZone | null;
}

export interface SlotOption {
  /** Customer-facing time (pickup / delivery arrival / arrival at table). */
  time: string;
  at: string;
  /** When the kitchen must have the food ready. */
  readyAt: string;
  remainingPortions: number;
  available: boolean;
}

export interface FulfilmentPlan {
  ok: boolean;
  code?:
    | "ORDERING_PAUSED"
    | "OUTSIDE_ORDERING_HOURS"
    | "TIME_TOO_SOON"
    | "TOO_FAR_IN_ADVANCE"
    | "SLOT_FULL"
    | "RESTAURANT_CLOSED"
    | "DELIVERY_UNAVAILABLE"
    | "INVALID_TIME";
  message?: string;
  /** Accepted customer-facing time. */
  promisedAt?: DateTime;
  readyAt?: DateTime;
  prepStartAt?: DateTime;
  earliestPossible?: SlotOption | null;
  alternatives: SlotOption[];
}

export interface OrderTimingInput {
  now: DateTime;
  maxPrepMinutes: number;
  portions: number;
  ctx: CalendarContext;
  usage: CapacityUsage;
  /** For modifications: portions of the order being replaced, freed from its old slot. */
  release?: { slotKey: string; portions: number } | null;
}

export function slotKey(readyAt: DateTime, slotMinutes: number): string {
  return toIsoLocal(floorToSlot(readyAt, slotMinutes));
}

export function leadMinutes(maxPrepMinutes: number, ctx: CalendarContext): number {
  const o = ctx.settings.ordering;
  return Math.max(o.minLeadMinutes, maxPrepMinutes + o.prepBufferMinutes);
}

function offsetFor(req: FulfilmentRequest): number {
  return req.type === "delivery" ? (req.zone?.driveMinutes ?? 0) : 0;
}

/** Customer-facing time windows on a date (minutes), before capacity and lead time. */
export function fulfilmentWindows(date: string, req: FulfilmentRequest, ctx: CalendarContext): { start: number; end: number }[] {
  const o = ctx.settings.ordering;
  const day = getDayService(date, ctx);
  const windows = serviceWindows(day, "orders");
  const offset = offsetFor(req);
  const result: { start: number; end: number }[] = [];
  for (const w of windows) {
    // the kitchen can have food ready from open+X until close−Y
    const readyStart = w.start + o.firstReadyMinutesAfterOpen;
    const readyEnd = w.end - o.lastReadyMinutesBeforeClose;
    let start = readyStart + offset;
    let end = readyEnd + offset;
    if (req.type === "delivery") {
      start = Math.max(start, timeToMinutes(ctx.settings.delivery.start));
      end = Math.min(end, timeToMinutes(ctx.settings.delivery.end));
    }
    if (end >= start) result.push({ start, end });
  }
  return result;
}

function remainingAt(readyAt: DateTime, input: OrderTimingInput): { portions: number; orders: number } {
  const o = input.ctx.settings.ordering;
  const key = slotKey(readyAt, o.slotMinutes);
  const used = input.usage.get(key) ?? { portions: 0, orders: 0 };
  const released = input.release && input.release.slotKey === key ? input.release : null;
  return {
    portions: o.slotCapacityPortions - used.portions + (released?.portions ?? 0),
    orders: o.maxOrdersPerSlot - used.orders + (released ? 1 : 0),
  };
}

/** All customer-facing slots on a date with their availability for an order of `portions`. */
export function listSlots(date: string, req: FulfilmentRequest, input: OrderTimingInput): SlotOption[] {
  const o = input.ctx.settings.ordering;
  const offset = offsetFor(req);
  const earliestReady = roundUpToSlot(input.now.plus({ minutes: leadMinutes(input.maxPrepMinutes, input.ctx) }), o.slotMinutes);
  const slots: SlotOption[] = [];
  for (const w of fulfilmentWindows(date, req, input.ctx)) {
    const first = Math.ceil(w.start / o.slotMinutes) * o.slotMinutes;
    for (let m = first; m <= w.end; m += o.slotMinutes) {
      const at = localDateTime(date, m);
      const readyAt = at.minus({ minutes: offset });
      if (readyAt < earliestReady) continue;
      const rem = remainingAt(readyAt, input);
      slots.push({
        time: minutesToTime(m),
        at: toIsoLocal(at),
        readyAt: toIsoLocal(readyAt),
        remainingPortions: Math.max(0, rem.portions),
        available: rem.portions >= input.portions && rem.orders >= 1,
      });
    }
  }
  return slots;
}

/** Find the next N available slots starting at a date, searching forward within the advance window. */
export function nextAvailableSlots(fromDate: string, req: FulfilmentRequest, input: OrderTimingInput, count: number, after?: DateTime): SlotOption[] {
  const o = input.ctx.settings.ordering;
  const today = toLocalDate(input.now);
  const found: SlotOption[] = [];
  for (let i = 0; i <= o.maxAdvanceDays && found.length < count; i++) {
    const date = addDays(fromDate, i);
    if (daysBetween(today, date) > o.maxAdvanceDays) break;
    for (const s of listSlots(date, req, input)) {
      if (!s.available) continue;
      if (after && s.at <= toIsoLocal(after)) continue;
      found.push(s);
      if (found.length >= count) break;
    }
  }
  return found;
}

/**
 * Decide the accepted time for an order. Never accepts a time the kitchen cannot meet:
 * if the requested time is too soon, outside hours or full, returns alternatives instead.
 */
export function planFulfilment(req: FulfilmentRequest, input: OrderTimingInput): FulfilmentPlan {
  const { now, ctx } = input;
  const o = ctx.settings.ordering;
  const offset = offsetFor(req);
  const today = toLocalDate(now);
  const lead = leadMinutes(input.maxPrepMinutes, ctx);
  const earliestReady = roundUpToSlot(now.plus({ minutes: lead }), o.slotMinutes);

  if (!o.acceptingOrders) {
    return { ok: false, code: "ORDERING_PAUSED", message: "Online and phone ordering is paused at the moment. Please try again later.", alternatives: [] };
  }
  if (req.type === "delivery" && !ctx.settings.delivery.enabled) {
    return { ok: false, code: "DELIVERY_UNAVAILABLE", message: "Delivery is not available at the moment; pickup is still possible.", alternatives: [] };
  }

  if (req.asap || !req.date || !req.time) {
    const next = nextAvailableSlots(today, req, input, 4);
    if (next.length === 0) {
      return { ok: false, code: "SLOT_FULL", message: "There are no available times in the next few days.", alternatives: [] };
    }
    return accept(next[0], next.slice(1));
  }

  const requestedDate = req.date;
  const requestedMinutes = timeToMinutes(req.time);
  if (requestedMinutes % o.slotMinutes !== 0) {
    const alternatives = nextAvailableSlots(requestedDate, req, input, 3, localDateTime(requestedDate, requestedMinutes - o.slotMinutes));
    return { ok: false, code: "INVALID_TIME", message: `Times are scheduled in ${o.slotMinutes}-minute slots (e.g. 13:00, 13:15, 13:30).`, alternatives };
  }
  const requestedAt = localDateTime(requestedDate, requestedMinutes);
  const requestedReady = requestedAt.minus({ minutes: offset });

  if (daysBetween(today, requestedDate) > o.maxAdvanceDays) {
    return {
      ok: false,
      code: "TOO_FAR_IN_ADVANCE",
      message: `Regular orders can be placed up to ${o.maxAdvanceDays} days in advance. For later dates, place the order closer to the time or request a catering quote.`,
      alternatives: [],
    };
  }
  if (requestedReady < earliestReady) {
    const alternatives = nextAvailableSlots(today, req, input, 3);
    const label = req.type === "delivery" ? "delivery" : req.type === "pickup" ? "pickup" : "serving";
    return {
      ok: false,
      code: "TIME_TOO_SOON",
      message: `The kitchen needs at least ${lead} minutes for this order. The earliest ${label} time is ${alternatives[0] ? alternatives[0].time + (alternatives[0].at.slice(0, 10) !== requestedDate ? ` on ${alternatives[0].at.slice(0, 10)}` : "") : "not available today"}.`,
      earliestPossible: alternatives[0] ?? null,
      alternatives,
    };
  }
  const windows = fulfilmentWindows(requestedDate, req, ctx);
  if (windows.length === 0) {
    const alternatives = nextAvailableSlots(addDays(requestedDate, 1), req, input, 3);
    return { ok: false, code: "RESTAURANT_CLOSED", message: `We are not taking orders for ${requestedDate}.`, alternatives };
  }
  const inWindow = windows.some((w) => requestedMinutes >= w.start && requestedMinutes <= w.end);
  if (!inWindow) {
    const human = windows.map((w) => `${minutesToTime(w.start)}–${minutesToTime(w.end)}`).join(" and ");
    const alternatives = nextAvailableSlots(requestedDate, req, input, 3, minutesOfDay(requestedAt) < windows[0].start ? undefined : requestedAt);
    return {
      ok: false,
      code: "OUTSIDE_ORDERING_HOURS",
      message: `${req.type === "delivery" ? "Delivery" : req.type === "pickup" ? "Pickup" : "Pre-order"} times on ${requestedDate} are between ${human}.`,
      alternatives,
    };
  }
  const rem = remainingAt(requestedReady, input);
  if (rem.portions < input.portions || rem.orders < 1) {
    const before = listSlots(requestedDate, req, input).filter((s) => s.available && s.at < toIsoLocal(requestedAt)).slice(-1);
    const after = nextAvailableSlots(requestedDate, req, input, 2, requestedAt);
    return {
      ok: false,
      code: "SLOT_FULL",
      message: `The kitchen is fully booked at ${req.time} on ${requestedDate}.`,
      alternatives: [...before, ...after],
    };
  }
  return accept(
    {
      time: req.time,
      at: toIsoLocal(requestedAt),
      readyAt: toIsoLocal(requestedReady),
      remainingPortions: rem.portions,
      available: true,
    },
    [],
  );

  function accept(slot: SlotOption, alternatives: SlotOption[]): FulfilmentPlan {
    const promisedAt = localDateTime(slot.at.slice(0, 10), slot.time);
    const readyAt = promisedAt.minus({ minutes: offset });
    const prepStartAt = readyAt.minus({ minutes: input.maxPrepMinutes + o.prepBufferMinutes });
    return { ok: true, promisedAt, readyAt, prepStartAt, earliestPossible: slot, alternatives };
  }
}
