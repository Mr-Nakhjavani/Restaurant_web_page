import { DateTime } from "luxon";
import type { CatalogItem } from "./catalog";
import type { CalendarContext } from "./hours";
import { getDayService, periodsOn, serviceWindows } from "./hours";
import type { AvailabilityRule, Channel, OrderType } from "./types";
import { WEEKDAY_NAMES } from "./types";
import {
  formatHumanDate,
  isoWeekday,
  localDateTime,
  minutesOfDay,
  minutesToTime,
  RESTAURANT_TZ,
  timeToMinutes,
  toIsoLocal,
  toLocalDate,
} from "./time";

/** How the dish would be obtained. `dine_in` = eating at the restaurant without a pre-order. */
export type FulfilmentMode = OrderType | "dine_in";

export const AVAILABILITY_REASON_CODES = [
  "ITEM_PAUSED",
  "ITEM_SOLD_OUT",
  "DAILY_LIMIT_REACHED",
  "NOT_AVAILABLE_ON_DAY",
  "OUTSIDE_ITEM_HOURS",
  "OUTSIDE_DATE_RANGE",
  "OUTSIDE_SPECIAL_PERIOD",
  "NOT_DURING_SPECIAL_PERIOD",
  "FULFILMENT_NOT_SUPPORTED",
  "INSUFFICIENT_NOTICE",
  "SAME_DAY_CUTOFF_PASSED",
  "PREORDERS_NOT_OPEN",
  "BELOW_MINIMUM_QUANTITY",
  "CHANNEL_NOT_ALLOWED",
  "BULK_ONLY_ITEM",
  "RESTAURANT_CLOSED",
  "IN_THE_PAST",
] as const;
export type AvailabilityReasonCode = (typeof AVAILABILITY_REASON_CODES)[number];

export interface AvailabilityReason {
  code: AvailabilityReasonCode;
  message: string;
}

export interface AvailabilityQuery {
  /** When the guest would receive the dish (pickup/ready time, delivery arrival, or dining time). */
  at: DateTime;
  now: DateTime;
  mode?: FulfilmentMode;
  channel?: Channel;
  quantity?: number;
  /** Units of this item already committed for the `at` date (for daily limits). */
  alreadyOrderedOnDate?: number;
  /** Bulk/catering flow: bulk-only items allowed, daily limits handled by bulk capacity. */
  bulk?: boolean;
  /** Skip the (more expensive) next-available search when only `orderable` matters. */
  skipNextAvailable?: boolean;
}

export interface ItemAvailability {
  itemId: string;
  orderable: boolean;
  status: "available" | "unavailable" | "sold_out";
  reasons: AvailabilityReason[];
  /** The dish's serving window on the requested date, if it is served that day. */
  servingWindow: { start: string; end: string } | null;
  remainingOnDate: number | null;
  nextAvailable: { date: string; time: string; at: string; description: string } | null;
  checkedFor: { date: string; time: string; at: string; mode: FulfilmentMode | null };
}

const MODE_LABEL: Record<FulfilmentMode, string> = {
  pickup: "pickup",
  delivery: "delivery",
  dine_in_preorder: "dine-in pre-order",
  dine_in: "dining in",
};

function modeAllowedByFulfilment(item: CatalogItem, mode: FulfilmentMode): boolean {
  switch (mode) {
    case "pickup":
      return item.fulfilment.pickup;
    case "delivery":
      return item.fulfilment.delivery;
    case "dine_in_preorder":
      return item.fulfilment.dineInPreorder;
    case "dine_in":
      return item.fulfilment.dineIn;
  }
}

