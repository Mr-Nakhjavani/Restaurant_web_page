import { Prisma, type Order, type OrderEvent, type OrderItem, type Reservation } from "@prisma/client";
import type { z } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import { composeItem, type Catalog } from "@/domain/catalog";
import { evaluateItemAvailability, type ItemAvailability } from "@/domain/availability";
import { allServedAreas, deliveryFee, findDeliveryZone, type ZoneMatch } from "@/domain/delivery";
import { money, vatIncluded } from "@/domain/money";
import {
  leadMinutes,
  nextAvailableSlots,
  listSlots,
  planFulfilment,
  slotKey,
  type CapacityUsage,
  type FulfilmentPlan,
  type FulfilmentRequest,
  type SlotOption,
} from "@/domain/order-rules";
import { checkPhone, maskPhone } from "@/domain/phone";
import { ALLERGY_KEYWORDS, PAYMENT_METHOD_LABELS } from "@/domain/policies";
import { priceLines, type LineInput, type PricedLine } from "@/domain/pricing";
import { generateAccessToken, generateReference, hashToken, normaliseReference } from "@/domain/references";
import {
  CAPACITY_ORDER_STATUSES,
  CUSTOMER_MUTABLE_ORDER_STATUSES,
  ORDER_STATUS_INFO,
  allowedOrderTransitions,
  canTransitionOrder,
  type OrderStatus,
} from "@/domain/status";
import { addDays, formatHumanDateTime, localDateTime, RESTAURANT_TZ, toIsoLocal, toLocalDate, toLocalTime, timeToMinutes } from "@/domain/time";
import type { OrderType } from "@/domain/types";
import type { PaymentMethod } from "@/domain/settings";
import type { CreateOrderSchema, DeliveryAddressSchema, OrderQuoteRequestSchema, OrderQuoteSchema, OrderSchema, OrderStatusSchema, UpdateOrderSchema } from "../contracts/orders";
import { prisma, type Tx } from "../db";
import { ApiError, ERROR_CATALOG, type ErrorCode } from "../errors";
import { getConfig } from "../config";
import { logger } from "../logger";
import { actorName, channelFor, isStaff, sourceFor, type Principal } from "../auth/principal";
import { assertRecordAccess, requireVerificationInput, type VerificationInput } from "../auth/verification";
import { loadCatalog, loadRestaurantContext, type RestaurantContext } from "../repositories/catalog-repo";
import { suggestAlternatives } from "./menu-service";
import { withDateLocks } from "./locks";

export type OrderQuote = z.infer<typeof OrderQuoteSchema>;
export type OrderDto = z.infer<typeof OrderSchema>;
export type OrderStatusDto = z.infer<typeof OrderStatusSchema>;
export type QuoteInput = z.infer<typeof OrderQuoteRequestSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
type DeliveryAddress = z.infer<typeof DeliveryAddressSchema>;

type Issue = OrderQuote["issues"][number];
const issue = (code: ErrorCode | string, message: string, extra?: { lineIndex?: number; itemId?: string; details?: Record<string, unknown> }): Issue => ({
  code,
  message,
  lineIndex: extra?.lineIndex ?? null,
  itemId: extra?.itemId ?? null,
  details: extra?.details ?? null,
});

// ---------------------------------------------------------------------------
// Capacity data
// ---------------------------------------------------------------------------

async function slotUsage(db: Tx | typeof prisma, fromDate: string, toDate: string, slotMinutes: number, excludeOrderId?: string): Promise<CapacityUsage> {
  const rows = await db.order.findMany({
    where: {
      kind: "regular",
      localDate: { gte: fromDate, lte: toDate },
      status: { in: CAPACITY_ORDER_STATUSES },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    select: { readyAt: true, kitchenPortions: true },
  });
  const usage: CapacityUsage = new Map();
  for (const r of rows) {
    const key = slotKey(DateTime.fromJSDate(r.readyAt).setZone(RESTAURANT_TZ), slotMinutes);
    const u = usage.get(key) ?? { portions: 0, orders: 0 };
    u.portions += r.kitchenPortions;
    u.orders += 1;
    usage.set(key, u);
  }
  return usage;
}

async function itemUsageByDate(db: Tx | typeof prisma, dates: string[], excludeOrderId?: string): Promise<Map<string, number>> {
  const rows = await db.orderItem.findMany({
    where: {
      status: "active",
      order: { kind: "regular", localDate: { in: dates }, status: { in: CAPACITY_ORDER_STATUSES }, ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}) },
    },
    select: { menuItemId: true, quantity: true, order: { select: { localDate: true } } },
  });
  const m = new Map<string, number>();
  for (const r of rows) m.set(`${r.order.localDate}|${r.menuItemId}`, (m.get(`${r.order.localDate}|${r.menuItemId}`) ?? 0) + r.quantity);
  return m;
}

// ---------------------------------------------------------------------------
// Evaluation shared by quote, create and modify
// ---------------------------------------------------------------------------

interface EvaluateInput {
  items: LineInput[];
  type: OrderType;
  asap: boolean;
  date?: string;
  time?: string;
  reservationReference?: string;
  deliveryAddress?: DeliveryAddress;
  customerPhone?: string;
}

interface Evaluation {
  issues: Issue[];
  priced: PricedLine[];
  availability: Map<number, ItemAvailability>;
  alternativesByLine: Map<number, OrderQuote["lines"][number]["alternatives"]>;
  portions: number;
  maxPrep: number;
  plan: FulfilmentPlan | null;
  slotsForDate: SlotOption[];
  zone: ZoneMatch | null;
  subtotalFils: number;
  deliveryFeeFils: number;
  totalFils: number;
  reservation: Reservation | null;
  requiresManualReview: boolean;
  reviewReason: string | null;
  notices: string[];
  lead: number;
}

