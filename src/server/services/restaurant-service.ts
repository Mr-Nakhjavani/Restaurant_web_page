import type { DateTime } from "luxon";
import { allServedAreas, findDeliveryZone } from "@/domain/delivery";
import { currentStatus, describeDay, nextOpening } from "@/domain/hours";
import { money } from "@/domain/money";
import { PAYMENT_METHOD_LABELS, kitchenAllergenStatement } from "@/domain/policies";
import { addDays, minutesToTime, timeToMinutes, toLocalDate } from "@/domain/time";
import { SEATING_AREAS, SEATING_AREA_LABELS, WEEKDAY_NAMES, type IsoWeekday } from "@/domain/types";
import { policyFacts } from "@/data/policies";
import { getConfig } from "../config";
import { ApiError } from "../errors";
import { loadCatalog, loadRestaurantContext } from "../repositories/catalog-repo";

export async function getRestaurant() {
  const ctx = await loadRestaurantContext();
  const base = getConfig().APP_BASE_URL;
  const p = ctx.profile;
  return {
    id: p.id,
    name: p.name,
    arabicName: p.arabicName,
    tagline: p.tagline,
    meaning: p.meaning,
    description: p.description,
    cuisine: p.cuisine,
    established: p.established,
    fictional: true as const,
    fictionalNotice: p.fictionalNotice,
    address: p.address,
    coordinates: p.coordinates,
    contact: p.contact,
    capacity: p.capacity,
    seatingAreas: SEATING_AREAS.map((a) => ({
      id: a,
      label: SEATING_AREA_LABELS[a],
      tables: ctx.tables.filter((t) => t.area === a).length,
      seats: ctx.tables.filter((t) => t.area === a).reduce((n, t) => n + t.maxCovers, 0),
    })),
    facilities: p.facilities,
    houseRules: p.houseRules,
    paymentMethodsAccepted: p.paymentMethodsAccepted,
    paymentMethodsNotAccepted: p.paymentMethodsNotAccepted,
    announcement: ctx.settings.announcement,
    timezone: ctx.settings.timezone,
    currency: ctx.settings.currency,
    pricesIncludeVat: ctx.settings.pricesIncludeVat,
    vatRatePercent: ctx.settings.vatRatePercent,
    links: {
      website: base,
      menu: `${base}/menu`,
      reservations: `${base}/reservations`,
      order: `${base}/order`,
      openapi: `${base}/api/v1/openapi.json`,
      apiDocs: `${base}/api/v1/docs`,
      knowledge: `${base}/api/v1/knowledge/documents`,
    },
    settingsUpdatedAt: ctx.settingsUpdatedAt,
  };
}

export async function getHours(now: DateTime, date?: string, days = 7) {
  const ctx = await loadRestaurantContext();
  const start = date ?? toLocalDate(now);
  const count = Math.min(Math.max(days, 1), 31);
  const s = ctx.settings;
  return {
    timezone: s.timezone,
    now: { ...currentStatus(now, ctx), nextOpening: nextOpening(now, ctx) },
    regularWeek: ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).map((d) => {
      const h = s.weeklyHours[String(d) as "1"];
      return {
        weekday: d,
        day: WEEKDAY_NAMES[d],
        opensAt: h?.open ?? null,
        closesAt: h?.close ?? null,
        kitchenLastOrderAt: h ? minutesToTime(timeToMinutes(h.close) - s.kitchenLastOrderMinutesBeforeClose) : null,
        lastReservationAt: h ? minutesToTime(timeToMinutes(h.close) - s.reservations.lastSeatingMinutesBeforeClose) : null,
      };
    }),
    breakfast: s.breakfast,
    delivery: { start: s.delivery.start, end: s.delivery.end, enabled: s.delivery.enabled },
    kitchenLastOrderMinutesBeforeClose: s.kitchenLastOrderMinutesBeforeClose,
    days: Array.from({ length: count }, (_, i) => describeDay(addDays(start, i), ctx)),
    specialPeriods: ctx.specialPeriods,
    closures: ctx.closures.filter((c) => c.date >= toLocalDate(now)),
  };
}