/** Static (calendar) rules: does the item get served on this date and minute at all? */
function calendarReasons(item: CatalogItem, date: string, minute: number, ctx: CalendarContext): AvailabilityReason[] {
  const reasons: AvailabilityReason[] = [];
  const periods = periodsOn(date, ctx.specialPeriods);
  for (const rule of item.availabilityRules) {
    switch (rule.type) {
      case "days_of_week": {
        const wd = isoWeekday(date);
        if (!rule.days.includes(wd)) {
          const days = rule.days.map((d) => WEEKDAY_NAMES[d] + "s").join(" and ");
          reasons.push({ code: "NOT_AVAILABLE_ON_DAY", message: `${item.name} is only available on ${days}; ${formatHumanDate(date)} is a ${WEEKDAY_NAMES[wd]}.` });
        }
        break;
      }
      case "time_window": {
        const s = timeToMinutes(rule.start);
        const e = timeToMinutes(rule.end);
        if (minute < s || minute > e) {
          reasons.push({ code: "OUTSIDE_ITEM_HOURS", message: `${item.name} is served between ${rule.start} and ${rule.end}.` });
        }
        break;
      }
      case "date_range":
        if (date < rule.start || date > rule.end) {
          reasons.push({ code: "OUTSIDE_DATE_RANGE", message: `${item.name} is only available from ${formatHumanDate(rule.start)} to ${formatHumanDate(rule.end)}.` });
        }
        break;
      case "during_period": {
        if (!periods.some((p) => p.type === rule.periodType)) {
          const upcoming = ctx.specialPeriods
            .filter((p) => p.type === rule.periodType && p.endDate >= date)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
          const when = upcoming
            ? ` The next period is ${upcoming.name}: ${formatHumanDate(upcoming.startDate)} to ${formatHumanDate(upcoming.endDate)}${upcoming.provisional ? " (provisional)" : ""}.`
            : "";
          reasons.push({ code: "OUTSIDE_SPECIAL_PERIOD", message: `${item.name} is only available during ${periodLabel(rule.periodType)}.${when}` });
        }
        break;
      }
      case "not_during_period":
        if (periods.some((p) => p.type === rule.periodType)) {
          reasons.push({ code: "NOT_DURING_SPECIAL_PERIOD", message: `${item.name} is not served during ${periodLabel(rule.periodType)}.` });
        }
        break;
      default:
        break;
    }
  }
  return reasons;
}

function periodLabel(type: string): string {
  switch (type) {
    case "ramadan":
      return "Ramadan";
    case "national_day":
      return "Eid Al Etihad (UAE National Day)";
    case "eid_al_fitr":
      return "Eid Al Fitr";
    case "eid_al_adha":
      return "Eid Al Adha";
    default:
      return "the special period";
  }
}

/** Ordering rules relative to the moment the order is placed. */
function orderingReasons(item: CatalogItem, q: AvailabilityQuery): AvailabilityReason[] {
  const reasons: AvailabilityReason[] = [];
  const atDate = toLocalDate(q.at);
  const nowDate = toLocalDate(q.now);
  for (const rule of item.availabilityRules) {
    switch (rule.type) {
      case "order_types":
        if (q.mode && q.mode !== "dine_in" && !rule.allowed.includes(q.mode)) {
          reasons.push({ code: "FULFILMENT_NOT_SUPPORTED", message: `${item.name} can only be ordered for ${rule.allowed.map((m) => MODE_LABEL[m]).join(" or ")}.` });
        }
        break;
      case "min_notice_hours":
        if (q.mode && q.mode !== "dine_in" && q.at.diff(q.now, "minutes").minutes < rule.hours * 60) {
          reasons.push({ code: "INSUFFICIENT_NOTICE", message: `${item.name} must be ordered at least ${rule.hours} hour${rule.hours === 1 ? "" : "s"} in advance.` });
        }
        break;
      case "same_day_cutoff":
        if (q.mode && q.mode !== "dine_in" && atDate === nowDate && minutesOfDay(q.now) > timeToMinutes(rule.time)) {
          reasons.push({ code: "SAME_DAY_CUTOFF_PASSED", message: `Same-day orders for ${item.name} must be placed by ${rule.time}.` });
        }
        break;
      case "orders_open_from":
        if (q.mode && q.mode !== "dine_in" && nowDate < rule.date) {
          reasons.push({ code: "PREORDERS_NOT_OPEN", message: `Orders for ${item.name} open on ${formatHumanDate(rule.date)}.` });
        }
        break;
      case "min_quantity":
        if (q.mode && q.mode !== "dine_in" && (q.quantity ?? 1) < rule.quantity) {
          reasons.push({ code: "BELOW_MINIMUM_QUANTITY", message: `${item.name} has a minimum order of ${rule.quantity}.` });
        }
        break;
      case "channels":
        if (q.channel && !rule.allowed.includes(q.channel)) {
          reasons.push({ code: "CHANNEL_NOT_ALLOWED", message: `${item.name} cannot be ordered through this channel.` });
        }
        break;
      default:
        break;
    }
  }
  return reasons;
}