async function evaluate(
  input: EvaluateInput,
  ctx: RestaurantContext,
  catalog: Catalog,
  principal: Principal,
  now: DateTime,
  db: Tx | typeof prisma,
  excludeOrderId?: string,
): Promise<Evaluation> {
  const o = ctx.settings.ordering;
  const issues: Issue[] = [];
  const notices: string[] = [];
  const { priced, issues: lineIssues } = priceLines(catalog, input.items, { maxQuantityPerLine: o.maxQuantityPerLine });
  for (const li of lineIssues) issues.push(issue(li.code, li.message, { lineIndex: li.lineIndex, itemId: li.itemId, details: li.details }));
  if (input.items.length === 0) issues.push(issue("EMPTY_ORDER", "The order has no items."));

  for (const l of priced) {
    if (l.item.bulk.bulkOnly) {
      issues.push(issue("BULK_ONLY_ITEM", `${l.item.name} is a catering item. Request a catering quote (POST /api/v1/bulk-orders/quotes).`, { lineIndex: l.lineIndex, itemId: l.itemId }));
    }
  }
  const portions = priced.reduce((s, l) => s + l.kitchenPortions, 0);
  const maxPrep = Math.max(0, ...priced.filter((l) => !l.item.bulk.bulkOnly).map((l) => l.item.prepTimeMinutes));
  if (portions > o.maxPortionsPerOrder) {
    issues.push(
      issue("REQUIRES_BULK_ORDER", `This order has ${portions} kitchen portions. Regular orders are limited to ${o.maxPortionsPerOrder}; larger orders are catering orders that need advance notice.`, {
        details: { portions, maxPortionsPerOrder: o.maxPortionsPerOrder, nextStep: "POST /api/v1/bulk-orders/quotes" },
      }),
    );
  }

  // --- delivery ---
  let zone: ZoneMatch | null = null;
  if (input.type === "delivery") {
    if (!ctx.settings.delivery.enabled) issues.push(issue("DELIVERY_UNAVAILABLE", "Delivery is not available at the moment. Pickup is available."));
    const a = input.deliveryAddress;
    const missing = !a ? ["area", "building", "street"] : (["area", "building", "street"] as const).filter((k) => !a[k]);
    if (missing.length) {
      issues.push(issue("DELIVERY_ADDRESS_REQUIRED", `Delivery orders need the ${missing.join(", ")}.`, { details: { missing } }));
    } else if (a) {
      zone = findDeliveryZone(a.area, ctx.settings);
      if (!zone) {
        issues.push(
          issue("DELIVERY_AREA_NOT_SERVED", `We do not deliver to “${a.area}”. Delivery covers central Dubai only; pickup is available.`, {
            details: { servedAreas: allServedAreas(ctx.settings, true) },
          }),
        );
      } else if (!zone.zone.regularOrders) {
        issues.push(
          issue("DELIVERY_ZONE_CATERING_ONLY", `${zone.area} is in ${zone.zone.name}: we deliver catering orders there, but not regular takeaway orders.`, {
            details: { zone: zone.zone.id, minimumCateringOrder: money(zone.zone.minimumOrderFils) },
          }),
        );
        zone = null;
      }
    }
    if (input.customerPhone) {
      const p = checkPhone(input.customerPhone);
      if (p.valid && !p.isUaeMobile) issues.push(issue("DELIVERY_REQUIRES_UAE_MOBILE", "Delivery orders need a UAE mobile number so our driver can call on arrival."));
    }
  } else if (input.deliveryAddress) {
    notices.push("A delivery address was supplied but is not needed for this order type and was ignored.");
  }

  // --- dine-in pre-order ---
  let reservation: Reservation | null = null;
  let date = input.date;
  let time = input.time;
  if (input.type === "dine_in_preorder") {
    if (!input.reservationReference) {
      issues.push(issue("RESERVATION_REQUIRED_FOR_PREORDER", "Dine-in pre-orders need a reservation reference. Book a table first."));
    } else {
      const ref = normaliseReference(input.reservationReference, "reservation");
      reservation = ref ? await db.reservation.findUnique({ where: { reference: ref } }) : null;
      const phone = input.customerPhone ? checkPhone(input.customerPhone) : null;
      if (!reservation || (phone?.valid && phone.e164 !== reservation.phone)) {
        issues.push(issue("RESERVATION_MISMATCH", "We could not find a reservation with that reference for this phone number."));
        reservation = null;
      } else if (reservation.status !== "confirmed") {
        issues.push(issue("RESERVATION_MISMATCH", `Reservation ${reservation.reference} is ${reservation.status.replace(/_/g, " ")}; pre-orders need a confirmed reservation.`));
      } else {
        date = date ?? reservation.date;
        time = time ?? reservation.time;
        const start = timeToMinutes(reservation.time);
        const t = timeToMinutes(time);
        if (date !== reservation.date || t < start || t > start + 60) {
          issues.push(issue("RESERVATION_MISMATCH", `Pre-ordered food must be served between ${reservation.time} and one hour after on ${reservation.date} (your reservation).`));
        }
      }
    }
  }

  // --- timing & capacity ---
  const today = toLocalDate(now);
  const horizon = addDays(today, o.maxAdvanceDays + 1);
  const usage = await slotUsage(db, today, horizon, o.slotMinutes, excludeOrderId);
  const req: FulfilmentRequest = { type: input.type, date, time, asap: input.asap || !date || !time, zone: zone?.zone ?? null };
  const timing = { now, maxPrepMinutes: maxPrep, portions, ctx, usage };
  const lead = leadMinutes(maxPrep, ctx);
  let plan: FulfilmentPlan | null = null;
  const availability = new Map<number, ItemAvailability>();
  const alternativesByLine = new Map<number, OrderQuote["lines"][number]["alternatives"]>();
  const blockingBeforeTiming = issues.some((i) => ["DELIVERY_ADDRESS_REQUIRED", "DELIVERY_AREA_NOT_SERVED", "DELIVERY_ZONE_CATERING_ONLY"].includes(i.code));
  const usageDates = [...new Set([today, date ?? today, ...Array.from({ length: o.maxAdvanceDays + 1 }, (_, i) => addDays(today, i))])];
  const itemUsage = await itemUsageByDate(db, usageDates, excludeOrderId);
  const qtyByItem = new Map<string, number>();
  for (const l of priced) qtyByItem.set(l.itemId, (qtyByItem.get(l.itemId) ?? 0) + l.quantity);

  const checkItemsAt = (at: DateTime, quick = true) => {
    const d = toLocalDate(at);
    return priced.map((l) =>
      evaluateItemAvailability(
        l.item,
        {
          at,
          now,
          mode: input.type,
          channel: channelFor(principal),
          quantity: qtyByItem.get(l.itemId),
          alreadyOrderedOnDate: itemUsage.get(`${d}|${l.itemId}`) ?? 0,
          skipNextAvailable: quick,
        },
        ctx,
      ),
    );
  };

  if (!blockingBeforeTiming && priced.length > 0) {
    plan = planFulfilment(req, timing);
    if (plan.ok && req.asap) {
      // ASAP: choose the earliest slot at which every dish can actually be served.
      const candidates = [plan.earliestPossible!, ...nextAvailableSlots(today, req, timing, 500)];
      const firstGood = candidates.find((s) => checkItemsAt(DateTime.fromISO(s.at, { zone: RESTAURANT_TZ })).every((a) => a.orderable));
      if (firstGood && firstGood.at !== plan.earliestPossible!.at) {
        plan = planFulfilment({ ...req, asap: false, date: firstGood.at.slice(0, 10), time: firstGood.time }, timing);
        notices.push(`The earliest time at which every dish in this order is available is ${formatHumanDateTime(DateTime.fromISO(firstGood.at, { zone: RESTAURANT_TZ }))}.`);
      }
    }
    if (!plan.ok) {
      issues.push(issue(plan.code!, plan.message!, { details: { alternatives: plan.alternatives, earliestPossible: plan.earliestPossible ?? null } }));
    }
    const at = plan.ok ? plan.promisedAt! : date && time ? localDateTime(date, time) : now.plus({ minutes: lead });
    const results = checkItemsAt(at, false);
    results.forEach((a, idx) => {
      const l = priced[idx];
      availability.set(l.lineIndex, a);
      if (!a.orderable && !l.item.bulk.bulkOnly) {
        const reasonCodes = a.reasons.map((r) => r.code);
        const alts = suggestAlternatives(l.item, catalog, ctx, now, { date: toLocalDate(at), time: toLocalTime(at), mode: input.type }, new Map());
        alternativesByLine.set(l.lineIndex, alts);
        issues.push(
          issue("ITEM_UNAVAILABLE", a.reasons.map((r) => r.message).join(" "), {
            lineIndex: l.lineIndex,
            itemId: l.itemId,
            details: { reasons: reasonCodes, nextAvailable: a.nextAvailable, remainingOnDate: a.remainingOnDate, alternatives: alts },
          }),
        );
      }
    });
    if (plan.ok && issues.some((i) => i.code === "ITEM_UNAVAILABLE")) {
      // Offer times when the whole basket works (e.g. order breakfast items before 11:30).
      const fromDate = toLocalDate(at);
      const goodSlots = nextAvailableSlots(fromDate, { ...req, asap: false }, timing, 500)
        .filter((s) => checkItemsAt(DateTime.fromISO(s.at, { zone: RESTAURANT_TZ })).every((x) => x.orderable))
        .slice(0, 3);
      if (goodSlots.length) notices.push(`Every dish in this order is available at: ${goodSlots.map((s) => `${s.at.slice(0, 10)} ${s.time}`).join(", ")}.`);
    }
  }

  // --- pricing ---
  const subtotalFils = priced.reduce((s, l) => s + l.lineTotalFils, 0);
  let deliveryFeeFils = 0;
  if (input.type === "delivery" && zone) {
    deliveryFeeFils = deliveryFee(zone.zone, subtotalFils);
    if (subtotalFils < zone.zone.minimumOrderFils) {
      issues.push(
        issue("BELOW_DELIVERY_MINIMUM", `The minimum order for delivery to ${zone.area} is ${money(zone.zone.minimumOrderFils).formatted} (current subtotal ${money(subtotalFils).formatted}).`, {
          details: { minimumOrder: money(zone.zone.minimumOrderFils), subtotal: money(subtotalFils) },
        }),
      );
    }
  }
  const totalFils = subtotalFils + deliveryFeeFils;

  // --- review rules ---
  let reviewReason: string | null = null;
  if (!o.autoConfirm) reviewReason = "All orders are currently confirmed manually by the team.";
  else if (totalFils > o.manualReviewAboveFils) reviewReason = `Orders above ${money(o.manualReviewAboveFils).formatted} are confirmed manually by the team.`;
  if (!reviewReason && input.customerPhone) {
    const p = checkPhone(input.customerPhone);
    if (p.valid) {
      const missed = await db.order.count({ where: { phone: p.e164!, status: "not_collected", createdAt: { gte: now.minus({ days: 90 }).toJSDate() } } });
      if (missed >= o.notCollectedReviewThreshold) reviewReason = "Previous orders on this number were not collected; the team will confirm this order by phone.";
    }
  }
  const slotsForDate = priced.length && !blockingBeforeTiming
    ? listSlots(plan?.ok ? toLocalDate(plan.promisedAt!) : (date ?? today), req, timing)
    : [];

  return {
    issues,
    priced,
    availability,
    alternativesByLine,
    portions,
    maxPrep,
    plan,
    slotsForDate,
    zone,
    subtotalFils,
    deliveryFeeFils,
    totalFils,
    reservation,
    requiresManualReview: !!reviewReason,
    reviewReason,
    notices,
    lead,
  };
}

