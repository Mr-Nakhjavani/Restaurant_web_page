import { composeItem } from "@/domain/catalog";
import { PAYMENT_METHOD_LABELS } from "@/domain/policies";
import { minutesToTime, timeToMinutes } from "@/domain/time";
import { ORDER_STATUS_INFO, RESERVATION_STATUS_INFO, ORDER_STATUSES, RESERVATION_STATUSES } from "@/domain/status";
import { SEATING_AREAS, SEATING_AREA_LABELS, WEEKDAY_NAMES, type IsoWeekday } from "@/domain/types";
import { policyFacts as pf } from "@/data/policies";
import { aed, header, human, priceOf, table, type KnowledgeContext } from "../context";
import { weeklyHoursTable } from "./profile-directions";

export function reservationsDoc(k: KnowledgeContext): string {
  const r = k.rc.settings.reservations;
  const tables = k.rc.tables;
  const walkIn = tables.filter((t) => !t.onlineBookable);
  const resClosures = k.rc.closures.filter((c) => c.scope !== "orders");
  return [
    header(k, "reservations-and-seating", "Reservations & Seating", "Reservation policies, party sizes, table types, seating preferences, cancellations, late arrivals, walk-ins and group bookings."),
    "## Summary for agents",
    "",
    `- Tables can be booked for **${r.minPartySize}–${r.maxPartySize} guests**, from ${r.minNoticeMinutes} minutes ahead up to **${r.maxAdvanceDays} days** ahead, on ${r.slotMinutes}-minute slots.`,
    `- Groups of **${r.autoConfirmMaxPartySize + 1}–${r.maxPartySize}** are accepted as a *request* (status \`pending_confirmation\`, table held) and confirmed by the team. Larger groups or private hire: events team.`,
    "- A seating area is a requirement when requested: if it is full the API returns `SEATING_PREFERENCE_UNAVAILABLE` with alternatives. It never silently moves guests.",
    "- A phone number is mandatory for every reservation (UAE or international with country code).",
    "- Always check `GET /api/v1/reservations/availability` first, then book with `POST /api/v1/reservations`. Only call a booking confirmed when the response status is `confirmed`.",
    "",
    "## Reservation hours",
    "",
    weeklyHoursTable(k),
    "",
    `The last reservation starts ${r.lastSeatingMinutesBeforeClose} minutes before closing. Breakfast tables can be booked from opening time.`,
    "",
    "## How long is a table booked?",
    "",
    table(
      ["Party size", "Table time"],
      [...r.durations].sort((a, b) => a.maxPartySize - b.maxPartySize).map((d, i, arr) => [`${i === 0 ? 1 : arr[i - 1].maxPartySize + 1}–${d.maxPartySize}`, `${d.minutes} minutes`]),
    ),
    "",
    `Majlis bookings are ${r.majlis.durationMinutes} minutes. There is a ${r.turnoverBufferMinutes}-minute reset between bookings on the same table.`,
    "",
    "## Seating areas",
    "",
    table(
      ["Area", "Tables", "Party sizes", "Notes"],
      SEATING_AREAS.map((area) => {
        const t = tables.filter((x) => x.area === area);
        const notes: Record<string, string> = {
          indoor: "Main hall, air-conditioned; booths and a long table (L1, 9–14 guests); high-chair space at several tables.",
          window: "Indoor tables along the glass facing the creek; most requested — book early.",
          terrace: `Outdoor creek terrace, open ${r.terraceSeason.startMonthDay.split("-").reverse().join("/")}–${r.terraceSeason.endMonthDay.split("-").reverse().join("/")} (day/month) and weather permitting. Heaters are not available; summer closure.`,
          majlis: `Two private rooms with floor seating: Majlis Al Sidr (6–10, low chairs on request) and Majlis Al Ghaf (10–20). Minimum ${r.majlis.minPartySize} guests, book ${r.majlis.minNoticeHours} h ahead, minimum spend ${aed(r.majlis.minimumSpendPerPersonFils)} per person.`,
        };
        return [SEATING_AREA_LABELS[area], t.length, `${Math.min(...t.map((x) => x.minCovers))}–${Math.max(...t.map((x) => x.maxCovers))}`, notes[area]];
      }),
    ),
    "",
    "Full table list:",
    "",
    table(
      ["Table", "Area", "Seats", "Bookable online", "Features"],
      tables.map((t) => [t.code, t.area, `${t.minCovers}–${t.maxCovers}`, t.onlineBookable ? "yes" : "no (walk-ins)", t.features.join(", ") || "—"]),
    ),
    "",
    `Walk-in tables (never offered online): ${walkIn.map((t) => t.code).join(", ")}. Walk-ins are welcome whenever a table is free; there is no walk-in waiting list by phone.`,
    "",
    "## Seating preferences",
    "",
    "- Guests may ask for indoor, window, terrace or majlis seating. With **no preference** we choose the best-fitting table (main hall first, then terrace, then window).",
    "- A preference is guaranteed only if the API booked that area (`seatingArea` in the response). We cannot promise a specific table number.",
    "- If a window table is fully booked we cannot “make one available”: offer another time with window availability or a different area.",
    "- Wheelchair users: set `wheelchairAccess: true` and only step-free, accessible tables are offered (main hall, window, terrace T4/T6). The majlis rooms have floor seating.",
    `- High chairs: up to ${pf.maxHighChairsPerBooking} per booking (${pf.highChairsTotal} in the restaurant). Children count towards the party size.`,
    "",
    "## Large groups",
    "",
    `- Up to ${r.autoConfirmMaxPartySize} guests: confirmed instantly if a table is free.`,
    `- ${r.autoConfirmMaxPartySize + 1}–${r.maxPartySize} guests: a table is held and the booking is \`pending_confirmation\` until the team calls back (usually within ${k.rc.settings.bulk.reviewResponseHours} hours).`,
    `- More than ${r.maxPartySize}: not bookable online or by phone — pass to the events team (${k.rc.profile.contact.eventsEmail}).`,
    "- The party size must be the number of guests expected. If numbers are uncertain, book for the likely number and update it up to the change cut-off; tables for large groups may be reduced if far fewer guests arrive.",
    "",
    "## Changes, cancellations and late arrivals",
    "",
    `- Changes (date, time, party size, area, requests) can be made online or by phone until **${r.modificationCutoffMinutes / 60} hours** before the booking, subject to availability. After that, the team must be called.`,
    "- Cancellation is free at any time before the booking time. Cancelling less than 2 hours before is recorded as a late cancellation.",
    `- Late arrival: tables are held for **${r.lateArrivalGraceMinutes} minutes**. After that the table may be released (status \`no_show\`). Guests running late should call.`,
    "- No deposit or card guarantee is taken for regular tables. Majlis minimum spend is settled at the end of the meal.",
    "- Cancelling a reservation also cancels any linked dine-in pre-order that has not started cooking.",
    "",
    "## Verification",
    "",
    "To read, change or cancel a reservation the caller must give the reference (e.g. RES-482913) **and** the phone number used to book (sent as `X-Customer-Phone`), or the access token returned at booking. The API answers `RECORD_NOT_FOUND` if either is wrong, and locks the reference for 15 minutes after 5 failed attempts.",
    "",
    "## Statuses",
    "",
    table(["Status", "Meaning"], RESERVATION_STATUSES.map((s) => [`\`${s}\``, `${RESERVATION_STATUS_INFO[s].label} — ${RESERVATION_STATUS_INFO[s].description}`])),
    "",
    "## Closures affecting reservations",
    "",
    resClosures.length
      ? table(["Date", "From", "To", "Reason", "Note"], resClosures.map((c) => [c.date, c.startTime ?? "all day", c.endTime ?? "close", c.reason, c.publicNote]))
      : "None scheduled.",
    "",
    "## Reservations and special days",
    "",
    "- During Ramadan the dining room opens at 12:00; iftar tables (from 17:30) are the busiest of the year and should be booked early. Iftar Set Menus are ordered as a dine-in pre-order linked to the reservation.",
    "- Friday evenings and Saturday lunch are the busiest regular times.",
    "",
  ].join("\n");
}