export async function getLocation() {
  const ctx = await loadRestaurantContext();
  const p = ctx.profile;
  return {
    name: p.name,
    address: p.address,
    coordinates: p.coordinates,
    entrance: "Heritage Quarter Gate 3, Al Seef Street (takeaway counter and drop-off bay)",
    landmarks: p.landmarks,
    directionsSummary: p.transportation.summary,
    mapLinks: {
      note: "Placeholder links for a fictional location — they open the approximate Al Seef area, not a real restaurant.",
      openStreetMap: `https://www.openstreetmap.org/?mlat=${p.coordinates.latitude}&mlon=${p.coordinates.longitude}#map=17/${p.coordinates.latitude}/${p.coordinates.longitude}`,
    },
    simulated: true,
  };
}

export async function getTransportation() {
  const ctx = await loadRestaurantContext();
  return { ...ctx.profile.transportation, landmarks: ctx.profile.landmarks, simulated: true };
}

export async function getPolicies() {
  const [ctx, catalog] = await Promise.all([loadRestaurantContext(), loadCatalog()]);
  const s = ctx.settings;
  const r = s.reservations;
  const o = s.ordering;
  const b = s.bulk;
  return {
    reservations: {
      partySize: { min: r.minPartySize, max: r.maxPartySize, autoConfirmMax: r.autoConfirmMaxPartySize },
      minNoticeMinutes: r.minNoticeMinutes,
      maxAdvanceDays: r.maxAdvanceDays,
      slotMinutes: r.slotMinutes,
      lastSeatingMinutesBeforeClose: r.lastSeatingMinutesBeforeClose,
      durations: r.durations,
      turnoverBufferMinutes: r.turnoverBufferMinutes,
      modificationCutoffMinutes: r.modificationCutoffMinutes,
      cancellation: "Free at any time before the booking; under 2 hours is recorded as a late cancellation. No deposit for regular tables.",
      lateArrivalGraceMinutes: r.lateArrivalGraceMinutes,
      phoneRequired: true,
      majlis: { ...r.majlis, minimumSpendPerPerson: money(r.majlis.minimumSpendPerPersonFils) },
      terrace: { season: r.terraceSeason, openNow: r.terraceOpen },
      walkIns: "Welcome subject to availability; some tables are kept for walk-ins.",
      highChairs: { total: policyFacts.highChairsTotal, maxPerBooking: policyFacts.maxHighChairsPerBooking },
    },
    ordering: {
      types: ["pickup", "delivery", "dine_in_preorder"],
      slotMinutes: o.slotMinutes,
      minLeadMinutes: o.minLeadMinutes,
      prepBufferMinutes: o.prepBufferMinutes,
      maxAdvanceDays: o.maxAdvanceDays,
      maxPortionsPerOrder: o.maxPortionsPerOrder,
      maxQuantityPerLine: o.maxQuantityPerLine,
      modificationCutoffMinutes: o.modificationCutoffMinutes,
      cancellation: "Free until the kitchen starts preparing the order.",
      pickupHoldMinutes: o.pickupHoldMinutes,
      manualReviewAbove: money(o.manualReviewAboveFils),
      dineInPreorderRequiresReservation: true,
      paymentMethods: Object.fromEntries(Object.entries(o.paymentMethods).map(([k, v]) => [k, v.map((m) => ({ id: m, label: PAYMENT_METHOD_LABELS[m] }))])),
      onlineCardPayment: false,
      lateOrderFreeCancelMinutes: policyFacts.lateOrderFreeCancelMinutes,
    },
    delivery: {
      enabled: s.delivery.enabled,
      hours: { start: s.delivery.start, end: s.delivery.end },
      emirate: s.delivery.emirate,
      requiresUaeMobile: true,
      zones: s.delivery.zones.map((z) => ({ ...z, fee: money(z.feeFils), minimumOrder: money(z.minimumOrderFils), freeDeliveryAbove: z.freeDeliveryAboveFils ? money(z.freeDeliveryAboveFils) : null })),
    },
    catering: {
      thresholdPortions: o.maxPortionsPerOrder + 1,
      maxPortionsPerOrder: b.maxPortionsPerOrder,
      dailyCapacityPortions: b.dailyCapacityPortions,
      noticeTiers: b.noticeTiers,
      discountTiers: b.discountTiers,
      fulfilmentWindow: { start: b.fulfilmentStart, end: b.fulfilmentEnd },
      quoteValidityHours: b.quoteValidityHours,
      deposit: { threshold: money(b.depositThresholdFils), percent: b.depositPercent },
      freeCancellationHours: b.freeCancellationHours,
      reviewResponseHours: b.reviewResponseHours,
      alwaysRequiresStaffConfirmation: true,
    },
    allergens: { kitchenStatement: kitchenAllergenStatement(catalog), guarantees: "No dish can be guaranteed free from any allergen." },
    houseRules: ctx.profile.houseRules,
    complaints: {
      windowHours: policyFacts.complaintWindowHours,
      contact: `${ctx.profile.contact.phone} or WhatsApp ${ctx.profile.contact.whatsapp}`,
      refunds: policyFacts.refundMethod,
    },
    verification: {
      method: "Reference plus the phone number used (X-Customer-Phone) or the access token (X-Access-Token).",
      failureLimit: policyFacts.verificationFailureLimit,
      lockMinutes: policyFacts.verificationLockMinutes,
    },
    pricing: { currency: s.currency, vatRatePercent: s.vatRatePercent, pricesIncludeVat: s.pricesIncludeVat, serviceCharge: false },
  };
}