/** The dish's own serving window on a date (intersection of restaurant hours and item time windows). */
export function servingWindowOn(item: CatalogItem, date: string, ctx: CalendarContext): { start: number; end: number } | null {
  const day = getDayService(date, ctx);
  const windows = serviceWindows(day, "dining").concat(serviceWindows(day, "orders"));
  if (windows.length === 0) return null;
  let start = Math.min(...windows.map((w) => w.start));
  let end = Math.max(...windows.map((w) => w.end)) - ctx.settings.kitchenLastOrderMinutesBeforeClose;
  for (const rule of item.availabilityRules) {
    if (rule.type === "time_window") {
      start = Math.max(start, timeToMinutes(rule.start));
      end = Math.min(end, timeToMinutes(rule.end));
    }
  }
  if (end < start) return null;
  if (calendarReasons(item, date, start, ctx).length > 0) return null;
  return { start, end };
}

function soldOutAt(item: CatalogItem, at: DateTime, now: DateTime): boolean {
  if (item.availabilityStatus !== "sold_out") return false;
  if (!item.soldOutUntil) return true;
  const until = DateTime.fromISO(item.soldOutUntil, { zone: RESTAURANT_TZ });
  return now < until && at < until;
}

export function evaluateItemAvailability(item: CatalogItem, q: AvailabilityQuery, ctx: CalendarContext): ItemAvailability {
  const date = toLocalDate(q.at);
  const minute = minutesOfDay(q.at);
  const reasons: AvailabilityReason[] = [];

  if (item.availabilityStatus === "paused" || !item.isVisible) {
    reasons.push({ code: "ITEM_PAUSED", message: `${item.name} is temporarily unavailable.` });
  }
  if (soldOutAt(item, q.at, q.now)) {
    reasons.push({ code: "ITEM_SOLD_OUT", message: `${item.name} is sold out${item.soldOutUntil ? " for today" : ""}.` });
  }
  if (item.bulk.bulkOnly && !q.bulk) {
    reasons.push({ code: "BULK_ONLY_ITEM", message: `${item.name} is a catering item and must be ordered through a catering (bulk) quote.` });
  }
  if (q.mode && !modeAllowedByFulfilment(item, q.mode)) {
    reasons.push({ code: "FULFILMENT_NOT_SUPPORTED", message: `${item.name} is not available for ${MODE_LABEL[q.mode]}.` });
  }
  if (q.at < q.now.minus({ minutes: 1 })) {
    reasons.push({ code: "IN_THE_PAST", message: "The requested time is in the past." });
  }

  const day = getDayService(date, ctx);
  const restaurantWindows = serviceWindows(day, q.mode === "dine_in" ? "dining" : "orders");
  if (restaurantWindows.length === 0) {
    reasons.push({ code: "RESTAURANT_CLOSED", message: `The restaurant is closed on ${formatHumanDate(date)}.` });
  }

  reasons.push(...calendarReasons(item, date, minute, ctx));
  reasons.push(...orderingReasons(item, q));

  let remaining: number | null = null;
  if (item.dailyLimit !== null && !q.bulk) {
    remaining = Math.max(0, item.dailyLimit - (q.alreadyOrderedOnDate ?? 0));
    if (remaining < (q.quantity ?? 1)) {
      reasons.push({
        code: "DAILY_LIMIT_REACHED",
        message:
          remaining === 0
            ? `${item.name} is fully booked for ${formatHumanDate(date)} (limit ${item.dailyLimit} per day).`
            : `Only ${remaining} ${item.name} remaining for ${formatHumanDate(date)}.`,
      });
    }
  }

  const window = servingWindowOn(item, date, ctx);
  const deduped = dedupeReasons(reasons);
  const soldOut = deduped.some((r) => r.code === "ITEM_SOLD_OUT" || r.code === "DAILY_LIMIT_REACHED");
  const orderable = deduped.length === 0;
  return {
    itemId: item.id,
    orderable,
    status: orderable ? "available" : soldOut ? "sold_out" : "unavailable",
    reasons: deduped,
    servingWindow: window ? { start: minutesToTime(window.start), end: minutesToTime(window.end) } : null,
    remainingOnDate: remaining,
    nextAvailable: orderable || q.skipNextAvailable
      ? null
      : findNextAvailable(item, q, ctx, {
          skipDate: deduped.some((r) => r.code === "ITEM_SOLD_OUT" || r.code === "DAILY_LIMIT_REACHED") ? date : undefined,
        }),
    checkedFor: { date, time: minutesToTime(minute), at: toIsoLocal(q.at), mode: q.mode ?? null },
  };
}