export function orderingDoc(k: KnowledgeContext): string {
  const s = k.rc.settings;
  const o = s.ordering;
  const notDelivered = k.catalog.items.filter((i) => i.isVisible && !i.fulfilment.delivery && !i.bulk.bulkOnly).map((i) => i.name);
  const notPickup = k.catalog.items.filter((i) => i.isVisible && !i.fulfilment.pickup).map((i) => i.name);
  const prepRows = k.catalog.items.filter((i) => i.isVisible && !i.bulk.bulkOnly && i.kitchenPortions > 0).map((i) => [i.name, `${i.prepTimeMinutes} min`]);
  return [
    header(k, "ordering-and-takeaway", "Ordering, Pickup & Takeaway", "Pickup procedures, pre-orders, delivery, customer details, modifications, cancellations, payment methods and order statuses."),
    "## Order types",
    "",
    table(
      ["Type", "API value", "What it means"],
      [
        ["Pickup / takeaway", "`pickup`", "Order ahead and collect at the takeaway counter (Heritage Quarter Gate 3) at the confirmed time."],
        ["Delivery", "`delivery`", `Our own drivers deliver within central Dubai, ${s.delivery.start}–${s.delivery.end}. See delivery-areas.md.`],
        ["Dine-in pre-order", "`dine_in_preorder`", "Order before arriving so food is ready when you sit down. Requires a confirmed reservation made with the same phone number; food is served between the reservation time and one hour after."],
      ],
    ),
    "",
    "Guests can always order at the table without a pre-order, and can place takeaway orders without any reservation.",
    "",
    "## What the restaurant needs",
    "",
    "- Customer name and a valid phone number (UAE local format like 050 123 4567, or international with country code). Delivery needs a **UAE mobile** number.",
    "- Items, quantities and any customisations (option ids from the menu).",
    "- Pickup time, delivery time, or ASAP.",
    "- Delivery only: area, building/villa, street, and unit/floor if applicable; landmark and instructions are optional. No address is needed for pickup.",
    "- Optional: e-mail, the name (and phone) of someone else collecting, special instructions (max 300 characters).",
    "",
    "## Timing rules",
    "",
    `- Times are booked in ${o.slotMinutes}-minute slots.`,
    `- Minimum lead time = the longest preparation time in the order + ${o.prepBufferMinutes} minutes buffer, and never less than ${o.minLeadMinutes} minutes. For example, an order with Hammour Mashwi (20 min) needs at least ${Math.max(o.minLeadMinutes, 20 + o.prepBufferMinutes)} minutes.`,
    `- Food can be ready from ${o.firstReadyMinutesAfterOpen} minutes after opening until ${o.lastReadyMinutesBeforeClose} minutes before closing (e.g. 08:30–22:45 Monday–Thursday).`,
    `- Orders can be scheduled up to ${o.maxAdvanceDays} days ahead. Further ahead: call back nearer the date, or use catering for large orders.`,
    `- Kitchen capacity: ${o.slotCapacityPortions} kitchen portions and ${o.maxOrdersPerSlot} orders per ${o.slotMinutes}-minute slot. If a slot is full the API offers the nearest free slots — it never accepts a time it cannot meet.`,
    "- With ASAP, the API picks the earliest slot at which every dish in the basket is available.",
    "- How early to order: at least the lead time above; for Friday lunch and Ramadan iftar, ordering a day ahead is recommended.",
    "",
    "Preparation times:",
    "",
    table(["Dish", "Preparation"], prepRows),
    "",
    "## Size limits",
    "",
    `- Maximum ${o.maxQuantityPerLine} of any one dish per regular order (some dishes have lower limits).`,
    `- Maximum ${o.maxPortionsPerOrder} kitchen portions per regular order (drinks do not count). Larger orders are **catering orders** (see bulk-and-catering-orders.md).`,
    `- Orders above ${aed(o.manualReviewAboveFils)} are accepted as \`pending_confirmation\` and confirmed by the team by phone.`,
    `- Phone numbers with ${o.notCollectedReviewThreshold} or more uncollected orders in the last 90 days are also confirmed manually.`,
    "",
    "## Collecting a pickup order",
    "",
    "1. Come to the takeaway counter at Heritage Quarter Gate 3 on Al Seef Street (10-minute drop-off bay outside).",
    "2. Give the order number (e.g. ORD-604215) and the name on the order. Someone else may collect if their name was given or they quote the order number and phone number.",
    "3. Pay by cash, card, Apple Pay or Google Pay.",
    `4. Orders are held for **${o.pickupHoldMinutes} minutes** after the pickup time. Hot food is kept warm for about ${pf.hotHoldingMinutes} minutes; after ${o.pickupHoldMinutes} minutes the order may be marked \`not_collected\` and is not kept for food-safety reasons. Late? Call so we can re-time it if the kitchen has not started.`,
    "",
    "## Payment",
    "",
    table(
      ["Order type", "Methods"],
      (["pickup", "delivery", "dine_in_preorder"] as const).map((t) => [t, o.paymentMethods[t].map((m) => PAYMENT_METHOD_LABELS[m]).join("; ")]),
    ),
    "",
    "There is **no online card payment** in this environment and card numbers are never collected by phone or online. Prices include 5% VAT; delivery fees are shown separately.",
    "",
    "## Changing or cancelling an order",
    "",
    `- Changes (items, time, address, instructions) are possible until **${o.modificationCutoffMinutes} minutes before** the pickup/delivery time or until preparation starts, whichever is earlier, and only while the status is \`pending_confirmation\` or \`confirmed\`. Every change is re-checked for availability, capacity and price.`,
    "- Cancellation is free until the kitchen starts preparing the order (shown as `allowedActions.cancellableUntil`). After that, the team decides case by case.",
    "- Changing an order into a large one (e.g. from 6 to 50 meals) turns it into a catering order and needs catering notice — it cannot keep the original time.",
    "- Catering (bulk) orders are changed through the catering team.",
    "",
    "## Statuses",
    "",
    table(["Status", "Meaning"], ORDER_STATUSES.map((st) => [`\`${st}\``, `${ORDER_STATUS_INFO[st].label} — ${ORDER_STATUS_INFO[st].description}`])),
    "",
    "Typical flow: `pending_confirmation` (only when manual review applies) → `confirmed` → `preparing` → `ready_for_pickup` / `out_for_delivery` / `ready_to_serve` → `completed`. Failure paths: `rejected`, `cancelled`, `not_collected`, `delivery_failed`.",
    "",
    "## Dishes with ordering restrictions",
    "",
    `- Not available for delivery: ${notDelivered.join(", ")}.`,
    `- Not available for pickup: ${notPickup.join(", ") || "none"}.`,
    "- Catering only (not in regular orders): " + k.catalog.items.filter((i) => i.bulk.bulkOnly).map((i) => i.name).join(", ") + ".",
    "- Day- and season-specific dishes: see special-days-and-seasonal-menu.md. The backend rejects them on other days with `ITEM_UNAVAILABLE` and returns `nextAvailable`.",
    "",
    "## When something goes wrong",
    "",
    "- **An item becomes unavailable after ordering:** the team removes it, re-totals the order and calls the customer to offer a substitute of similar value or a cancellation. Nothing is charged for removed items.",
    `- **Missing or incorrect item:** report within ${pf.complaintWindowHours} hours by phone or WhatsApp with the order number (a photo helps). We replace the item or refund/credit it. ${pf.refundMethod}`,
    `- **The restaurant is late:** we will tell the customer the new time; customers may cancel without charge if the order is more than ${pf.lateOrderFreeCancelMinutes} minutes late.`,
    "",
    "## Verification",
    "",
    "Order lookups need the order number plus the phone number used (`X-Customer-Phone`) or the access token. Staff can see all orders.",
    "",
    "## Allergy notes",
    "",
    "If the special instructions mention an allergy, the order is flagged and the duty manager calls the customer. The kitchen still cannot guarantee the absence of any allergen.",
    "",
  ].join("\n");
}