function paymentMethodsFor(type: OrderType, ctx: RestaurantContext) {
  return ctx.settings.ordering.paymentMethods[type].map((id) => ({ id, label: PAYMENT_METHOD_LABELS[id] ?? id }));
}

function quoteFromEvaluation(ev: Evaluation, input: EvaluateInput, ctx: RestaurantContext, catalog: Catalog): OrderQuote {
  const plan = ev.plan;
  return {
    valid: ev.issues.length === 0,
    issues: ev.issues,
    lines: ev.priced.map((l) => ({
      lineIndex: l.lineIndex,
      itemId: l.itemId,
      name: l.name,
      quantity: l.quantity,
      options: l.selectedOptions.map((o) => ({ groupName: o.groupName, optionId: o.optionId, name: o.name, priceDelta: money(o.priceDeltaFils) })),
      unitPrice: money(l.unitPriceFils),
      lineTotal: money(l.lineTotalFils),
      kitchenPortions: l.kitchenPortions,
      allergens: composeItem(catalog, l.item, l.selectedOptionIds).allergens,
      availability: ev.availability.get(l.lineIndex) ?? null,
      alternatives: ev.alternativesByLine.get(l.lineIndex) ?? [],
    })),
    totals: totalsDto(ev.subtotalFils, 0, 0, ev.deliveryFeeFils, ev.totalFils, 0, ctx),
    kitchenPortions: ev.portions,
    requiresBulkOrder: ev.issues.some((i) => i.code === "REQUIRES_BULK_ORDER"),
    fulfilment: {
      type: input.type,
      requested: { asap: input.asap || !input.date || !input.time, date: input.date ?? null, time: input.time ?? null },
      accepted:
        plan?.ok && ev.issues.length === 0
          ? { date: toLocalDate(plan.promisedAt!), time: toLocalTime(plan.promisedAt!), at: toIsoLocal(plan.promisedAt!), readyAt: toIsoLocal(plan.readyAt!) }
          : null,
      leadTimeMinutes: ev.lead,
      alternatives: plan?.alternatives ?? [],
      availableSlots: ev.slotsForDate,
    },
    delivery:
      input.type === "delivery"
        ? {
            zone: ev.zone ? { id: ev.zone.zone.id, name: ev.zone.zone.name, driveMinutes: ev.zone.zone.driveMinutes } : null,
            area: ev.zone?.area ?? input.deliveryAddress?.area ?? null,
            fee: money(ev.deliveryFeeFils),
            minimumOrder: ev.zone ? money(ev.zone.zone.minimumOrderFils) : null,
            freeDeliveryAbove: ev.zone?.zone.freeDeliveryAboveFils ? money(ev.zone.zone.freeDeliveryAboveFils) : null,
          }
        : null,
    paymentMethods: paymentMethodsFor(input.type, ctx),
    requiresManualReview: ev.requiresManualReview,
    notices: [
      ...ev.notices,
      ...(ev.reviewReason ? [ev.reviewReason] : []),
      "Prices include 5% VAT. Payment is taken on collection, on delivery or at the table — no card details are collected online.",
    ],
  };
}