export async function getDeliveryZones() {
  const ctx = await loadRestaurantContext();
  return {
    enabled: ctx.settings.delivery.enabled,
    hours: { start: ctx.settings.delivery.start, end: ctx.settings.delivery.end },
    zones: ctx.settings.delivery.zones.map((z) => ({ ...z, fee: money(z.feeFils), minimumOrder: money(z.minimumOrderFils), freeDeliveryAbove: z.freeDeliveryAboveFils ? money(z.freeDeliveryAboveFils) : null })),
  };
}

export async function checkDeliveryArea(area: string) {
  if (!area?.trim()) throw new ApiError("VALIDATION_ERROR", "Provide an area name, e.g. ?area=Al Karama");
  const ctx = await loadRestaurantContext();
  const match = findDeliveryZone(area, ctx.settings);
  if (!match) {
    return {
      area,
      served: false,
      regularDelivery: false,
      cateringDelivery: false,
      zone: null,
      message: `We do not deliver to “${area}”. Delivery covers central Dubai only; pickup from Al Seef is available.`,
      servedAreas: allServedAreas(ctx.settings, false),
    };
  }
  const z = match.zone;
  return {
    area: match.area,
    served: true,
    regularDelivery: z.regularOrders,
    cateringDelivery: true,
    zone: { id: z.id, name: z.name, fee: money(z.feeFils), minimumOrder: money(z.minimumOrderFils), freeDeliveryAbove: z.freeDeliveryAboveFils ? money(z.freeDeliveryAboveFils) : null, driveMinutes: z.driveMinutes },
    message: z.regularOrders
      ? `Yes, we deliver to ${match.area} (${z.name}): fee ${money(z.feeFils).formatted}, minimum order ${money(z.minimumOrderFils).formatted}.`
      : `${match.area} is covered for catering orders only (minimum ${money(z.minimumOrderFils).formatted}); regular takeaway delivery is not available there.`,
    servedAreas: [],
  };
}