export function deliveryDoc(k: KnowledgeContext): string {
  const d = k.rc.settings.delivery;
  return [
    header(k, "delivery-areas", "Delivery Areas & Fees", "Where we deliver, fees, minimum orders and delivery rules."),
    `We run our own delivery within Dubai, **${d.start}–${d.end}** (arrival times). Breakfast is not delivered. We do not deliver outside Dubai (no Abu Dhabi, Sharjah, Ajman or other emirates) and we do not use third-party delivery apps in this environment.`,
    "",
    table(
      ["Zone", "Regular orders", "Fee", "Minimum order", "Free above", "Typical drive", "Areas"],
      d.zones.map((z) => [z.name, z.regularOrders ? "yes" : "catering only", aed(z.feeFils), aed(z.minimumOrderFils), z.freeDeliveryAboveFils ? aed(z.freeDeliveryAboveFils) : "—", `${z.driveMinutes} min`, z.areas.join(", ")]),
    ),
    "",
    "## Rules",
    "",
    "- Delivery time = the time food arrives; the kitchen schedules dispatch using the zone's drive time. Arrival is estimated within a 15-minute window.",
    "- The earliest delivery = preparation lead time + drive time. “Deliver to Abu Dhabi in 15 minutes” is impossible: Abu Dhabi is outside our area, and no delivery is faster than lead time + drive time.",
    "- A UAE mobile number is required so the driver can call.",
    "- Address: area (must be in the list above), building or villa, street; plus apartment/unit, floor, landmark, Makani number and instructions if helpful.",
    `- Payment: cash or card on delivery. Drivers carry change up to AED ${pf.driverChangeAed}.`,
    `- If the driver cannot reach the customer within ${pf.deliveryWaitMinutes} minutes at the address, the order is marked \`delivery_failed\` and the team calls.`,
    "- Dishes that do not travel well are not delivered (see ordering-and-takeaway.md).",
    "",
    "Area names are matched leniently (e.g. “Karama”, “Al Karama”). Unknown areas return `DELIVERY_AREA_NOT_SERVED` with the full list.",
    "",
  ].join("\n");
}