export function totalsDto(subtotal: number, discountPercent: number, discount: number, deliveryFeeFils: number, total: number, deposit: number, ctx: RestaurantContext) {
  return {
    subtotal: money(subtotal),
    discount: money(discount),
    discountPercent,
    deliveryFee: money(deliveryFeeFils),
    total: money(total),
    vatIncluded: money(vatIncluded(total, ctx.settings.vatRatePercent)),
    depositRequired: money(deposit),
  };
}

function toEvaluateInput(input: QuoteInput | CreateOrderInput, customerPhone?: string): EvaluateInput {
  return {
    items: input.items,
    type: input.fulfilment.type,
    asap: !!input.fulfilment.asap && !(input.fulfilment.date && input.fulfilment.time),
    date: input.fulfilment.date,
    time: input.fulfilment.time,
    reservationReference: input.fulfilment.reservationReference,
    deliveryAddress: input.deliveryAddress,
    customerPhone,
  };
}

export async function quoteOrder(input: QuoteInput, principal: Principal, now: DateTime): Promise<OrderQuote> {
  const [ctx, catalog] = await Promise.all([loadRestaurantContext(), loadCatalog()]);
  const evInput = toEvaluateInput(input, input.customerPhone);
  const ev = await evaluate(evInput, ctx, catalog, principal, now, prisma);
  return quoteFromEvaluation(ev, evInput, ctx, catalog);
}

