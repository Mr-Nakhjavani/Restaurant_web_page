import { Prisma } from "@prisma/client";
import type { z } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import { composeItem } from "@/domain/catalog";
import { evaluateItemAvailability } from "@/domain/availability";
import {
  bulkDiscountPercent,
  bulkIssuesFor,
  depositFor,
  feasibleAlternatives,
  fulfilmentWindowOn,
  requiredNoticeHours,
  type BulkFeasibilityInput,
  type BulkIssue,
} from "@/domain/bulk-rules";
import { findDeliveryZone } from "@/domain/delivery";
import { money, percentOf, vatIncluded } from "@/domain/money";
import { checkPhone, maskPhone } from "@/domain/phone";
import { priceLines } from "@/domain/pricing";
import { generateAccessToken, generateReference, hashToken, normaliseReference } from "@/domain/references";
import { CAPACITY_ORDER_STATUSES } from "@/domain/status";
import { localDateTime, minutesToTime, RESTAURANT_TZ, toIsoLocal, toLocalDate } from "@/domain/time";
import type { BulkQuoteRequestSchema, BulkQuoteSchema, CreateBulkOrderSchema } from "../contracts/bulk";
import { prisma, type Tx } from "../db";
import { ApiError } from "../errors";
import { logger } from "../logger";
import { actorName, channelFor, sourceFor, type Principal } from "../auth/principal";
import { loadCatalog, loadRestaurantContext } from "../repositories/catalog-repo";
import { orderInclude, toOrderDto, totalsDto } from "./order-service";
import { withDateLocks } from "./locks";

export type BulkQuoteInput = z.infer<typeof BulkQuoteRequestSchema>;
export type BulkQuoteDto = z.infer<typeof BulkQuoteSchema>;
export type CreateBulkOrderInput = z.infer<typeof CreateBulkOrderSchema>;

const ESCALATION_CONTACT = "Events team: events@baytalghaf.example or +971 4 555 0142 (ask for catering)";

async function committedBulk(db: Tx | typeof prisma, dates: string[]) {
  const orders = await db.order.findMany({
    where: { kind: "bulk", localDate: { in: dates }, status: { in: CAPACITY_ORDER_STATUSES } },
    select: { localDate: true, kitchenPortions: true, items: { where: { status: "active" }, select: { menuItemId: true, quantity: true } } },
  });
  const portionsByDate = new Map<string, number>();
  const itemUnits = new Map<string, number>();
  for (const o of orders) {
    portionsByDate.set(o.localDate, (portionsByDate.get(o.localDate) ?? 0) + o.kitchenPortions);
    for (const i of o.items) itemUnits.set(`${o.localDate}|${i.menuItemId}`, (itemUnits.get(`${o.localDate}|${i.menuItemId}`) ?? 0) + i.quantity);
  }
  return { portionsByDate, itemUnits };
}