function dedupeReasons(reasons: AvailabilityReason[]): AvailabilityReason[] {
  const seen = new Set<string>();
  return reasons.filter((r) => {
    const key = r.code + r.message;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Next date/time (from the requested moment, or now if later) when the item could be served,
 * considering calendar rules, minimum notice and sold-out state. Searches up to 400 days ahead.
 */
export function findNextAvailable(
  item: CatalogItem,
  q: AvailabilityQuery,
  ctx: CalendarContext,
  opts?: { skipDate?: string },
): ItemAvailability["nextAvailable"] {
  if (item.availabilityStatus === "paused" || !item.isVisible) return null;
  if (q.mode && !modeAllowedByFulfilment(item, q.mode)) return null;
  let earliest = q.at > q.now ? q.at : q.now;
  for (const rule of item.availabilityRules) {
    if (rule.type === "min_notice_hours" && q.mode && q.mode !== "dine_in") {
      const n = q.now.plus({ hours: rule.hours });
      if (n > earliest) earliest = n;
    }
  }
  if (item.availabilityStatus === "sold_out" && item.soldOutUntil) {
    const until = DateTime.fromISO(item.soldOutUntil, { zone: RESTAURANT_TZ });
    if (until > earliest) earliest = until;
  }
  const earliestDate = toLocalDate(earliest);
  for (let i = 0; i < 400; i++) {
    const date = localDateTime(earliestDate, 0).plus({ days: i }).toISODate()!;
    if (opts?.skipDate === date) continue;
    const w = servingWindowOn(item, date, ctx);
    if (!w) continue;
    let minute = w.start;
    if (date === earliestDate) minute = Math.max(minute, Math.ceil(minutesOfDay(earliest) / 15) * 15);
    if (minute > w.end) continue;
    const at = localDateTime(date, minute);
    return { date, time: minutesToTime(minute), at: toIsoLocal(at), description: describeRuleSummary(item.availabilityRules) };
  }
  return null;
}

export function describeRuleSummary(rules: AvailabilityRule[]): string {
  const parts: string[] = [];
  for (const r of rules) {
    if (r.type === "days_of_week") parts.push(`${r.days.map((d) => WEEKDAY_NAMES[d]).join(" & ")} only`);
    if (r.type === "time_window") parts.push(`${r.start}–${r.end}`);
    if (r.type === "date_range") parts.push(`${r.start} to ${r.end}`);
    if (r.type === "during_period") parts.push(`during ${periodLabel(r.periodType)}`);
    if (r.type === "not_during_period") parts.push(`not during ${periodLabel(r.periodType)}`);
  }
  return parts.length ? parts.join(", ") : "whenever the kitchen is open";
}