function firstIssueError(ev: Evaluation, extra?: Record<string, unknown>): ApiError {
  const first = ev.issues[0];
  const code = (first.code in ERROR_CATALOG ? first.code : "VALIDATION_ERROR") as ErrorCode;
  const itemIssues = ev.issues.filter((i) => i.code === "ITEM_UNAVAILABLE");
  return new ApiError(code, first.message, {
    issues: ev.issues,
    ...(first.details ?? {}),
    ...(itemIssues.length ? { items: itemIssues.map((i) => ({ lineIndex: i.lineIndex, itemId: i.itemId, message: i.message, ...(i.details ?? {}) })) } : {}),
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Persistence & DTOs
// ---------------------------------------------------------------------------

type OrderRow = Order & { items: OrderItem[]; events: OrderEvent[]; reservation: Pick<Reservation, "reference"> | null };
const orderInclude = {
  items: { orderBy: { position: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  reservation: { select: { reference: true } },
} satisfies Prisma.OrderInclude;

const isoOf = (d: Date) => toIsoLocal(DateTime.fromJSDate(d).setZone(RESTAURANT_TZ));

function cutoffs(row: Order, ctx: RestaurantContext) {
  const promised = DateTime.fromJSDate(row.promisedAt).setZone(RESTAURANT_TZ);
  const prepStart = DateTime.fromJSDate(row.prepStartAt).setZone(RESTAURANT_TZ);
  if (row.kind === "bulk") {
    const free = promised.minus({ hours: ctx.settings.bulk.freeCancellationHours });
    return { modify: free, cancel: row.status === "pending_confirmation" ? promised : free };
  }
  const byWindow = promised.minus({ minutes: ctx.settings.ordering.modificationCutoffMinutes });
  const modify = byWindow < prepStart ? byWindow : prepStart;
  return { modify, cancel: prepStart };
}

export function toOrderDto(row: OrderRow, ctx: RestaurantContext, now: DateTime): OrderDto {
  const status = row.status as OrderStatus;
  const info = ORDER_STATUS_INFO[status];
  const promised = DateTime.fromJSDate(row.promisedAt).setZone(RESTAURANT_TZ);
  const { modify, cancel } = cutoffs(row, ctx);
  const mutable = CUSTOMER_MUTABLE_ORDER_STATUSES.includes(status);
  const canModify = mutable && now < modify && row.kind === "regular";
  const canCancel = mutable && now < cancel;
  const type = row.type as OrderType;
  return {
    number: row.number,
    kind: row.kind as "regular" | "bulk",
    status,
    statusLabel: info.label,
    statusDescription: info.description,
    confirmed: !["pending_confirmation", "cancelled", "rejected"].includes(status),
    type,
    channel: row.channel,
    customer: { name: row.customerName, phone: row.phone, email: row.email },
    recipient: row.recipientName ? { name: row.recipientName, phone: row.recipientPhone } : null,
    items: row.items.map((i) => ({
      id: i.id,
      itemId: i.menuItemId,
      name: i.name,
      quantity: i.quantity,
      options: (i.selectedOptions as { groupName: string; optionId: string; name: string; priceDeltaFils: number }[]).map((o) => ({
        groupName: o.groupName,
        optionId: o.optionId,
        name: o.name,
        priceDelta: money(o.priceDeltaFils),
      })),
      unitPrice: money(i.unitPriceFils),
      lineTotal: money(i.lineTotalFils),
      allergens: i.allergens as OrderDto["items"][number]["allergens"],
      notes: i.notes,
      status: i.status as "active" | "removed",
      removedReason: i.removedReason,
    })),
    totals: totalsDto(row.subtotalFils, row.discountPercent, row.discountFils, row.deliveryFeeFils, row.totalFils, row.depositRequiredFils, ctx),
    payment: {
      method: row.paymentMethod,
      methodLabel: PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod,
      status: row.paymentStatus,
      note:
        row.kind === "bulk" && row.depositRequiredFils > 0
          ? `A deposit of ${money(row.depositRequiredFils).formatted} is arranged by the catering team after confirmation (simulated; no online payment).`
          : "Payment is collected in person. This test environment never takes card details online.",
    },
    fulfilment: {
      promisedAt: toIsoLocal(promised),
      date: toLocalDate(promised),
      time: toLocalTime(promised),
      readyAt: isoOf(row.readyAt),
      estimatedWindow: type === "delivery" ? { from: toLocalTime(promised), to: toLocalTime(promised.plus({ minutes: 15 })) } : null,
      holdUntil: type === "pickup" ? toIsoLocal(promised.plus({ minutes: ctx.settings.ordering.pickupHoldMinutes })) : null,
      requestedAsap: row.requestedAsap,
    },
    deliveryAddress: (row.deliveryAddress as DeliveryAddress | null) ?? null,
    deliveryZone: row.deliveryZoneId,
    reservationReference: row.reservation?.reference ?? null,
    specialInstructions: row.specialInstructions,
    allergyNoteFlagged: row.allergyNoteFlagged,
    requiresReview: row.requiresReview,
    reviewReason: row.reviewReason,
    catering: row.kind === "bulk" ? { quoteId: row.quoteId, guestCount: row.guestCount, eventType: row.eventType, companyName: row.companyName } : null,
    allowedActions: {
      modify: canModify,
      cancel: canCancel,
      modifiableUntil: mutable && row.kind === "regular" ? toIsoLocal(modify) : null,
      cancellableUntil: mutable ? toIsoLocal(cancel) : null,
      reason: !mutable
        ? `The order is ${info.label.toLowerCase()}; changes must go through the team.`
        : !canCancel
          ? "Preparation has started or the free-cancellation period has passed; please contact the restaurant."
          : !canModify
            ? row.kind === "bulk"
              ? "Catering orders are changed through the catering team."
              : "The online change window has closed; please contact the restaurant."
            : null,
    },
    history: row.events.map((e) => ({ at: isoOf(e.createdAt), type: e.type, status: e.toStatus, note: e.note, actor: e.actor })),
    createdAt: isoOf(row.createdAt),
    updatedAt: isoOf(row.updatedAt),
  };
}

function orderMessage(dto: OrderDto): string {
  const when = formatHumanDateTime(DateTime.fromISO(dto.fulfilment.promisedAt, { setZone: true }));
  const what = dto.type === "pickup" ? `ready for collection at ${when}` : dto.type === "delivery" ? `due to arrive ${when}–${dto.fulfilment.estimatedWindow?.to}` : `to be served at your table at ${when}`;
  if (dto.status === "pending_confirmation") {
    return `Order ${dto.number} (${dto.totals.total.formatted}) has been received but is NOT yet confirmed: ${dto.reviewReason ?? "the team will confirm it shortly."} If accepted it will be ${what}.`;
  }
  const pay = dto.type === "pickup" ? "payable on collection by cash or card" : dto.type === "delivery" ? "payable to the driver by cash or card" : "payable at the table";
  return `Order ${dto.number} is confirmed and will be ${what}. Total ${dto.totals.total.formatted} (incl. VAT), ${pay}.`;
}

async function uniqueNumber(tx: Tx, kind: "order" | "bulkOrder"): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const n = generateReference(kind);
    if (!(await tx.order.findUnique({ where: { number: n }, select: { id: true } }))) return n;
  }
  throw new ApiError("INTERNAL_ERROR", "Could not allocate an order number.");
}

function lineSignature(items: LineInput[]): string {
  return items
    .map((l) => `${l.itemId}x${l.quantity}[${[...(l.options ?? [])].sort().join(",")}]`)
    .sort()
    .join("|");
}

function lineRows(ev: Evaluation, catalog: Catalog) {
  return ev.priced.map((l, position) => ({
    menuItemId: l.itemId,
    name: l.name,
    quantity: l.quantity,
    unitBasePriceFils: l.unitBasePriceFils,
    unitOptionsFils: l.unitOptionsFils,
    unitPriceFils: l.unitPriceFils,
    lineTotalFils: l.lineTotalFils,
    selectedOptions: l.selectedOptions as unknown as Prisma.InputJsonValue,
    kitchenPortions: l.kitchenPortions,
    allergens: composeItem(catalog, l.item, l.selectedOptionIds).allergens,
    notes: l.notes,
    position,
  }));
}

export async function createOrder(input: CreateOrderInput, principal: Principal, now: DateTime) {
  const phone = checkPhone(input.customer.phone);
  if (!phone.valid) throw new ApiError("INVALID_PHONE", phone.error, { field: "customer.phone" });
  if (input.recipient?.phone && !checkPhone(input.recipient.phone).valid) {
    throw new ApiError("INVALID_PHONE", "The recipient's phone number is not valid.", { field: "recipient.phone" });
  }
  const [ctx, catalog] = await Promise.all([loadRestaurantContext(), loadCatalog()]);
  const evInput = toEvaluateInput(input, phone.e164!);
  const allowedPayments = ctx.settings.ordering.paymentMethods[input.fulfilment.type];
  const paymentMethod: PaymentMethod = input.paymentMethod ?? allowedPayments[0];
  if (!allowedPayments.includes(paymentMethod)) {
    throw new ApiError("VALIDATION_ERROR", `Payment method ${paymentMethod} is not available for ${input.fulfilment.type} orders.`, { allowed: allowedPayments });
  }
  const token = generateAccessToken();
  const row = await withDateLocks(prisma, ["orders"], async (tx) => {
    const ev = await evaluate(evInput, ctx, catalog, principal, now, tx);
    if (ev.issues.length) throw firstIssueError(ev);
    const plan = ev.plan!;
    const recentDuplicate = await tx.order.findFirst({
      where: {
        phone: phone.e164!,
        promisedAt: plan.promisedAt!.toJSDate(),
        status: { in: ["pending_confirmation", "confirmed"] },
        createdAt: { gte: now.minus({ minutes: 5 }).toJSDate() },
      },
      include: { items: true },
    });
    if (recentDuplicate) {
      const sig = lineSignature(recentDuplicate.items.map((i) => ({ itemId: i.menuItemId, quantity: i.quantity, options: (i.selectedOptions as { optionId: string }[]).map((o) => o.optionId) })));
      const newSig = lineSignature(ev.priced.map((l) => ({ itemId: l.itemId, quantity: l.quantity, options: l.selectedOptionIds })));
      if (sig === newSig) {
        throw new ApiError("DUPLICATE_ORDER", `An identical order (${recentDuplicate.number}) was placed for this phone number a moment ago.`, { existingOrderNumber: recentDuplicate.number });
      }
    }
    const status: OrderStatus = ev.requiresManualReview ? "pending_confirmation" : "confirmed";
    const allergyFlag = !!input.specialInstructions && ALLERGY_KEYWORDS.test(input.specialInstructions);
    const number = await uniqueNumber(tx, "order");
    return tx.order.create({
      data: {
        number,
        kind: "regular",
        createdAt: now.toJSDate(),
        accessTokenHash: hashToken(token),
        status,
        type: input.fulfilment.type,
        channel: channelFor(principal),
        source: sourceFor(principal),
        apiKeyId: principal.kind === "api_key" ? principal.id : null,
        customerName: input.customer.name,
        phone: phone.e164!,
        email: input.customer.email ?? null,
        recipientName: input.recipient?.name ?? null,
        recipientPhone: input.recipient?.phone ? checkPhone(input.recipient.phone).e164 : null,
        requestedAsap: evInput.asap,
        requestedFor: evInput.date && evInput.time ? localDateTime(evInput.date, evInput.time).toJSDate() : null,
        promisedAt: plan.promisedAt!.toJSDate(),
        readyAt: plan.readyAt!.toJSDate(),
        prepStartAt: plan.prepStartAt!.toJSDate(),
        slotKey: slotKey(plan.readyAt!, ctx.settings.ordering.slotMinutes),
        localDate: toLocalDate(plan.promisedAt!),
        kitchenPortions: ev.portions,
        subtotalFils: ev.subtotalFils,
        deliveryFeeFils: ev.deliveryFeeFils,
        totalFils: ev.totalFils,
        vatFils: vatIncluded(ev.totalFils, ctx.settings.vatRatePercent),
        paymentMethod,
        deliveryAddress: input.fulfilment.type === "delivery" ? (input.deliveryAddress as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        deliveryZoneId: ev.zone?.zone.id ?? null,
        reservationId: ev.reservation?.id ?? null,
        specialInstructions: input.specialInstructions ?? null,
        allergyNoteFlagged: allergyFlag,
        requiresReview: ev.requiresManualReview,
        reviewReason: ev.reviewReason,
        items: { create: lineRows(ev, catalog) },
        events: {
          create: {
            type: "created",
            toStatus: status,
            actor: actorName(principal),
            note: [ev.reviewReason, allergyFlag ? "Allergy mentioned in instructions — duty manager to call the customer" : null].filter(Boolean).join(" · ") || null,
          },
        },
      },
      include: orderInclude,
    });
  });
  logger.info("order.created", { number: row.number, type: row.type, status: row.status, totalFils: row.totalFils, phone: maskPhone(row.phone), promisedAt: row.promisedAt.toISOString() });
  const dto = toOrderDto(row, ctx, now);
  return { order: dto, accessToken: token, message: orderMessage(dto) };
}

// ---------------------------------------------------------------------------
// Retrieval, simulation, modification, cancellation
// ---------------------------------------------------------------------------

/** Test-environment kitchen simulation: advance statuses as time passes (SIMULATE_KITCHEN_PROGRESS=true). */
async function simulateProgress(row: OrderRow, now: DateTime): Promise<OrderRow> {
  if (!getConfig().SIMULATE_KITCHEN_PROGRESS || row.kind !== "regular") return row;
  const steps: { from: OrderStatus; to: OrderStatus; at: Date }[] = [];
  let status = row.status as OrderStatus;
  const type = row.type as OrderType;
  const nowJs = now.toJSDate();
  if (status === "confirmed" && nowJs >= row.prepStartAt) steps.push({ from: status, to: (status = "preparing"), at: row.prepStartAt });
  if (status === "preparing" && nowJs >= row.readyAt) {
    const to: OrderStatus = type === "pickup" ? "ready_for_pickup" : type === "delivery" ? "out_for_delivery" : "ready_to_serve";
    steps.push({ from: status, to: (status = to), at: row.readyAt });
  }
  if (status === "out_for_delivery" && nowJs >= row.promisedAt) steps.push({ from: status, to: (status = "completed"), at: row.promisedAt });
  if (steps.length === 0) return row;
  return prisma.order.update({
    where: { id: row.id },
    data: {
      status,
      events: { create: steps.map((s) => ({ type: "status_changed", fromStatus: s.from, toStatus: s.to, actor: "kitchen-simulation", note: "Simulated kitchen progress (test environment)", createdAt: s.at })) },
    },
    include: orderInclude,
  });
}

async function findOrderForAccess(reference: string, principal: Principal, v: VerificationInput) {
  requireVerificationInput(principal, v);
  const ref = normaliseReference(reference, ["order", "bulkOrder"]);
  const row = ref ? await prisma.order.findUnique({ where: { number: ref }, include: orderInclude }) : null;
  assertRecordAccess(principal, ref ?? reference.toUpperCase(), row, v);
  return row as OrderRow;
}

export async function getOrder(reference: string, principal: Principal, v: VerificationInput, now: DateTime) {
  const row = await simulateProgress(await findOrderForAccess(reference, principal, v), now);
  const ctx = await loadRestaurantContext();
  return toOrderDto(row, ctx, now);
}

const NEXT_STEP: Record<OrderStatus, string> = {
  pending_confirmation: "Waiting for the restaurant to accept the order. The team will call if anything needs to change.",
  confirmed: "The kitchen will start preparing the order shortly before the promised time.",
  preparing: "The order is being cooked.",
  ready_for_pickup: "Collect from the takeaway counter at Gate 3, Al Seef. Give the order number and the name on the order.",
  out_for_delivery: "The driver is on the way and will call on arrival.",
  ready_to_serve: "The food will be served as soon as the guests are seated.",
  completed: "Nothing further — enjoy your meal!",
  cancelled: "This order was cancelled. A new order can be placed at any time.",
  rejected: "The restaurant could not accept this order. Please place a new order or call the restaurant.",
  not_collected: "The order was not collected within the holding time. Please call the restaurant.",
  delivery_failed: "The delivery could not be completed. Please call the restaurant.",
};

export async function getOrderStatus(reference: string, principal: Principal, v: VerificationInput, now: DateTime): Promise<OrderStatusDto> {
  const row = await simulateProgress(await findOrderForAccess(reference, principal, v), now);
  const status = row.status as OrderStatus;
  return {
    number: row.number,
    status,
    statusLabel: ORDER_STATUS_INFO[status].label,
    statusDescription: ORDER_STATUS_INFO[status].description,
    confirmed: !["pending_confirmation", "cancelled", "rejected"].includes(status),
    type: row.type as OrderType,
    promisedAt: isoOf(row.promisedAt),
    readyAt: isoOf(row.readyAt),
    isFinal: ORDER_STATUS_INFO[status].terminal,
    nextStep: NEXT_STEP[status],
    updatedAt: isoOf(row.updatedAt),
  };
}

export async function updateOrder(reference: string, input: UpdateOrderInput, principal: Principal, v: VerificationInput, now: DateTime) {
  const existing = await simulateProgress(await findOrderForAccess(reference, principal, v), now);
  const [ctx, catalog] = await Promise.all([loadRestaurantContext(), loadCatalog()]);
  const status = existing.status as OrderStatus;
  if (existing.kind === "bulk") throw new ApiError("ORDER_NOT_MODIFIABLE", "Catering orders are changed through the catering team; please contact them with the order number.");
  if (!CUSTOMER_MUTABLE_ORDER_STATUSES.includes(status)) {
    throw new ApiError("ORDER_NOT_MODIFIABLE", `Order ${existing.number} is ${ORDER_STATUS_INFO[status].label.toLowerCase()} and can no longer be changed online.`);
  }
  const { modify } = cutoffs(existing, ctx);
  if (now >= modify && !isStaff(principal)) {
    throw new ApiError("MODIFICATION_WINDOW_CLOSED", `Online changes for ${existing.number} closed at ${toLocalTime(modify)}. Please call the restaurant.`, { modifiableUntil: toIsoLocal(modify) });
  }
  const promised = DateTime.fromJSDate(existing.promisedAt).setZone(RESTAURANT_TZ);
  const items: LineInput[] =
    input.items ??
    existing.items
      .filter((i) => i.status === "active")
      .map((i) => ({ itemId: i.menuItemId, quantity: i.quantity, options: (i.selectedOptions as { optionId: string }[]).map((o) => o.optionId), notes: i.notes ?? undefined }));
  const timeChanged = !!input.fulfilment;
  const evInput: EvaluateInput = {
    items,
    type: existing.type as OrderType,
    asap: !!input.fulfilment?.asap,
    date: input.fulfilment?.asap ? undefined : (input.fulfilment?.date ?? toLocalDate(promised)),
    time: input.fulfilment?.asap ? undefined : (input.fulfilment?.time ?? toLocalTime(promised)),
    reservationReference: existing.reservationId ? (await prisma.reservation.findUnique({ where: { id: existing.reservationId } }))?.reference : undefined,
    deliveryAddress: (input.deliveryAddress ?? (existing.deliveryAddress as DeliveryAddress | null)) ?? undefined,
    customerPhone: existing.phone,
  };
  const updated = await withDateLocks(prisma, ["orders"], async (tx) => {
    const ev = await evaluate(evInput, ctx, catalog, principal, now, tx, existing.id);
    if (ev.issues.length) throw firstIssueError(ev, { orderNumber: existing.number, unchanged: true });
    const plan = ev.plan!;
    const newStatus: OrderStatus = ev.requiresManualReview ? "pending_confirmation" : status === "pending_confirmation" && !existing.requiresReview ? "confirmed" : status;
    await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
    const changes: string[] = [];
    if (input.items) changes.push("items changed");
    if (timeChanged) changes.push(`time ${toLocalDate(promised)} ${toLocalTime(promised)} → ${toLocalDate(plan.promisedAt!)} ${toLocalTime(plan.promisedAt!)}`);
    if (input.deliveryAddress) changes.push("delivery address changed");
    if (input.specialInstructions !== undefined) changes.push("instructions changed");
    if (input.recipient) changes.push("recipient changed");
    return tx.order.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        promisedAt: plan.promisedAt!.toJSDate(),
        readyAt: plan.readyAt!.toJSDate(),
        prepStartAt: plan.prepStartAt!.toJSDate(),
        slotKey: slotKey(plan.readyAt!, ctx.settings.ordering.slotMinutes),
        localDate: toLocalDate(plan.promisedAt!),
        kitchenPortions: ev.portions,
        subtotalFils: ev.subtotalFils,
        deliveryFeeFils: ev.deliveryFeeFils,
        totalFils: ev.totalFils,
        vatFils: vatIncluded(ev.totalFils, ctx.settings.vatRatePercent),
        deliveryAddress: existing.type === "delivery" ? (evInput.deliveryAddress as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        deliveryZoneId: ev.zone?.zone.id ?? null,
        specialInstructions: input.specialInstructions ?? existing.specialInstructions,
        allergyNoteFlagged: input.specialInstructions !== undefined ? ALLERGY_KEYWORDS.test(input.specialInstructions) : existing.allergyNoteFlagged,
        recipientName: input.recipient?.name ?? existing.recipientName,
        recipientPhone: input.recipient?.phone ? checkPhone(input.recipient.phone).e164 : existing.recipientPhone,
        requiresReview: ev.requiresManualReview,
        reviewReason: ev.reviewReason,
        items: { create: lineRows(ev, catalog) },
        events: { create: { type: "modified", fromStatus: status, toStatus: newStatus, note: changes.join("; ") || "No changes", actor: actorName(principal) } },
      },
      include: orderInclude,
    });
  });
  const dto = toOrderDto(updated, ctx, now);
  return { order: dto, message: `Order ${dto.number} updated. ${orderMessage(dto)}` };
}

export async function cancelOrder(reference: string, reason: string | undefined, principal: Principal, v: VerificationInput, now: DateTime) {
  const row = await simulateProgress(await findOrderForAccess(reference, principal, v), now);
  const ctx = await loadRestaurantContext();
  const status = row.status as OrderStatus;
  if (!CUSTOMER_MUTABLE_ORDER_STATUSES.includes(status) && !(isStaff(principal) && canTransitionOrder(status, "cancelled", row.type as OrderType))) {
    throw new ApiError("ORDER_NOT_MODIFIABLE", `Order ${row.number} is ${ORDER_STATUS_INFO[status].label.toLowerCase()} and cannot be cancelled online.`);
  }
  const { cancel } = cutoffs(row, ctx);
  if (now >= cancel && !isStaff(principal)) {
    throw new ApiError(
      "CANCELLATION_WINDOW_CLOSED",
      row.kind === "bulk"
        ? `Catering orders can be cancelled free of charge until ${ctx.settings.bulk.freeCancellationHours} hours before; please contact the catering team.`
        : "The kitchen has started preparing this order, so it can no longer be cancelled online. Please call the restaurant.",
      { cancellableUntil: toIsoLocal(cancel) },
    );
  }
  const updated = await prisma.order.update({
    where: { id: row.id },
    data: {
      status: "cancelled",
      cancelledAt: now.toJSDate(),
      cancelledBy: actorName(principal),
      cancellationReason: reason ?? null,
      events: { create: { type: "cancelled", fromStatus: status, toStatus: "cancelled", note: reason ?? null, actor: actorName(principal) } },
    },
    include: orderInclude,
  });
  const dto = toOrderDto(updated, ctx, now);
  return { order: dto, message: `Order ${dto.number} has been cancelled. No payment was taken, so nothing is owed.` };
}

// --- staff ------------------------------------------------------------------

export async function listOrders(
  filter: { date?: string; status?: OrderStatus; kind?: "regular" | "bulk"; q?: string; page: number; pageSize: number },
  now: DateTime,
) {
  const ctx = await loadRestaurantContext();
  const where: Prisma.OrderWhereInput = {
    ...(filter.date ? { localDate: filter.date } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.kind ? { kind: filter.kind } : {}),
    ...(filter.q
      ? { OR: [{ number: { contains: filter.q.toUpperCase() } }, { customerName: { contains: filter.q, mode: "insensitive" } }, { phone: { contains: filter.q.replace(/\D/g, "") || "~" } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: orderInclude, orderBy: [{ promisedAt: "asc" }], skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize }),
  ]);
  const simulated = await Promise.all(rows.map((r) => simulateProgress(r, now)));
  return { items: simulated.map((r) => toOrderDto(r, ctx, now)), total };
}

export async function transitionOrder(reference: string, to: OrderStatus, note: string | undefined, principal: Principal, now: DateTime) {
  const ref = normaliseReference(reference, ["order", "bulkOrder"]);
  const row = ref ? await prisma.order.findUnique({ where: { number: ref }, include: orderInclude }) : null;
  if (!row) throw new ApiError("NOT_FOUND", `No order ${reference}.`);
  const from = row.status as OrderStatus;
  if (!canTransitionOrder(from, to, row.type as OrderType)) {
    throw new ApiError("INVALID_STATUS_TRANSITION", `Cannot change order ${row.number} from ${from} to ${to}.`, { from, to, allowed: allowedOrderTransitions(from, row.type as OrderType) });
  }
  const updated = await prisma.order.update({
    where: { id: row.id },
    data: {
      status: to,
      ...(to === "completed" ? { paymentStatus: "paid" } : {}),
      ...(to === "cancelled" || to === "rejected" ? { cancelledAt: now.toJSDate(), cancelledBy: actorName(principal), cancellationReason: note ?? null } : {}),
      events: { create: { type: "status_changed", fromStatus: from, toStatus: to, note: note ?? null, actor: actorName(principal) } },
    },
    include: orderInclude,
  });
  const ctx = await loadRestaurantContext();
  return toOrderDto(updated, ctx, now);
}

/** Staff: an item became unavailable after the order was placed — remove it, re-total, record why. */
export async function removeOrderLine(reference: string, lineId: string, reason: string, principal: Principal, now: DateTime) {
  const ref = normaliseReference(reference, ["order", "bulkOrder"]);
  const row = ref ? await prisma.order.findUnique({ where: { number: ref }, include: orderInclude }) : null;
  if (!row) throw new ApiError("NOT_FOUND", `No order ${reference}.`);
  const line = row.items.find((i) => i.id === lineId && i.status === "active");
  if (!line) throw new ApiError("NOT_FOUND", "No active line with that id on this order.");
  const ctx = await loadRestaurantContext();
  const remaining = row.items.filter((i) => i.status === "active" && i.id !== lineId);
  const subtotal = remaining.reduce((s, i) => s + i.lineTotalFils, 0);
  const total = remaining.length ? subtotal + row.deliveryFeeFils - row.discountFils : 0;
  const updated = await prisma.order.update({
    where: { id: row.id },
    data: {
      subtotalFils: subtotal,
      totalFils: Math.max(0, total),
      vatFils: vatIncluded(Math.max(0, total), ctx.settings.vatRatePercent),
      kitchenPortions: remaining.reduce((s, i) => s + i.kitchenPortions, 0),
      ...(remaining.length === 0 ? { status: "cancelled", cancelledAt: now.toJSDate(), cancelledBy: actorName(principal), cancellationReason: `All items unavailable: ${reason}` } : {}),
      items: { update: { where: { id: lineId }, data: { status: "removed", removedReason: reason } } },
      events: {
        create: {
          type: "line_removed",
          fromStatus: row.status,
          toStatus: remaining.length === 0 ? "cancelled" : row.status,
          note: `${line.quantity} × ${line.name} removed: ${reason}. Customer to be contacted to offer a substitute.`,
          actor: actorName(principal),
        },
      },
    },
    include: orderInclude,
  });
  return toOrderDto(updated, ctx, now);
}

export { orderInclude, type OrderRow };