async function computeBulkQuote(input: BulkQuoteInput, now: DateTime, db: Tx | typeof prisma) {
  const [ctx, catalog] = await Promise.all([loadRestaurantContext(db), loadCatalog(db)]);
  const s = ctx.settings.bulk;
  const at = localDateTime(input.fulfilment.date, input.fulfilment.time);
  const { priced, issues: lineIssues } = priceLines(catalog, input.items, { maxQuantityPerLine: 2000, bulk: true });
  const issues: BulkIssue[] = lineIssues.map((li) => ({ code: li.code, message: li.message, itemId: li.itemId, blocking: true }));
  const portions = priced.reduce((sum, l) => sum + l.kitchenPortions, 0);

  // Calendar availability of each dish on the date (e.g. Ramadan-only, seasonal).
  for (const l of priced) {
    if (!l.item.bulk.eligible) continue;
    const a = evaluateItemAvailability(l.item, { at, now, mode: input.fulfilment.type, quantity: l.quantity, bulk: true, skipNextAvailable: true }, ctx);
    const relevant = a.reasons.filter((r) => !["IN_THE_PAST", "INSUFFICIENT_NOTICE", "BULK_ONLY_ITEM", "DAILY_LIMIT_REACHED", "OUTSIDE_ITEM_HOURS", "SAME_DAY_CUTOFF_PASSED", "BELOW_MINIMUM_QUANTITY"].includes(r.code));
    if (relevant.length) issues.push({ code: "ITEM_UNAVAILABLE_ON_DATE", message: relevant.map((r) => r.message).join(" "), itemId: l.itemId, blocking: relevant.some((r) => r.code === "ITEM_PAUSED" || r.code === "FULFILMENT_NOT_SUPPORTED") });
  }

  // Delivery zone (catering covers zones A–D).
  let delivery: BulkQuoteDto["delivery"] = null;
  let deliveryFeeFils = 0;
  if (input.fulfilment.type === "delivery") {
    if (!input.deliveryArea) {
      issues.push({ code: "DELIVERY_ADDRESS_REQUIRED", message: "Catering delivery needs the delivery area (e.g. Business Bay).", itemId: null, blocking: true });
    } else {
      const zone = findDeliveryZone(input.deliveryArea, ctx.settings);
      if (!zone) {
        issues.push({ code: "DELIVERY_AREA_NOT_SERVED", message: `We do not deliver catering to “${input.deliveryArea}”. Catering delivery covers Dubai only; collection from Al Seef is available.`, itemId: null, blocking: true });
      } else {
        deliveryFeeFils = zone.zone.feeFils;
        delivery = { area: zone.area, zone: zone.zone.name, fee: money(zone.zone.feeFils), minimumOrder: money(zone.zone.minimumOrderFils) };
      }
    }
  }

  const dates = Array.from({ length: s.maxAdvanceDays + 1 }, (_, i) => toLocalDate(now.plus({ days: i })));
  const committed = await committedBulk(db, [...new Set([...dates, input.fulfilment.date])]);
  const feasInput: BulkFeasibilityInput = {
    lines: priced,
    portions,
    fulfilmentAt: at,
    now,
    ctx,
    committedPortionsByDate: committed.portionsByDate,
    committedItemUnits: committed.itemUnits,
  };
  if (priced.length) issues.push(...bulkIssuesFor(feasInput, at));

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotalFils, 0);
  const discountPercent = bulkDiscountPercent(portions, ctx.settings);
  const discount = percentOf(subtotal, discountPercent);
  if (delivery) {
    const zone = findDeliveryZone(input.deliveryArea!, ctx.settings)!;
    if (subtotal - discount < zone.zone.minimumOrderFils) {
      issues.push({ code: "BELOW_DELIVERY_MINIMUM", message: `Catering delivery to ${zone.area} needs a minimum order of ${money(zone.zone.minimumOrderFils).formatted}.`, itemId: null, blocking: false });
    }
  }
  const total = subtotal - discount + deliveryFeeFils;
  const deposit = depositFor(total, ctx.settings);
  const notice = priced.length ? requiredNoticeHours(portions, priced, ctx.settings) : 0;
  const blocking = issues.some((i) => i.blocking);
  const status: BulkQuoteDto["status"] = issues.length === 0 ? "feasible" : blocking ? "not_possible" : "needs_changes";
  const fixableByDate = !blocking && issues.every((i) => ["INSUFFICIENT_NOTICE", "DAILY_CAPACITY_EXCEEDED", "OUTSIDE_FULFILMENT_HOURS", "RESTAURANT_CLOSED", "DATE_IN_PAST", "ITEM_DAILY_MAXIMUM_EXCEEDED", "ITEM_UNAVAILABLE_ON_DATE"].includes(i.code));
  const alternatives = status === "needs_changes" && fixableByDate ? feasibleAlternatives(feasInput, 3) : [];
  const window = fulfilmentWindowOn(input.fulfilment.date, ctx);
  const committedToday = committed.portionsByDate.get(input.fulfilment.date) ?? 0;
  const validUntil = now.plus({ hours: s.quoteValidityHours });
  const nextSteps =
    status === "feasible"
      ? [
          `Place the order with POST /api/v1/bulk-orders using quoteId within ${s.quoteValidityHours} hours.`,
          `Catering orders are reviewed by the team and confirmed by phone within ${s.reviewResponseHours} hours (status pending_confirmation until then).`,
          ...(deposit > 0 ? [`A ${s.depositPercent}% deposit (${money(deposit).formatted}) is arranged by the catering team after confirmation.`] : []),
        ]
      : status === "needs_changes"
        ? ["Choose one of the alternative dates/times, or adjust the items, and request a new quote."]
        : ["This request is beyond what we can take online. Offer to pass it to the events team."];
  const escalation = blocking ? { reason: issues.filter((i) => i.blocking).map((i) => i.message).join(" "), contact: ESCALATION_CONTACT } : null;
  const dto: Omit<BulkQuoteDto, "quoteId"> = {
    status,
    feasible: status === "feasible",
    issues: issues.map((i) => ({ code: i.code, message: i.message, itemId: i.itemId ?? null, blocking: i.blocking })),
    lines: priced.map((l) => ({
      lineIndex: l.lineIndex,
      itemId: l.itemId,
      name: l.name,
      quantity: l.quantity,
      options: l.selectedOptions.map((o) => ({ groupName: o.groupName, optionId: o.optionId, name: o.name, priceDelta: money(o.priceDeltaFils) })),
      unitPrice: money(l.unitPriceFils),
      lineTotal: money(l.lineTotalFils),
      kitchenPortions: l.kitchenPortions,
      allergens: composeItem(catalog, l.item, l.selectedOptionIds).allergens,
      availability: null,
      alternatives: [],
    })),
    portions,
    guestCount: input.guestCount ?? null,
    totals: totalsDto(subtotal, discountPercent, discount, deliveryFeeFils, total, deposit, ctx),
    leadTime: {
      requiredHours: notice,
      availableHours: Math.max(0, Math.floor(at.diff(now, "hours").hours)),
      earliestFeasibleAt: alternatives[0]?.at ?? (status === "feasible" ? toIsoLocal(at) : null),
    },
    capacity: {
      dailyCapacityPortions: s.dailyCapacityPortions,
      alreadyCommitted: committedToday,
      remaining: Math.max(0, s.dailyCapacityPortions - committedToday),
      requested: portions,
    },
    fulfilment: {
      type: input.fulfilment.type,
      date: input.fulfilment.date,
      time: input.fulfilment.time,
      at: toIsoLocal(at),
      window: window ? `${minutesToTime(window.start)}–${minutesToTime(window.end)}` : "closed",
    },
    delivery,
    alternatives,
    validUntil: toIsoLocal(validUntil),
    nextSteps,
    escalation,
  };
  return { dto, total, portions, priced, deposit, discountPercent, discount, deliveryFeeFils, subtotal, at, validUntil, ctx, catalog };
}