export function bulkDoc(k: KnowledgeContext): string {
  const b = k.rc.settings.bulk;
  const o = k.rc.settings.ordering;
  const eligible = k.catalog.items.filter((i) => i.isVisible && i.bulk.eligible);
  const notEligible = k.catalog.items.filter((i) => i.isVisible && !i.bulk.eligible && i.kitchenPortions > 0);
  const lunchBox = k.catalog.itemsById.get("mi_office_lunch_box");
  const lamb = k.catalog.itemsById.get("mi_lamb_machboos");
  const forty = lunchBox ? lunchBox.priceFils * 40 : 0;
  const hundredLamb = lamb ? lamb.priceFils * 100 : 0;
  return [
    header(k, "bulk-and-catering-orders", "Bulk & Catering Orders", "Family platters, office lunches, catering, large quantities, notice periods, serving sizes, maximum quantities and escalation."),
    "## When is an order a catering order?",
    "",
    `Regular orders are limited to ${o.maxPortionsPerOrder} kitchen portions. Anything larger — or any catering-only dish — goes through the catering flow:`,
    "",
    "1. `POST /api/v1/bulk-orders/quotes` — the backend checks quantities, notice, capacity and price and returns a quote id, status (`feasible`, `needs_changes`, `not_possible`), issues and alternatives.",
    "2. `POST /api/v1/bulk-orders` with the quote id and customer details — creates a catering order with status **`pending_confirmation`**.",
    `3. The catering team calls to confirm within ${b.reviewResponseHours} hours (and arranges any deposit). Never tell the customer a catering order is confirmed before its status is \`confirmed\`.`,
    "",
    "## Notice required",
    "",
    table(
      ["Order size (kitchen portions)", "Minimum notice"],
      [...b.noticeTiers].sort((a, c) => a.maxPortions - c.maxPortions).map((t, i, arr) => [`${i === 0 ? o.maxPortionsPerOrder + 1 : arr[i - 1].maxPortions + 1}–${t.maxPortions}`, `${t.hours} hours`]),
    ),
    "",
    "Some dishes need more notice than the tier (see the table below); the longest requirement applies.",
    "",
    "## Capacity and limits",
    "",
    `- Maximum per catering order: **${b.maxPortionsPerOrder} portions**. Above that, or for events beyond our daily capacity, escalate to the events team (${k.rc.profile.contact.eventsEmail}).`,
    `- Daily catering capacity: **${b.dailyCapacityPortions} portions** across all catering orders.`,
    `- Collection or delivery between **${b.fulfilmentStart} and ${b.fulfilmentEnd}**, up to ${b.maxAdvanceDays} days ahead.`,
    "- Catering delivery covers zones A–D (see delivery-areas.md). Zone D is catering-only.",
    "",
    "## Pricing",
    "",
    table(["Order size", "Discount on food"], [["up to 50 portions", "none"], ...b.discountTiers.map((t) => [`${t.minPortions}+ portions`, `${t.percent}%`])]),
    "",
    `- Quotes are valid for ${b.quoteValidityHours} hours and lock the price.`,
    `- Orders of ${aed(b.depositThresholdFils)} or more need a ${b.depositPercent}% deposit, arranged by the catering team by bank transfer after confirmation (simulated in this environment — no payment is taken online).`,
    `- Free cancellation until ${b.freeCancellationHours} hours before collection/delivery; later cancellations are handled by the catering team.`,
    "",
    "## Dishes available for catering",
    "",
    table(
      ["Dish", "Unit price", "Serves", "Max per day", "Extra notice", "Notes"],
      eligible.map((i) => [i.name, aed(i.priceFils), i.portion.servesPeople, i.bulk.maxQuantityPerDay ?? "—", i.bulk.minNoticeHours ? `${i.bulk.minNoticeHours} h` : "—", `${i.bulk.bulkOnly ? "Catering only. " : ""}${i.bulk.minQuantity ? `Min ${i.bulk.minQuantity}. ` : ""}${i.bulk.note ?? ""}`]),
    ),
    "",
    `Not available in catering quantities (cooked to order): ${notEligible.map((i) => i.name).join(", ")}.`,
    "",
    "## Worked examples",
    "",
    `- **40 office lunches:** 40 × Office Machboos Lunch Box = ${aed(forty)} (no volume discount below 51 portions). Needs at least 24 hours' notice; delivery fee by zone. Mixing mains is fine (e.g. 30 chicken + 10 vegetable; minimum 10 boxes per line).`,
    `- **100 portions for an event:** e.g. 100 × Lamb Machboos = ${aed(hundredLamb)} before the 5% discount (51–100 portions). Needs 48 hours' notice and capacity on the day; status stays pending until the catering team confirms.`,
    "- **200 machboos in 20 minutes:** impossible. 200 portions need 72 hours' notice, Lamb Machboos is limited to 150 per day, and no kitchen can produce that in 20 minutes. Offer the earliest feasible date (returned by the quote) or a split across dishes, and escalate if needed. Never guarantee.",
    "- **More than 250 portions:** above the per-order maximum — escalate to the events team.",
    "- **Whole Lamb Ouzi:** catering only, 48 hours' notice, maximum 3 per day, serves 10–12.",
    "",
    "## Family platters (regular orders)",
    "",
    `- Majlis Sharing Platter — ${priceOf(k, "mi_majlis_platter")}, serves 4, every day from 12:00.`,
    `- Friday Family Machboos Platter — ${priceOf(k, "mi_friday_platter")}, serves 5, Fridays only, pickup or dine-in, order at least 2 hours ahead.`,
    `- Weekend Fuala Breakfast — ${priceOf(k, "mi_weekend_fuala")}, serves 2, Saturdays & Sundays until 12:00.`,
    "",
    "For “what is the cheapest way to feed N people?”, call `GET /api/v1/menu/feeding-suggestions?guests=N&date=…` — it computes the cheapest combinations of available main dishes. Do not calculate prices from memory.",
    "",
    "## Escalation",
    "",
    "Escalate (take name, phone and event details; promise a call-back, not a booking) when: the quote status is `not_possible`; the event is above 250 portions; the customer needs services we do not list (staffing, equipment, live cooking, buffets on site); the date is more than 90 days away; or the customer disputes a catering price.",
    "",
    `Example allergen note for catering: Office Lunch Box (chicken) contains ${composeItem(k.catalog, lunchBox!).allergens.join(", ")} — each box is labelled.`,
    "",
  ].join("\n");
}

