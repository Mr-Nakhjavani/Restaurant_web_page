import type { DateTime } from "luxon";
import type { CalendarContext } from "./hours";
import { getDayService, serviceWindows } from "./hours";
import type { RestaurantSettings } from "./settings";
import type { PricedLine } from "./pricing";
import { addDays, daysBetween, localDateTime, minutesToTime, timeToMinutes, toIsoLocal, toLocalDate } from "./time";
import { percentOf } from "./money";

export type BulkIssueCode =
  | "BULK_ORDERS_PAUSED"
  | "ITEM_NOT_BULK_ELIGIBLE"
  | "BELOW_ITEM_MINIMUM"
  | "ITEM_DAILY_MAXIMUM_EXCEEDED"
  | "EXCEEDS_MAX_BULK_PORTIONS"
  | "INSUFFICIENT_NOTICE"
  | "DAILY_CAPACITY_EXCEEDED"
  | "OUTSIDE_FULFILMENT_HOURS"
  | "RESTAURANT_CLOSED"
  | "TOO_FAR_IN_ADVANCE"
  | "DATE_IN_PAST"
  | "ITEM_UNAVAILABLE_ON_DATE"
  | "UNKNOWN_MENU_ITEM"
  | "INVALID_CUSTOMIZATION"
  | "INVALID_QUANTITY"
  | "DELIVERY_ADDRESS_REQUIRED"
  | "DELIVERY_AREA_NOT_SERVED"
  | "BELOW_DELIVERY_MINIMUM";

export interface BulkIssue {
  code: BulkIssueCode;
  message: string;
  itemId?: string | null;
  /** true = cannot be solved by choosing another date (needs a different order or escalation). */
  blocking: boolean;
}

export function requiredNoticeHours(portions: number, lines: PricedLine[], settings: RestaurantSettings): number {
  const tiers = [...settings.bulk.noticeTiers].sort((a, b) => a.maxPortions - b.maxPortions);
  const tier = tiers.find((t) => portions <= t.maxPortions) ?? tiers[tiers.length - 1];
  const itemMax = Math.max(0, ...lines.map((l) => l.item.bulk.minNoticeHours ?? 0));
  return Math.max(tier.hours, itemMax);
}

export function bulkDiscountPercent(portions: number, settings: RestaurantSettings): number {
  const tiers = [...settings.bulk.discountTiers].sort((a, b) => b.minPortions - a.minPortions);
  return tiers.find((t) => portions >= t.minPortions)?.percent ?? 0;
}

export function depositFor(totalFils: number, settings: RestaurantSettings): number {
  return totalFils >= settings.bulk.depositThresholdFils ? percentOf(totalFils, settings.bulk.depositPercent) : 0;
}

export interface BulkFeasibilityInput {
  lines: PricedLine[];
  portions: number;
  fulfilmentAt: DateTime;
  now: DateTime;
  ctx: CalendarContext;
  /** Bulk portions already committed on each local date. */
  committedPortionsByDate: Map<string, number>;
  /** Units of each item already committed by bulk orders on each date: key `${date}|${itemId}`. */
  committedItemUnits: Map<string, number>;
}

export function fulfilmentWindowOn(date: string, ctx: CalendarContext): { start: number; end: number } | null {
  const day = getDayService(date, ctx);
  const windows = serviceWindows(day, "orders");
  if (windows.length === 0) return null;
  const start = Math.max(Math.min(...windows.map((w) => w.start)), timeToMinutes(ctx.settings.bulk.fulfilmentStart));
  const end = Math.min(Math.max(...windows.map((w) => w.end)), timeToMinutes(ctx.settings.bulk.fulfilmentEnd));
  return end >= start ? { start, end } : null;
}