export async function quoteBulkOrder(input: BulkQuoteInput, principal: Principal, now: DateTime): Promise<BulkQuoteDto> {
  const q = await computeBulkQuote(input, now, prisma);
  let reference = generateReference("quote");
  for (let i = 0; i < 5 && (await prisma.bulkQuote.findUnique({ where: { reference } })); i++) reference = generateReference("quote");
  const dto = { quoteId: reference, ...q.dto };
  await prisma.bulkQuote.create({
    data: {
      reference,
      request: input as unknown as Prisma.InputJsonValue,
      result: dto as unknown as Prisma.InputJsonValue,
      feasible: dto.feasible,
      portions: q.portions,
      totalFils: q.total,
      fulfilmentAt: q.at.toJSDate(),
      expiresAt: q.validUntil.toJSDate(),
      apiKeyId: principal.kind === "api_key" ? principal.id : null,
    },
  });
  logger.info("bulk.quote", { quoteId: reference, status: dto.status, portions: q.portions, totalFils: q.total });
  return dto;
}

export async function getBulkQuote(reference: string): Promise<BulkQuoteDto> {
  const ref = normaliseReference(reference, "quote");
  const row = ref ? await prisma.bulkQuote.findUnique({ where: { reference: ref } }) : null;
  if (!row) throw new ApiError("NOT_FOUND", `No catering quote ${reference}.`);
  return row.result as unknown as BulkQuoteDto;
}