export function specialDaysDoc(k: KnowledgeContext): string {
  const items = k.catalog.items.filter((i) => i.isVisible);
  const weekly = items.filter((i) => i.availabilityRules.some((r) => r.type === "days_of_week"));
  const limited = items.filter((i) => i.kind === "limited_time");
  const ramadan = k.rc.specialPeriods.find((p) => p.type === "ramadan");
  const notInRamadan = items.filter((i) => i.availabilityRules.some((r) => r.type === "not_during_period" && r.periodType === "ramadan")).map((i) => i.name);
  const byDay = ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).map((d) => {
    const list = weekly.filter((i) => i.availabilityRules.some((r) => r.type === "days_of_week" && r.days.includes(d)));
    return [WEEKDAY_NAMES[d], list.map((i) => `${i.name} (${aed(i.priceFils)})`).join("; ") || "—"];
  });
  const tw = (id: string) => {
    const r = k.catalog.itemsById.get(id)?.availabilityRules.find((x) => x.type === "time_window") as { start: string; end: string } | undefined;
    return r ? `${r.start}–${r.end}` : "all day";
  };
  return [
    header(k, "special-days-and-seasonal-menu", "Special Days & Seasonal Menu", "Weekly specials, Ramadan arrangements, seasonal dishes, public holidays and advance-order restrictions."),
    "## How special-day rules work",
    "",
    "Special dishes carry machine-readable rules (days of week, time windows, date ranges, special periods, order types, minimum notice, pre-order opening dates). The backend enforces them for every order and reservation pre-order, in Dubai time. When a dish is not available on a requested date the API returns `ITEM_UNAVAILABLE` with the reason and `nextAvailable`.",
    "",
    "Three kinds of dishes:",
    "",
    "- **Permanent** — on the menu every day (within breakfast or lunch/dinner hours).",
    "- **Daily / weekly specials** — recur on particular weekdays (the same every week).",
    "- **Limited-time** — only within specific dates or special periods (Ramadan, National Day, winter).",
    "",
    "## Weekly specials",
    "",
    table(["Day", "Specials"], byDay),
    "",
    ...weekly.map((i) => `- **${i.name}** — ${i.availabilityNote}`),
    "",
    "Pre-ordering: a weekday special can be pre-ordered on any day for collection on its own day (up to 7 days ahead). It cannot be collected on a different day, at any price.",
    "",
    "## Limited-time dishes",
    "",
    table(["Dish", "Price", "When", "Notes"], limited.map((i) => [i.name, aed(i.priceFils), i.availabilityNote.split(".")[0], i.availabilityNote])),
    "",
    "## Calendar of special periods",
    "",
    table(
      ["Period", "Type", "From", "To", "Provisional?", "Hours", "Notes"],
      k.rc.specialPeriods.map((p) => [p.name, p.type, human(p.startDate), human(p.endDate), p.provisional ? "yes (moon sighting)" : "no", p.hoursOverride ? `${p.hoursOverride.open}–${p.hoursOverride.close}` : "normal", p.notes]),
    ),
    "",
    "## Closures",
    "",
    k.rc.closures.length
      ? table(["Date", "From", "To", "Applies to", "Reason", "Public note"], k.rc.closures.map((c) => [c.date, c.startTime ?? "all day", c.endTime ?? "close", c.scope, c.reason, c.publicNote]))
      : "No closures scheduled.",
    "",
    "## Ramadan",
    "",
    ramadan
      ? `- Ramadan ${ramadan.startDate.slice(0, 4)} is provisionally **${human(ramadan.startDate)} – ${human(ramadan.endDate)}** (subject to moon sighting; the team updates the dates when announced).`
      : "- Ramadan dates are not yet scheduled.",
    `- Hours: ${ramadan?.hoursOverride ? `${ramadan.hoursOverride.open}–${ramadan.hoursOverride.close}` : "to be announced"} every day. Breakfast dishes are not served (${notInRamadan.join(", ")}).`,
    `- **Ramadan Iftar Set Menu** (${priceOf(k, "mi_iftar_set")} per person, minimum 2): served/collected ${tw("mi_iftar_set")}; same-day orders by 14:00; dine-in (with a reservation) or pickup; not delivered. It is **not available outside Ramadan** — no exceptions; the individual dishes (lentil shorba, sambousa, machboos, harees, luqaimat) are on the regular menu all year.`,
    "- Iftar seating starts at 17:30; dates and laban are served at the sunset call to prayer. Book iftar tables early.",
    "- Eating and drinking in public during fasting hours is permitted in Dubai; the dining room is open from 12:00.",
    "",
    "## UAE National Day (Eid Al Etihad)",
    "",
    `- **Eid Al Etihad Feast** (${priceOf(k, "mi_etihad_feast")}, serves 4) is available 1–3 December 2026 only. Pre-orders open on **15 November 2026** and need at least 24 hours' notice. Limited to 20 per day.`,
    "- Normal opening hours apply on National Day.",
    "",
    "## Eid Al Fitr and Eid Al Adha",
    "",
    "- Eid Al Fitr 2027 (provisional): we open at 14:00 on the first day and keep normal hours afterwards.",
    "- On other public holidays we keep normal hours unless a closure is listed above.",
    "",
    "## Seasonal dishes",
    "",
    "- **Aseedat Bobar** (winter pumpkin asida) — 1 November 2026 to 28 February 2027.",
    "- The outdoor terrace is seasonal (mid-October to end of April).",
    "",
    "## Advance-order restrictions",
    "",
    `- Regular orders: up to ${k.rc.settings.ordering.maxAdvanceDays} days ahead. “Tomorrow's special for collection next month” is not possible — the special must be collected on its own day within the 7-day window; order nearer the date.`,
    "- Dishes with a minimum notice (Friday platter 2 h, Eid Al Etihad Feast 24 h) are rejected with `INSUFFICIENT_NOTICE` if ordered too late.",
    "- Dishes with a pre-order opening date reject earlier orders with `PREORDERS_NOT_OPEN`.",
    "- Catering orders follow their own notice tiers (bulk-and-catering-orders.md).",
    "",
    "## Opening hours on any date",
    "",
    "`GET /api/v1/restaurant/hours?date=YYYY-MM-DD` returns the exact hours for a date including Ramadan overrides and closures. Regular week:",
    "",
    weeklyHoursTable(k),
    "",
  ].join("\n");
}

export { minutesToTime, timeToMinutes };