export function bulkIssuesFor(input: BulkFeasibilityInput, at: DateTime): BulkIssue[] {
  const { ctx, now, lines, portions } = input;
  const s = ctx.settings.bulk;
  const issues: BulkIssue[] = [];
  const date = toLocalDate(at);
  if (!s.acceptingBulkOrders) issues.push({ code: "BULK_ORDERS_PAUSED", message: "We are not accepting new catering orders at the moment.", blocking: true });
  if (portions > s.maxPortionsPerOrder) {
    issues.push({
      code: "EXCEEDS_MAX_BULK_PORTIONS",
      message: `A single catering order can include up to ${s.maxPortionsPerOrder} portions (requested ${portions}). Larger events are handled by our events team.`,
      blocking: true,
    });
  }
  for (const l of lines) {
    if (!l.item.bulk.eligible) {
      issues.push({ code: "ITEM_NOT_BULK_ELIGIBLE", message: `${l.item.name} is cooked to order and is not available for catering quantities.`, itemId: l.item.id, blocking: true });
      continue;
    }
    if (l.item.bulk.minQuantity && l.quantity < l.item.bulk.minQuantity) {
      issues.push({ code: "BELOW_ITEM_MINIMUM", message: `${l.item.name} has a minimum of ${l.item.bulk.minQuantity} per order.`, itemId: l.item.id, blocking: true });
    }
    const maxDay = l.item.bulk.maxQuantityPerDay;
    if (maxDay !== undefined) {
      const used = input.committedItemUnits.get(`${date}|${l.item.id}`) ?? 0;
      if (l.quantity > maxDay) {
        issues.push({ code: "ITEM_DAILY_MAXIMUM_EXCEEDED", message: `We can prepare at most ${maxDay} × ${l.item.name} per day.`, itemId: l.item.id, blocking: true });
      } else if (used + l.quantity > maxDay) {
        issues.push({ code: "ITEM_DAILY_MAXIMUM_EXCEEDED", message: `Only ${Math.max(0, maxDay - used)} × ${l.item.name} can still be prepared on ${date}.`, itemId: l.item.id, blocking: false });
      }
    }
  }
  if (at < now) {
    issues.push({ code: "DATE_IN_PAST", message: "The requested time has already passed.", blocking: false });
    return issues;
  }
  if (daysBetween(toLocalDate(now), date) > s.maxAdvanceDays) {
    issues.push({ code: "TOO_FAR_IN_ADVANCE", message: `Catering orders can be placed up to ${s.maxAdvanceDays} days ahead.`, blocking: false });
  }
  const notice = requiredNoticeHours(portions, lines, ctx.settings);
  const hoursAhead = at.diff(now, "hours").hours;
  if (hoursAhead < notice) {
    issues.push({
      code: "INSUFFICIENT_NOTICE",
      message: `An order of ${portions} portions needs at least ${notice} hours' notice; the requested time is ${Math.max(0, Math.floor(hoursAhead))} hours away.`,
      blocking: false,
    });
  }
  const window = fulfilmentWindowOn(date, ctx);
  if (!window) {
    issues.push({ code: "RESTAURANT_CLOSED", message: `We are not fulfilling catering orders on ${date}.`, blocking: false });
  } else {
    const m = at.hour * 60 + at.minute;
    if (m < window.start || m > window.end) {
      issues.push({
        code: "OUTSIDE_FULFILMENT_HOURS",
        message: `Catering collection or delivery on ${date} is between ${minutesToTime(window.start)} and ${minutesToTime(window.end)}.`,
        blocking: false,
      });
    }
  }
  const committed = input.committedPortionsByDate.get(date) ?? 0;
  if (committed + portions > s.dailyCapacityPortions) {
    issues.push({
      code: "DAILY_CAPACITY_EXCEEDED",
      message: `Our catering kitchen has ${Math.max(0, s.dailyCapacityPortions - committed)} of ${s.dailyCapacityPortions} portions left on ${date}.`,
      blocking: portions > s.dailyCapacityPortions,
    });
  }
  return issues;
}

/** Earliest feasible fulfilment times (one per date) after the requested time, honouring notice and capacity. */
export function feasibleAlternatives(input: BulkFeasibilityInput, count = 3): { date: string; time: string; at: string }[] {
  const { ctx, now } = input;
  const notice = requiredNoticeHours(input.portions, input.lines, ctx.settings);
  const earliest = now.plus({ hours: notice });
  const preferredMinute = input.fulfilmentAt.hour * 60 + input.fulfilmentAt.minute;
  const startDate = toLocalDate(earliest > input.fulfilmentAt ? earliest : input.fulfilmentAt);
  const results: { date: string; time: string; at: string }[] = [];
  for (let i = 0; i < ctx.settings.bulk.maxAdvanceDays && results.length < count; i++) {
    const date = addDays(startDate, i);
    const window = fulfilmentWindowOn(date, ctx);
    if (!window) continue;
    let minute = Math.min(Math.max(preferredMinute, window.start), window.end);
    let at = localDateTime(date, minute);
    if (at < earliest) {
      const em = earliest.hour * 60 + earliest.minute;
      if (toLocalDate(earliest) !== date) continue;
      minute = Math.ceil(em / 30) * 30;
      if (minute > window.end) continue;
      at = localDateTime(date, minute);
    }
    const issues = bulkIssuesFor(input, at);
    if (issues.length === 0) results.push({ date, time: minutesToTime(minute), at: toIsoLocal(at) });
  }
  return results;
}