export async function createBulkOrder(input: CreateBulkOrderInput, principal: Principal, now: DateTime) {
  const ref = normaliseReference(input.quoteId, "quote");
  const quote = ref ? await prisma.bulkQuote.findUnique({ where: { reference: ref }, include: { order: { select: { number: true } } } }) : null;
  if (!quote) throw new ApiError("NOT_FOUND", `No catering quote ${input.quoteId}. Request one with POST /api/v1/bulk-orders/quotes.`);
  if (quote.order) throw new ApiError("QUOTE_ALREADY_USED", `Quote ${quote.reference} was already used for order ${quote.order.number}.`, { orderNumber: quote.order.number });
  if (now.toJSDate() > quote.expiresAt) throw new ApiError("QUOTE_EXPIRED", `Quote ${quote.reference} expired at ${toIsoLocal(DateTime.fromJSDate(quote.expiresAt).setZone(RESTAURANT_TZ))}. Request a new quote.`);
  const phone = checkPhone(input.customer.phone);
  if (!phone.valid) throw new ApiError("INVALID_PHONE", phone.error, { field: "customer.phone" });
  const request = quote.request as unknown as BulkQuoteInput;
  if (request.fulfilment.type === "delivery") {
    if (!input.deliveryAddress) throw new ApiError("DELIVERY_ADDRESS_REQUIRED", "Catering delivery needs the full address (area, building, street).", { missing: ["deliveryAddress"] });
    if (!phone.isUaeMobile) throw new ApiError("DELIVERY_REQUIRES_UAE_MOBILE", "Catering delivery needs a UAE mobile number for the driver.");
  }
  const token = generateAccessToken();
  const row = await withDateLocks(prisma, ["bulk-orders"], async (tx) => {
    const fresh = await computeBulkQuote(
      request.fulfilment.type === "delivery" && input.deliveryAddress ? { ...request, deliveryArea: input.deliveryAddress.area } : request,
      now,
      tx,
    );
    if (!fresh.dto.feasible) {
      throw new ApiError("QUOTE_NOT_FEASIBLE", fresh.dto.issues.map((i) => i.message).join(" ") || "The quote is no longer feasible.", {
        issues: fresh.dto.issues,
        alternatives: fresh.dto.alternatives,
        escalation: fresh.dto.escalation,
      });
    }
    // Price is locked to the quote; capacity was re-checked above under the lock.
    const original = quote.result as unknown as BulkQuoteDto;
    const totalFils = original.totals.total.amountFils;
    const number = await uniqueBulkNumber(tx);
    const drive = request.fulfilment.type === "delivery" ? (findDeliveryZone(input.deliveryAddress!.area, fresh.ctx.settings)?.zone.driveMinutes ?? 30) : 0;
    const readyAt = fresh.at.minus({ minutes: drive });
    const prepStart = readyAt.minus({ hours: 6 });
    const paymentMethod = fresh.deposit > 0 ? "bank_transfer_deposit" : request.fulfilment.type === "delivery" ? "cash_on_delivery" : "cash_on_pickup";
    return tx.order.create({
      data: {
        number,
        kind: "bulk",
        createdAt: now.toJSDate(),
        accessTokenHash: hashToken(token),
        status: "pending_confirmation",
        type: request.fulfilment.type,
        channel: channelFor(principal),
        source: sourceFor(principal),
        apiKeyId: principal.kind === "api_key" ? principal.id : null,
        customerName: input.customer.name,
        phone: phone.e164!,
        email: input.customer.email ?? null,
        promisedAt: fresh.at.toJSDate(),
        readyAt: readyAt.toJSDate(),
        prepStartAt: prepStart.toJSDate(),
        slotKey: "bulk",
        localDate: request.fulfilment.date,
        kitchenPortions: fresh.portions,
        subtotalFils: original.totals.subtotal.amountFils,
        discountPercent: original.totals.discountPercent,
        discountFils: original.totals.discount.amountFils,
        deliveryFeeFils: original.totals.deliveryFee.amountFils,
        totalFils,
        vatFils: vatIncluded(totalFils, fresh.ctx.settings.vatRatePercent),
        depositRequiredFils: original.totals.depositRequired.amountFils,
        paymentMethod,
        deliveryAddress: input.deliveryAddress ? (input.deliveryAddress as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        deliveryZoneId: input.deliveryAddress ? (findDeliveryZone(input.deliveryAddress.area, fresh.ctx.settings)?.zone.id ?? null) : null,
        specialInstructions: input.notes ?? null,
        requiresReview: true,
        reviewReason: `Catering orders are confirmed by the catering team within ${fresh.ctx.settings.bulk.reviewResponseHours} hours.`,
        quoteId: quote.id,
        guestCount: request.guestCount ?? null,
        eventType: request.eventType ?? null,
        companyName: input.companyName ?? null,
        items: {
          create: fresh.priced.map((l, position) => ({
            menuItemId: l.itemId,
            name: l.name,
            quantity: l.quantity,
            unitBasePriceFils: l.unitBasePriceFils,
            unitOptionsFils: l.unitOptionsFils,
            unitPriceFils: l.unitPriceFils,
            lineTotalFils: l.lineTotalFils,
            selectedOptions: l.selectedOptions as unknown as Prisma.InputJsonValue,
            kitchenPortions: l.kitchenPortions,
            allergens: composeItem(fresh.catalog, l.item, l.selectedOptionIds).allergens,
            notes: l.notes,
            position,
          })),
        },
        events: { create: { type: "created", toStatus: "pending_confirmation", actor: actorName(principal), note: `Created from quote ${quote.reference}` } },
      },
      include: orderInclude,
    });
  });
  logger.info("bulk.order.created", { number: row.number, portions: row.kitchenPortions, totalFils: row.totalFils, phone: maskPhone(row.phone) });
  const ctx = await loadRestaurantContext();
  const dto = toOrderDto(row, ctx, now);
  return {
    order: dto,
    accessToken: token,
    message: `Catering request ${dto.number} for ${dto.fulfilment.date} at ${dto.fulfilment.time} (${dto.totals.total.formatted}) has been received. It is NOT confirmed yet — the catering team will call to confirm within ${ctx.settings.bulk.reviewResponseHours} hours${dto.totals.depositRequired.amountFils > 0 ? ` and arrange the ${dto.totals.depositRequired.formatted} deposit` : ""}.`,
  };
}

async function uniqueBulkNumber(tx: Tx) {
  for (let i = 0; i < 10; i++) {
    const n = generateReference("bulkOrder");
    if (!(await tx.order.findUnique({ where: { number: n }, select: { id: true } }))) return n;
  }
  throw new ApiError("INTERNAL_ERROR", "Could not allocate an order number.");
}
