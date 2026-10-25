/**
 * Service documents: ordering (pickup, timing, limits, pre-orders, changes, statuses,
 * problems), delivery (overview, one per zone, one section per area), reservations
 * (rules, durations, seating areas, tables, groups, changes, statuses) and catering.
 */
import { bulkDiscountPercent, depositFor } from "@/domain/bulk-rules";
import { AREA_ALIASES } from "@/domain/delivery";
import { percentOf } from "@/domain/money";
import { SEATING_AREA_LABELS, SEATING_AREAS, type SeatingArea } from "@/domain/types";
import { policyFacts as pf } from "@/data/policies";
import type { KnowledgeContext } from "../context";
import { dishFacts, visibleItems } from "./facts";
import { docPath, node } from "./ids";
import type { RagDocument } from "./model";
import { minus, plus } from "./restaurant-docs";
import { aed, bullets, dateShort, list, paragraphs, plural, price, time, timeRange, weekday, WEEKDAYS } from "./text";

const R = "Bayt Al Ghaf";

const FEATURE_WORDS: Record<string, string> = {
  creek_view: "creek view",
  wheelchair_accessible: "wheelchair accessible",
  walk_in_only: "kept for walk-in guests (not bookable in advance)",
  high_chair_space: "space for high chairs",
  booth: "booth seating",
  long_table: "long table for groups",
  outdoor: "outdoors",
  private_room: "private room",
  floor_seating: "traditional floor seating",
  low_chairs_on_request: "low chairs on request",
};

export const ORDER_STATUS_TEXT: Record<string, [string, string]> = {
  pending_confirmation: ["Received — awaiting confirmation", "The order has been received but not yet accepted. The team reviews it (for example large or high-value orders) and calls to confirm. It is not confirmed until the team accepts it."],
  confirmed: ["Confirmed", "Bayt Al Ghaf has accepted the order and scheduled it for the agreed time."],
  preparing: ["Being prepared", "The kitchen has started cooking. From this point the order can no longer be changed or cancelled online."],
  ready_for_pickup: ["Ready for collection", "The order is packed and waiting at the takeaway counter at Heritage Quarter Gate 3."],
  out_for_delivery: ["Out for delivery", "A Bayt Al Ghaf driver has collected the order and is on the way."],
  ready_to_serve: ["Ready to serve", "The pre-ordered food is ready to be served at the guest's table."],
  completed: ["Completed", "The order has been collected, delivered or served."],
  cancelled: ["Cancelled", "The order was cancelled by the customer or by the restaurant."],
  rejected: ["Declined by the restaurant", "Bayt Al Ghaf could not accept the order."],
  not_collected: ["Not collected", "The pickup order was not collected within the 60-minute holding time and was not kept, for food-safety reasons."],
  delivery_failed: ["Delivery failed", "The driver could not complete the delivery (for example the customer could not be reached at the address for 10 minutes); the team calls the customer."],
};

export const RESERVATION_STATUS_TEXT: Record<string, [string, string]> = {
  pending_confirmation: ["Requested — awaiting confirmation", "A table is held while the team reviews the request (groups of 13 to 20). It is not confirmed until the team calls back and confirms it."],
  confirmed: ["Confirmed", "The table is booked."],
  seated: ["Seated", "The guests have arrived and are seated."],
  completed: ["Completed", "The visit is finished."],
  cancelled: ["Cancelled", "The reservation was cancelled by the guest or by the restaurant."],
  no_show: ["No-show", "The guests did not arrive within the 15-minute grace period and the table was released."],
  rejected: ["Declined", "The restaurant could not accommodate the request."],
};

export function serviceDocuments(k: KnowledgeContext): RagDocument[] {
  const s = k.rc.settings;
  const o = s.ordering;
  const r = s.reservations;
  const b = s.bulk;
  const d = s.delivery;
  const ct = k.rc.profile.contact;
  const items = visibleItems(k);
  const facts = items.map((i) => dishFacts(k, i));
  const zones = d.zones;
  const regularZones = zones.filter((z) => z.regularOrders);
  const tables = k.rc.tables;
  const wk = s.weeklyHours;
  const docs: RagDocument[] = [];

  // ---------------------------------------------------------------- ordering
  docs.push({
    id: "ordering-overview",
    path: "documents/ordering/ordering-overview.md",
    title: `How ordering works at ${R}`,
    docType: "ordering",
    summary: `Ordering from ${R}: pickup, delivery and dine-in pre-orders, what details are needed, how far ahead, ASAP orders, order numbers and when an order counts as confirmed.`,
    entities: [node.restaurant(), node.orderType("pickup"), node.orderType("delivery"), node.orderType("dine-in-preorder")],
    tags: ["ordering"],
    sections: [
      {
        heading: `Ways to order from ${R}`,
        body: bullets([
          "Pickup (takeaway): order ahead and collect at the takeaway counter at Heritage Quarter Gate 3, Al Seef Street, at the confirmed time.",
          `Delivery: ${R}'s own drivers deliver within central Dubai, with arrival between ${timeRange(d.start, d.end)}.`,
          "Dine-in pre-order: order before arriving so the food is ready when you sit down. It needs a confirmed table reservation made with the same phone number.",
          "Guests can always order at the table without a pre-order, and can order takeaway without a reservation.",
          `Orders can be placed by phone on ${ct.phone} or on the ${R} website.`,
        ]),
      },
      {
        heading: `Details ${R} needs for an order`,
        body: bullets([
          "The customer's name and a valid phone number (UAE local format such as 050 123 4567, or international with the country code). Delivery orders need a UAE mobile number so the driver can call.",
          "The dishes, quantities and any options (for example spice level or “no raisins”).",
          "A pickup time, a delivery time, or ASAP (as soon as possible).",
          "For delivery only: the area, the building or villa, the street, and the apartment or floor if there is one. A landmark, Makani number and instructions help but are optional. No address is needed for pickup.",
          "Optional: an e-mail address, the name of someone else who will collect, and special instructions (up to 300 characters).",
        ]),
      },
      {
        heading: `How far ahead you can order from ${R}`,
        body: `Regular orders can be scheduled for any ${o.slotMinutes}-minute slot from the earliest possible time up to ${o.maxAdvanceDays} days ahead. Orders further ahead cannot be accepted yet — order nearer the date, or use catering for large orders (up to ${b.maxAdvanceDays} days ahead).`,
      },
      {
        heading: `ASAP orders at ${R}`,
        body: `An ASAP order is scheduled for the earliest ${o.slotMinutes}-minute slot at which every dish in the order can be ready and is available. If one dish is served later (for example a lunch dish ordered at breakfast time), the whole order is timed for when that dish is available.`,
      },
      {
        heading: `When a ${R} order is confirmed`,
        body: paragraphs(
          "An order is confirmed only when Bayt Al Ghaf has accepted it, and the customer receives an order number such as ORD-482913 (catering orders start with CAT-).",
          `Most orders are confirmed straight away. These are received as “awaiting confirmation” and confirmed by the team by phone: orders above ${aed(o.manualReviewAboveFils)}; orders from phone numbers with ${o.notCollectedReviewThreshold} or more uncollected orders in the last 90 days; and every catering order.`,
        ),
      },
      {
        heading: `${R} order sizes`,
        body: bullets([
          `Up to ${o.maxQuantityPerLine} of any one dish per regular order (some dishes have a lower limit).`,
          `Up to ${o.maxPortionsPerOrder} kitchen portions per regular order (drinks do not count). Larger orders are catering orders, which need notice.`,
          ...facts.filter((f) => f.item.maxPerOrder < o.maxQuantityPerLine && !f.item.bulk.bulkOnly).map((f) => `${f.item.name}: up to ${f.item.maxPerOrder} per order.`),
        ]),
      },
      {
        heading: `${R} dishes with a daily limit`,
        body: `These dishes are made in limited numbers each day and can sell out: ${list(facts.filter((f) => f.item.dailyLimit !== null && !f.item.bulk.bulkOnly).map((f) => `${f.item.name} (${f.item.dailyLimit} per day)`))}.`,
      },
      {
        heading: `${R} dishes that cannot be delivered`,
        body: `These dishes are available for dine-in or pickup but are not delivered: ${list(facts.filter((f) => !f.item.fulfilment.delivery && !f.item.bulk.bulkOnly).map((f) => f.item.name))}. Breakfast is never delivered.`,
      },
    ],
    related: [
      { path: "documents/ordering/pickup.md", title: "Collecting a pickup order" },
      { path: "documents/ordering/timing-and-lead-times.md", title: "Order timing and lead times" },
      { path: "documents/delivery/delivery-overview.md", title: "Delivery" },
      { path: "documents/ordering/changes-and-cancellations.md", title: "Changing or cancelling an order" },
    ],
  });

  docs.push({
    id: "pickup",
    path: "documents/ordering/pickup.md",
    title: `Collecting a pickup order from ${R}`,
    docType: "ordering",
    summary: `Where and how to collect a ${R} takeaway order, how long orders are held, who can collect, and how to pay.`,
    entities: [node.orderType("pickup"), node.facility("takeaway-counter")],
    tags: ["ordering", "pickup", "takeaway"],
    sections: [
      {
        heading: `How to collect a ${R} pickup order`,
        body: bullets([
          "Come to the takeaway counter at Heritage Quarter Gate 3 on Al Seef Street. There is a 10-minute drop-off bay outside the counter.",
          "Give the order number (for example ORD-604215) and the name on the order.",
          "Pay by cash (AED), card, Apple Pay or Google Pay at the counter.",
        ]),
      },
      { heading: `Someone else collecting a ${R} order`, body: "Someone else may collect the order if their name was given with the order, or if they quote the order number and the phone number used to order." },
      {
        heading: `How long ${R} holds a pickup order`,
        body: `Pickup orders are held for ${o.pickupHoldMinutes} minutes after the pickup time. Hot food is kept warm for about ${pf.hotHoldingMinutes} minutes. After ${o.pickupHoldMinutes} minutes an uncollected order is marked “not collected” and is not kept, for food-safety reasons. Customers running late should call ${ct.phone} so the order can be re-timed if the kitchen has not started it.`,
      },
    ],
    related: [{ path: "documents/ordering/ordering-overview.md", title: "How ordering works" }],
  });

  const leadRows = facts.filter((f) => !f.item.bulk.bulkOnly && f.item.kitchenPortions > 0).map((f) => `${f.item.name}: ${f.item.prepTimeMinutes} minutes to prepare; earliest pickup ${f.leadTimeMinutes} minutes after ordering`);
  docs.push({
    id: "timing-and-lead-times",
    path: "documents/ordering/timing-and-lead-times.md",
    title: `${R} order timing and lead times`,
    docType: "ordering",
    summary: `How early ${R} can have an order ready: lead-time rules, 15-minute slots, kitchen capacity, ready times on each day, delivery timing and the preparation time of every dish.`,
    entities: [node.orderType("pickup"), node.orderType("delivery")],
    tags: ["ordering", "timing", "lead-time"],
    sections: [
      {
        heading: `${R} lead-time rule`,
        body: `The earliest an order can be ready is the longest preparation time in the order plus ${o.prepBufferMinutes} minutes for packing, and never less than ${o.minLeadMinutes} minutes after ordering. For example, an order with Hammour Mashwi (20 minutes) needs at least ${Math.max(o.minLeadMinutes, 20 + o.prepBufferMinutes)} minutes; an order of only Shorbat Adas (8 minutes) needs at least ${Math.max(o.minLeadMinutes, 8 + o.prepBufferMinutes)} minutes.`,
      },
      {
        heading: `${R} pickup slots`,
        body: `Pickup and delivery times at ${R} are booked in ${o.slotMinutes}-minute slots (for example 13:00, 13:15, 13:30). The kitchen accepts up to ${o.slotCapacityPortions} kitchen portions and ${o.maxOrdersPerSlot} orders per slot. When a slot is full, the team offers the nearest free times instead; ${R} never accepts a time the kitchen cannot meet.`,
      },
      {
        heading: `When ${R} pickup orders can be ready`,
        body: bullets(WEEKDAYS.map((x) => {
          const h = wk[String(x) as keyof typeof wk]!;
          return `${weekday(x)}: ${timeRange(plus(h.open, o.firstReadyMinutesAfterOpen), minus(h.close, o.lastReadyMinutesBeforeClose))}`;
        })),
      },
      {
        heading: `${R} delivery timing`,
        body: `A delivery time is the time the food arrives. The kitchen starts the order early enough to cover the drive: ${list(regularZones.map((z) => `${z.driveMinutes} minutes to ${z.name}`))}. The earliest delivery is therefore the lead time plus the drive time; for a dish that needs 25 minutes, delivery to Zone B is at the earliest 50 minutes after ordering. Arrival is estimated within a 15-minute window.`,
      },
      { heading: `Busy times at ${R}`, body: "Friday lunch, Friday evenings, Saturday lunch and Ramadan iftar are the busiest times. For those, ordering or booking a day ahead is recommended." },
      { heading: `Preparation time of every ${R} dish`, body: bullets(leadRows) },
    ],
    related: [{ path: "documents/ordering/ordering-overview.md", title: "How ordering works" }],
  });

  docs.push({
    id: "dine-in-pre-order",
    path: "documents/ordering/dine-in-pre-order.md",
    title: `Dine-in pre-orders at ${R}`,
    docType: "ordering",
    summary: `How to pre-order food at ${R} so it is ready when you arrive for your reservation, including the Ramadan Iftar Set Menu.`,
    entities: [node.orderType("dine-in-preorder")],
    tags: ["ordering", "pre-order", "reservations"],
    sections: [
      {
        heading: `What a ${R} dine-in pre-order is`,
        body: "A dine-in pre-order is food ordered before arriving, so it is ready to serve soon after the guests sit down. It needs a confirmed table reservation made with the same phone number as the order. The food is served between the reservation time and one hour after it, and is paid at the table after the meal.",
      },
      { heading: `${R} dishes that need a pre-order or reservation`, body: `The Ramadan Iftar Set Menu and the Friday Family Machboos Platter can be ordered for pickup or as a dine-in pre-order, but not for delivery.` },
      { heading: `Cancelling a reservation with a ${R} pre-order`, body: "Cancelling a reservation also cancels any linked dine-in pre-order that the kitchen has not started." },
    ],
    related: [{ path: "documents/reservations/reservations-overview.md", title: "Reservations" }],
  });

  docs.push({
    id: "changes-and-cancellations",
    path: "documents/ordering/changes-and-cancellations.md",
    title: `Changing or cancelling a ${R} order`,
    docType: "ordering",
    summary: `Until when a ${R} order can be changed or cancelled, what can change, and what happens to large changes and late orders.`,
    entities: [node.policy("order-changes"), node.policy("order-cancellation")],
    tags: ["ordering", "changes", "cancellation"],
    sections: [
      {
        heading: `Changing a ${R} order`,
        body: `Items, time, delivery address and instructions can be changed until ${o.modificationCutoffMinutes} minutes before the pickup or delivery time, or until the kitchen starts preparing the order, whichever is earlier. Every change is checked again for availability, kitchen capacity and price.`,
      },
      { heading: `Cancelling a ${R} order`, body: "Cancelling is free until the kitchen starts preparing the order. After that, the team decides case by case." },
      { heading: `Turning a ${R} order into a large order`, body: `Changing an order into a large one (more than ${o.maxPortionsPerOrder} kitchen portions — for example from 6 to 50 meals) makes it a catering order, which needs catering notice. It cannot keep the original time.` },
      { heading: `When ${R} is running late`, body: `If ${R} is running late, the team tells the customer the new time. Customers may cancel without charge if the order is more than ${pf.lateOrderFreeCancelMinutes} minutes late.` },
      { heading: `Finding or changing your ${R} order`, body: `To check, change or cancel an order, give the order number and the phone number used to order. After ${pf.verificationFailureLimit} wrong attempts, the order is locked for ${pf.verificationLockMinutes} minutes to protect the customer.` },
    ],
    related: [{ path: "documents/ordering/order-statuses.md", title: "Order statuses" }],
  });

  docs.push({
    id: "order-statuses",
    path: "documents/ordering/order-statuses.md",
    title: `${R} order statuses explained`,
    docType: "ordering",
    summary: `What each ${R} order status means, from awaiting confirmation to completed, and the typical order journey.`,
    entities: Object.keys(ORDER_STATUS_TEXT).map((x) => node.status("order", x)),
    tags: ["ordering", "status"],
    sections: [
      ...Object.entries(ORDER_STATUS_TEXT).map(([code, [label, text]]) => ({ heading: `${R} order status: ${label}`, body: `${label} (system status ${code}): ${text}` })),
      { heading: `Typical ${R} order journey`, body: "Awaiting confirmation (only when a review applies) → Confirmed → Being prepared → Ready for collection, Out for delivery or Ready to serve → Completed. An order can also end as Cancelled, Declined, Not collected or Delivery failed." },
    ],
    related: [{ path: "documents/ordering/changes-and-cancellations.md", title: "Changing or cancelling an order" }],
  });

  docs.push({
    id: "order-problems",
    path: "documents/policies/complaints-and-refunds.md",
    title: `${R} complaints, missing items and refunds`,
    docType: "policy",
    summary: `What ${R} does when a dish becomes unavailable, an item is missing or wrong, or an order is late — and how refunds work.`,
    entities: [node.policy("complaints"), node.policy("refunds")],
    tags: ["policy", "complaints", "refunds"],
    sections: [
      { heading: `When a dish becomes unavailable after ordering at ${R}`, body: "If a dish sells out after an order was placed, the team removes it, re-totals the order and calls the customer to offer a substitute of similar value or a cancellation. Nothing is charged for removed items." },
      { heading: `Missing or incorrect items from ${R}`, body: `Report a missing or incorrect item within ${pf.complaintWindowHours} hours by phone (${ct.phone}) or WhatsApp (${ct.whatsapp}) with the order number; a photo helps. ${R} replaces the item or refunds or credits it.` },
      { heading: `Refunds at ${R}`, body: pf.refundMethod },
      { heading: `Late orders from ${R}`, body: `If an order is more than ${pf.lateOrderFreeCancelMinutes} minutes late, the customer may cancel it without charge.` },
      { heading: `Allergy notes on ${R} orders`, body: "If an order's special instructions mention an allergy, the order is flagged and the duty manager calls the customer. The kitchen still cannot guarantee the absence of any allergen." },
    ],
    related: [{ path: "documents/restaurant/contact.md", title: "Contact" }],
  });

  // ---------------------------------------------------------------- delivery
  const notDelivered = facts.filter((f) => !f.item.fulfilment.delivery && !f.item.bulk.bulkOnly).map((f) => f.item.name);
  docs.push({
    id: "delivery-overview",
    path: "documents/delivery/delivery-overview.md",
    title: `${R} delivery`,
    docType: "delivery",
    summary: `${R} delivery hours, zones, fees and minimums, rules for addresses and phone numbers, payment, failed deliveries and dishes that are not delivered.`,
    entities: [node.orderType("delivery"), ...zones.map((z) => node.zone(z.id))],
    tags: ["delivery"],
    sections: [
      {
        heading: `${R} delivery in brief`,
        body: `${R} delivers with its own drivers in Dubai, with arrival between ${timeRange(d.start, d.end)} every day. Regular orders are delivered to ${list(regularZones.map((z) => z.name))}; ${zones.filter((z) => !z.regularOrders).map((z) => z.name).join(", ")} is for catering orders only. ${R} does not deliver outside Dubai — not to Abu Dhabi, Sharjah, Ajman or the other emirates — and is not on third-party delivery apps.`,
      },
      {
        heading: `${R} delivery fees and minimum orders`,
        body: bullets(zones.map((z) => `${z.name}: fee ${aed(z.feeFils)}, minimum order ${aed(z.minimumOrderFils)}${z.freeDeliveryAboveFils ? `, free delivery above ${aed(z.freeDeliveryAboveFils)}` : ", no free-delivery threshold"}, typical drive ${z.driveMinutes} minutes${z.regularOrders ? "" : " — catering orders only"}`)),
      },
      {
        heading: `${R} delivery rules`,
        body: bullets([
          "A UAE mobile number is required so the driver can call.",
          "The address needs the area (which must be in a delivery zone), the building or villa and the street, plus the apartment or floor if there is one. A landmark, Makani number and instructions are welcome.",
          "The delivery time is when the food arrives; arrival is estimated within a 15-minute window.",
          "The earliest delivery is the preparation lead time plus the drive time for the zone. No delivery can be faster than that.",
          `Payment is cash or card on delivery. Drivers carry change up to AED ${pf.driverChangeAed}.`,
          `If the driver cannot reach the customer at the address within ${pf.deliveryWaitMinutes} minutes, the delivery is marked as failed and the team calls.`,
          "Breakfast is not delivered.",
        ]),
      },
      { heading: `${R} dishes that are not delivered`, body: `${list(notDelivered)}. These dishes do not travel well and are available for dine-in or pickup only.` },
      { heading: `Areas ${R} does not deliver to`, body: `${R} delivers only to the areas listed in its delivery zones. Areas not listed — and anywhere outside Dubai — are not served. Customers outside the zones can order for pickup at Al Seef.` },
    ],
    related: [...zones.map((z) => ({ path: docPath.zone(z.id), title: z.name })), { path: "documents/delivery/delivery-areas-a-to-z.md", title: "Delivery areas A to Z" }],
  });

  for (const z of zones) {
    const aliases = Object.entries(AREA_ALIASES).filter(([, v]) => z.areas.includes(v));
    docs.push({
      id: `delivery-${z.id.replace("_", "-")}`,
      path: docPath.zone(z.id),
      title: `${R} delivery: ${z.name}`,
      docType: "delivery-zone",
      summary: `${z.name}: areas covered, delivery fee, minimum order, free-delivery threshold, drive time and what can be delivered.`,
      entities: [node.zone(z.id), ...z.areas.map((a) => node.area(a))],
      tags: ["delivery", "zone", z.id],
      sections: [
        {
          heading: `${z.name} in brief`,
          body: paragraphs(
            `${z.name} is a ${R} delivery zone. ${z.description}`,
            bullets([
              `Areas: ${list(z.areas)}`,
              `Delivery fee: ${price(z.feeFils)}`,
              `Minimum order: ${price(z.minimumOrderFils)}`,
              `Free delivery: ${z.freeDeliveryAboveFils ? `on orders of ${aed(z.freeDeliveryAboveFils)} or more` : "not offered in this zone"}`,
              `Typical drive time: ${z.driveMinutes} minutes`,
              `Regular takeaway delivery: ${z.regularOrders ? "yes" : "no — catering orders only"}`,
              `Delivery hours: ${timeRange(d.start, d.end)} (catering ${timeRange(b.fulfilmentStart, b.fulfilmentEnd)})`,
            ]),
          ),
        },
        {
          heading: `Delivery examples for ${z.name}`,
          body: z.regularOrders
            ? bullets([
                `An order of ${aed(z.minimumOrderFils - 1000)} to ${z.areas[0]} is below the ${aed(z.minimumOrderFils)} minimum and cannot be delivered until more is added.`,
                `An order of ${aed(z.minimumOrderFils)} to ${z.areas[0]} pays the ${aed(z.feeFils)} delivery fee, for a total of ${aed(z.minimumOrderFils + z.feeFils)}.`,
                z.freeDeliveryAboveFils ? `An order of ${aed(z.freeDeliveryAboveFils)} or more to ${z.areas[0]} is delivered free.` : `There is no free delivery to ${z.name}; the ${aed(z.feeFils)} fee always applies.`,
                `A dish that needs 25 minutes to prepare can arrive in ${z.areas[0]} at the earliest ${25 + z.driveMinutes} minutes after ordering.`,
              ])
            : `Regular takeaway orders are not delivered to ${z.name}. Catering orders are delivered there for ${aed(z.feeFils)}, with a minimum catering order of ${aed(z.minimumOrderFils)}.`,
        },
        ...(aliases.length ? [{ heading: `Other names for areas in ${z.name}`, body: bullets(aliases.map(([a, v]) => `“${a}” means ${v}`)) }] : []),
      ],
      related: [{ path: "documents/delivery/delivery-overview.md", title: "Delivery" }],
    });
  }

  docs.push({
    id: "delivery-areas-a-to-z",
    path: "documents/delivery/delivery-areas-a-to-z.md",
    title: `${R} delivery areas A to Z`,
    docType: "delivery-areas",
    summary: `Every Dubai area ${R} delivers to, in alphabetical order, with its zone, fee, minimum order and drive time.`,
    entities: zones.flatMap((z) => z.areas.map((a) => node.area(a))),
    tags: ["delivery", "areas"],
    sections: zones
      .flatMap((z) => z.areas.map((a) => ({ a, z })))
      .sort((x, y) => x.a.localeCompare(y.a))
      .map(({ a, z }) => {
        const al = Object.entries(AREA_ALIASES).filter(([, v]) => v === a).map(([x]) => `“${x}”`);
        return {
          heading: `Delivery to ${a}`,
          body: z.regularOrders
            ? `${R} delivers to ${a}${al.length ? ` (also called ${list(al, "or")})` : ""}. ${a} is in ${z.name}: delivery fee ${aed(z.feeFils)}, minimum order ${aed(z.minimumOrderFils)}${z.freeDeliveryAboveFils ? `, free delivery on orders of ${aed(z.freeDeliveryAboveFils)} or more` : ", no free delivery"}, typical drive ${z.driveMinutes} minutes. Delivery arrives between ${timeRange(d.start, d.end)}.`
            : `${a}${al.length ? ` (also called ${list(al, "or")})` : ""} is in ${z.name}. ${R} does not deliver regular takeaway orders to ${a}; catering orders can be delivered there for ${aed(z.feeFils)} with a minimum catering order of ${aed(z.minimumOrderFils)}.`,
        };
      }),
    related: zones.map((z) => ({ path: docPath.zone(z.id), title: z.name })),
  });

  // ------------------------------------------------------------ reservations
  const tiers = [...r.durations].sort((a, c) => a.maxPartySize - c.maxPartySize);
  const tierRows = tiers.map((t, i) => [i === 0 ? 1 : tiers[i - 1].maxPartySize + 1, t.maxPartySize, t.minutes] as const);
  docs.push({
    id: "reservations-overview",
    path: "documents/reservations/reservations-overview.md",
    title: `Reservations at ${R}`,
    docType: "reservations",
    summary: `How to book a table at ${R}: party sizes, notice, how far ahead, booking hours, what details are needed, seating preferences, large groups and confirmation.`,
    entities: [node.restaurant(), ...SEATING_AREAS.map((a) => node.seatingArea(a))],
    tags: ["reservations"],
    sections: [
      {
        heading: `${R} reservation rules in brief`,
        body: bullets([
          `Tables can be booked for ${r.minPartySize} to ${r.maxPartySize} guests.`,
          `Bookings can be made from ${r.minNoticeMinutes} minutes ahead up to ${r.maxAdvanceDays} days ahead, on ${r.slotMinutes}-minute times (for example 19:00, 19:15, 19:30).`,
          `Groups of up to ${r.autoConfirmMaxPartySize} are confirmed immediately when a table is free.`,
          `Groups of ${r.autoConfirmMaxPartySize + 1} to ${r.maxPartySize} are accepted as a request: a table is held and the team calls back to confirm, usually within ${b.reviewResponseHours} hours.`,
          `Groups of more than ${r.maxPartySize} cannot be booked as a normal reservation; contact the events team at ${ct.eventsEmail}.`,
          "A name and a phone number are needed for every reservation (UAE number, or international with the country code).",
          `Bookings are made by phone on ${ct.phone}, on the ${R} website, or by e-mail to ${ct.reservationsEmail}.`,
          "Every booking gets a reference such as RES-482913.",
        ]),
      },
      {
        heading: `${R} reservation hours`,
        body: paragraphs(
          `The last table reservation starts ${r.lastSeatingMinutesBeforeClose} minutes before closing. Breakfast tables can be booked from opening time.`,
          bullets(WEEKDAYS.map((x) => {
            const h = wk[String(x) as keyof typeof wk]!;
            return `${weekday(x)}: tables from ${time(h.open)}, last reservation ${time(minus(h.close, r.lastSeatingMinutesBeforeClose))}`;
          })),
        ),
      },
      {
        heading: `Choosing where to sit at ${R}`,
        body: bullets([
          "Guests can ask for the main dining hall (indoor), a creek-view window table, the creek terrace (seasonal) or a private majlis room.",
          "A requested seating area is respected: if it is full, the team offers other times or another area. Guests are never moved to a different area without being asked.",
          "With no preference, the team chooses the best-fitting table: the main hall first, then the terrace (in season), then the window tables.",
          "A specific table number cannot be promised.",
          "If the window tables are fully booked, one cannot be “made available”; the team offers another time with window availability or a different area.",
        ]),
      },
      {
        heading: `Wheelchairs, high chairs and children at ${R}`,
        body: bullets([
          "Mention a wheelchair when booking and only step-free, accessible tables are offered (in the main hall, at the window and on the terrace at T4 and T6). The majlis rooms have floor seating.",
          `Up to ${pf.maxHighChairsPerBooking} high chairs can be requested per booking (${pf.highChairsTotal} in the restaurant).`,
          "Children count towards the party size.",
        ]),
      },
      { heading: `Deposits for ${R} reservations`, body: "No deposit or card guarantee is taken for regular tables. The majlis minimum spend is settled at the end of the meal." },
      { heading: `Busiest times at ${R}`, body: "Friday evenings and Saturday lunch are the busiest regular times. Iftar tables during Ramadan are the busiest of the year and should be booked early." },
    ],
    related: [
      { path: "documents/reservations/table-times.md", title: "How long a table is booked" },
      ...SEATING_AREAS.map((a) => ({ path: docPath.seatingArea(a), title: SEATING_AREA_LABELS[a] })),
      { path: "documents/reservations/changes-cancellations-and-late-arrival.md", title: "Changes, cancellations and late arrival" },
    ],
  });

  docs.push({
    id: "table-times",
    path: "documents/reservations/table-times.md",
    title: `How long a table is booked at ${R}`,
    docType: "reservations",
    summary: `${R} table times by party size, majlis bookings and the reset time between bookings.`,
    entities: [node.policy("table-duration")],
    tags: ["reservations", "duration"],
    sections: [
      {
        heading: `${R} table time by party size`,
        body: paragraphs(
          bullets(tierRows.map(([from, to, mins]) => `${from === to ? `${from} guests` : `${from} to ${to} guests`}: ${mins} minutes (${mins / 60} hours)`)),
          `Majlis room bookings are always ${r.majlis.durationMinutes} minutes. There is a ${r.turnoverBufferMinutes}-minute reset between bookings on the same table.`,
        ),
      },
      ...Array.from({ length: r.maxPartySize }, (_, i) => i + 1).map((n) => {
        const mins = tiers.find((t) => n <= t.maxPartySize)!.minutes;
        return { heading: `Table time for ${plural(n, "guest")} at ${R}`, body: `A table for ${plural(n, "guest")} at ${R} is booked for ${mins} minutes (${mins / 60} hours), plus a ${r.turnoverBufferMinutes}-minute reset before the next booking.` };
      }),
    ],
    related: [{ path: "documents/reservations/reservations-overview.md", title: "Reservations" }],
  });

  const AREA_NOTES: Record<SeatingArea, string> = {
    indoor: "The main dining hall is air-conditioned, with booths, family tables with space for high chairs and a long table (L1) for 9 to 14 guests.",
    window: "The window tables are indoors along the glass facing Dubai Creek. They are the most requested tables at Bayt Al Ghaf, so booking early is recommended.",
    terrace: `The creek terrace is outdoors and seasonal: it is open from ${r.terraceSeason.startMonthDay.split("-").reverse().join("/")} to ${r.terraceSeason.endMonthDay.split("-").reverse().join("/")} (day/month), that is from 15 October to 30 April, weather permitting, and closed in summer. Heaters are not available.`,
    majlis: `Two private majlis rooms with traditional floor seating: Majlis Al Sidr (6 to 10 guests; low chairs on request) and Majlis Al Ghaf (10 to 20 guests). A majlis booking needs at least ${r.majlis.minPartySize} guests and ${r.majlis.minNoticeHours} hours' notice, lasts ${r.majlis.durationMinutes} minutes, and has a minimum spend of ${aed(r.majlis.minimumSpendPerPersonFils)} per person, settled at the end of the meal.`,
  };
  for (const area of SEATING_AREAS) {
    const ts = tables.filter((t) => t.area === area);
    const seats = `${Math.min(...ts.map((t) => t.minCovers))} to ${Math.max(...ts.map((t) => t.maxCovers))}`;
    docs.push({
      id: `seating-${area}`,
      path: docPath.seatingArea(area),
      title: `${R} seating: ${SEATING_AREA_LABELS[area]}`,
      docType: "seating-area",
      summary: `The ${SEATING_AREA_LABELS[area].toLowerCase()} at ${R}: tables, party sizes, features and booking rules.`,
      entities: [node.seatingArea(area), ...ts.map((t) => node.table(t.code))],
      tags: ["reservations", "seating", area],
      sections: [
        { heading: `${SEATING_AREA_LABELS[area]} at ${R}`, body: paragraphs(AREA_NOTES[area], `This area has ${plural(ts.length, "table")} for parties of ${seats} guests.`) },
        { heading: `Tables in the ${SEATING_AREA_LABELS[area].toLowerCase()} at ${R}`, body: bullets(ts.map((t) => `${t.code}: ${t.minCovers}–${t.maxCovers} guests${t.features.length ? `; ${t.features.map((f) => FEATURE_WORDS[f] ?? f).join(", ")}` : ""}${t.onlineBookable ? "" : "; walk-in only"}`)) },
      ],
      related: [{ path: "documents/reservations/reservations-overview.md", title: "Reservations" }, { path: "documents/reservations/tables.md", title: "All tables" }],
    });
  }

  docs.push({
    id: "tables",
    path: "documents/reservations/tables.md",
    title: `Every table at ${R}`,
    docType: "tables",
    summary: `All ${tables.length} tables at ${R} with area, number of guests, features and whether they can be booked.`,
    entities: tables.map((t) => node.table(t.code)),
    tags: ["reservations", "tables"],
    sections: [
      { heading: `${R} tables in brief`, body: `${R} has ${tables.length} tables and rooms: ${list(SEATING_AREAS.map((a) => `${tables.filter((t) => t.area === a).length} in the ${SEATING_AREA_LABELS[a].toLowerCase()}`))}. Tables ${list(tables.filter((t) => !t.onlineBookable).map((t) => t.code))} are kept for walk-in guests and are never booked in advance.` },
      ...tables.map((t) => ({
        heading: `Table ${t.code} at ${R}`,
        body: `Table ${t.code} at ${R} is in the ${SEATING_AREA_LABELS[t.area].toLowerCase()} and seats ${t.minCovers} to ${t.maxCovers} guests. ${t.onlineBookable ? "It can be reserved." : "It is kept for walk-in guests and cannot be reserved."}${t.features.length ? ` Features: ${t.features.map((f) => FEATURE_WORDS[f] ?? f).join(", ")}.` : ""}`,
      })),
    ],
    related: SEATING_AREAS.map((a) => ({ path: docPath.seatingArea(a), title: SEATING_AREA_LABELS[a] })),
  });

  docs.push({
    id: "large-groups-and-events",
    path: "documents/reservations/large-groups-and-events.md",
    title: `Large groups and events at ${R}`,
    docType: "reservations",
    summary: `Booking ${R} for groups of 13 to 20, majlis rooms, groups above 20, private events and celebrations.`,
    entities: [node.policy("large-groups"), node.seatingArea("majlis"), node.table("l1")],
    tags: ["reservations", "groups", "events"],
    sections: [
      {
        heading: `Group bookings at ${R}`,
        body: bullets([
          `Up to ${r.autoConfirmMaxPartySize} guests: confirmed instantly if a table is free.`,
          `${r.autoConfirmMaxPartySize + 1} to ${r.maxPartySize} guests: a table is held and the booking is a request until the team calls back, usually within ${b.reviewResponseHours} hours.`,
          `More than ${r.maxPartySize} guests: not bookable as a reservation — contact the events team at ${ct.eventsEmail}.`,
          "Book for the number of guests expected. If numbers are uncertain, book the likely number and update it before the change cut-off; tables for large groups may be reduced if far fewer guests arrive.",
        ]),
      },
      { heading: `Large tables at ${R}`, body: "The long table L1 in the main hall seats 9 to 14 guests. Majlis Al Sidr seats 6 to 10 and Majlis Al Ghaf seats 10 to 20. Groups too large for any regular table are offered a majlis room." },
      { heading: `Private events at ${R}`, body: `Private hire and full buyouts are arranged by the events team (${ct.eventsEmail}). For example, the dining room is closed to the public from 18:00 on Saturday 14 November 2026 for a private event.` },
      { heading: `Celebrations at ${R}`, body: `Guests may bring a celebration cake with prior notice; a plating fee of AED ${pf.celebrationCakeFeeAed} applies. Other outside food and drink are not permitted.` },
    ],
    related: [{ path: docPath.seatingArea("majlis"), title: "Majlis rooms" }, { path: "documents/catering/catering-overview.md", title: "Catering" }],
  });

  docs.push({
    id: "changes-cancellations-and-late-arrival",
    path: "documents/reservations/changes-cancellations-and-late-arrival.md",
    title: `Changing or cancelling a ${R} reservation, late arrival and no-shows`,
    docType: "reservations",
    summary: `Until when a ${R} reservation can be changed, cancellation rules, late cancellations, the late-arrival grace period, no-shows and finding a booking.`,
    entities: [node.policy("reservation-changes"), node.policy("reservation-cancellation"), node.policy("late-arrival")],
    tags: ["reservations", "changes", "cancellation"],
    sections: [
      { heading: `Changing a ${R} reservation`, body: `The date, time, party size, seating area and requests can be changed until ${r.modificationCutoffMinutes / 60} hours before the booking, subject to availability. After that, guests must call the restaurant on ${ct.phone}. If a requested change is not possible, the original booking stays as it was.` },
      { heading: `Cancelling a ${R} reservation`, body: `Cancelling a reservation is free at any time before the booking time. Cancelling less than ${pf.lateCancellationThresholdMinutes / 60} hours before is recorded as a late cancellation. Cancelling also cancels any linked dine-in pre-order the kitchen has not started.` },
      { heading: `Arriving late for a ${R} reservation`, body: `Tables are held for ${r.lateArrivalGraceMinutes} minutes after the booking time. After that the table may be released and the booking marked as a no-show. Guests running late should call ${ct.phone}.` },
      { heading: `Finding a ${R} reservation`, body: `To check, change or cancel a booking, give the reservation reference (for example RES-482913) and the phone number used to book. After ${pf.verificationFailureLimit} wrong attempts, the booking is locked for ${pf.verificationLockMinutes} minutes to protect the guest.` },
      { heading: `Walk-in guests at ${R}`, body: `Walk-ins are welcome whenever a table is free. Tables ${list(tables.filter((t) => !t.onlineBookable).map((t) => t.code))} are kept for walk-in guests. There is no walk-in waiting list by phone.` },
    ],
    related: [{ path: "documents/reservations/reservation-statuses.md", title: "Reservation statuses" }],
  });

  docs.push({
    id: "reservation-statuses",
    path: "documents/reservations/reservation-statuses.md",
    title: `${R} reservation statuses explained`,
    docType: "reservations",
    summary: `What each ${R} reservation status means.`,
    entities: Object.keys(RESERVATION_STATUS_TEXT).map((x) => node.status("reservation", x)),
    tags: ["reservations", "status"],
    sections: Object.entries(RESERVATION_STATUS_TEXT).map(([code, [label, text]]) => ({ heading: `${R} reservation status: ${label}`, body: `${label} (system status ${code}): ${text}` })),
    related: [{ path: "documents/reservations/reservations-overview.md", title: "Reservations" }],
  });

  // ---------------------------------------------------------------- catering
  const tiersN = [...b.noticeTiers].sort((a, c) => a.maxPortions - c.maxPortions);
  const eligible = facts.filter((f) => f.item.bulk.eligible);
  const notEligible = facts.filter((f) => !f.item.bulk.eligible && f.item.kitchenPortions > 0);
  const example = (itemId: string, qty: number, zoneId?: string) => {
    const item = k.catalog.itemsById.get(itemId)!;
    const subtotal = item.priceFils * qty;
    const pct = bulkDiscountPercent(qty, s);
    const discount = percentOf(subtotal, pct);
    const zone = zoneId ? zones.find((z) => z.id === zoneId)! : null;
    const fee = zone ? zone.feeFils : 0;
    const total = subtotal - discount + fee;
    const deposit = depositFor(total, s);
    const notice = Math.max(tiersN.find((t) => qty <= t.maxPortions)?.hours ?? tiersN[tiersN.length - 1].hours, item.bulk.minNoticeHours ?? 0);
    return { item, qty, subtotal, pct, discount, fee, zone, total, deposit, notice };
  };
  const examples = [
    example("mi_office_lunch_box", 40),
    example("mi_lamb_machboos", 60),
    example("mi_chicken_machboos", 120, "zone_d"),
    example("mi_lamb_machboos", 100),
    example("mi_luqaimat", 30),
  ];
  docs.push({
    id: "catering-overview",
    path: "documents/catering/catering-overview.md",
    title: `${R} catering and large orders`,
    docType: "catering",
    summary: `How ${R} catering works: when an order becomes a catering order, the quote and confirmation steps, notice periods, capacity, discounts, deposits, delivery, cancellation and when to contact the events team.`,
    entities: [node.policy("catering"), ...eligible.map((f) => node.dish(f.item.slug))],
    tags: ["catering", "bulk"],
    sections: [
      {
        heading: `When a ${R} order is a catering order`,
        body: `Regular orders are limited to ${o.maxPortionsPerOrder} kitchen portions. Anything larger, and any catering-only dish (${list(facts.filter((f) => f.item.bulk.bulkOnly).map((f) => f.item.name))}), is a catering order.`,
      },
      {
        heading: `How a ${R} catering order works`,
        body: bullets([
          "1. The customer asks for a catering quote with the dishes, quantities, date and time, and pickup or delivery area. The quote checks notice, capacity, delivery and price.",
          `2. A quote is valid for ${b.quoteValidityHours} hours and locks the price.`,
          `3. The customer places the catering order from the quote. It is received as “awaiting confirmation” with a number starting CAT-.`,
          `4. The catering team calls to confirm within ${b.reviewResponseHours} hours and arranges any deposit. The order is only confirmed after that call.`,
        ]),
      },
      {
        heading: `${R} catering notice periods`,
        body: paragraphs(
          bullets(tiersN.map((t, i) => `${i === 0 ? o.maxPortionsPerOrder + 1 : tiersN[i - 1].maxPortions + 1} to ${t.maxPortions} portions: at least ${t.hours} hours' notice`)),
          `Some dishes need more notice than the tier: ${list(eligible.filter((f) => f.item.bulk.minNoticeHours).map((f) => `${f.item.name} (${f.item.bulk.minNoticeHours} hours)`))}. The longest requirement applies.`,
        ),
      },
      {
        heading: `${R} catering capacity`,
        body: bullets([
          `Maximum per catering order: ${b.maxPortionsPerOrder} portions.`,
          `Maximum across all catering orders on one day: ${b.dailyCapacityPortions} portions.`,
          `Collection or delivery between ${timeRange(b.fulfilmentStart, b.fulfilmentEnd)}, up to ${b.maxAdvanceDays} days ahead.`,
          "Some dishes have their own daily maximum (listed on the catering menu).",
        ]),
      },
      {
        heading: `${R} catering discounts`,
        body: bullets([`Up to ${(([...b.discountTiers].sort((a, c) => a.minPortions - c.minPortions)[0]?.minPortions ?? 1) - 1)} portions: no discount.`, ...[...b.discountTiers].sort((a, c) => a.minPortions - c.minPortions).map((t) => `${t.minPortions} portions or more: ${t.percent}% off the food.`), "The discount applies to the food, not to the delivery fee."]),
      },
      {
        heading: `${R} catering deposits`,
        body: `Catering orders of ${aed(b.depositThresholdFils)} or more (including delivery) need a ${b.depositPercent}% deposit. The catering team arranges it by bank transfer after confirming the order. No payment is taken online.`,
      },
      {
        heading: `${R} catering delivery`,
        body: `Catering can be collected at Al Seef or delivered to zones A to D: ${list(zones.map((z) => `${z.name} (${aed(z.feeFils)} fee, minimum ${aed(z.minimumOrderFils)})`))}. The delivery fee always applies to catering. Zone D is for catering orders only.`,
      },
      { heading: `Cancelling a ${R} catering order`, body: `Catering orders can be cancelled free of charge until ${b.freeCancellationHours} hours before collection or delivery. Later cancellations and changes are handled by the catering team.` },
      {
        heading: `When to contact the ${R} events team`,
        body: `Contact the events team at ${ct.eventsEmail} for orders above ${b.maxPortionsPerOrder} portions, events beyond the daily capacity, dates more than ${b.maxAdvanceDays} days away, or services such as staff, equipment, live cooking or an on-site buffet. ${R} catering is food prepared in the restaurant kitchen for collection or delivery.`,
      },
      {
        heading: `${R} catering: worked examples`,
        body: bullets(
          examples.map(
            (e) =>
              `${e.qty} × ${e.item.name} at ${aed(e.item.priceFils)} = ${aed(e.subtotal)}${e.pct ? `, minus ${e.pct}% (${aed(e.discount)}) = ${aed(e.subtotal - e.discount)}` : " (no discount)"}${e.zone ? `, plus ${aed(e.fee)} delivery to ${e.zone.name}` : " for pickup"}: total ${aed(e.total)}. Notice: at least ${e.notice} hours. Deposit: ${e.deposit ? `${aed(e.deposit)} (${b.depositPercent}%)` : "none"}.`,
          ),
        ),
      },
      {
        heading: `Impossible catering requests at ${R}`,
        body: bullets([
          "200 machboos in 20 minutes is impossible: 200 portions need 72 hours' notice, and Lamb Machboos is limited per day. The earliest feasible date can be offered instead.",
          `More than ${b.maxPortionsPerOrder} portions in one order is above the maximum; the events team can advise.`,
          `Dishes that are cooked to order cannot be ordered in catering quantities: ${list(notEligible.map((f) => f.item.name))}.`,
        ]),
      },
    ],
    related: [{ path: "documents/catering/catering-menu.md", title: "Catering menu" }, { path: "documents/delivery/delivery-overview.md", title: "Delivery" }],
  });

  docs.push({
    id: "catering-menu",
    path: "documents/catering/catering-menu.md",
    title: `${R} catering menu`,
    docType: "catering",
    summary: `Every ${R} dish available for catering with unit price, servings, daily maximum, extra notice and minimum quantity.`,
    entities: eligible.map((f) => node.dish(f.item.slug)),
    tags: ["catering", "menu"],
    sections: [
      ...eligible.map((f) => ({
        heading: `${f.item.name} for catering`,
        body: `${f.item.name} is available for ${R} catering at ${aed(f.item.priceFils)} each (serves ${f.item.portion.servesPeople}). ${[
          f.item.bulk.bulkOnly ? "Catering orders only." : "",
          f.item.bulk.minQuantity ? `Minimum ${f.item.bulk.minQuantity}.` : "",
          f.item.bulk.maxQuantityPerDay ? `Up to ${f.item.bulk.maxQuantityPerDay} per day.` : "",
          f.item.bulk.minNoticeHours ? `Needs at least ${f.item.bulk.minNoticeHours} hours' notice.` : "",
          f.item.bulk.note ?? "",
        ].filter(Boolean).join(" ")} Contains ${f.comp.allergens.length ? f.comp.allergens.map((a) => a.replace("_", " ")).join(", ") : "none of the major allergens"}.`,
      })),
      { heading: `${R} dishes not available for catering`, body: `${list(notEligible.map((f) => f.item.name))}. These are cooked to order and can only be ordered in regular quantities.` },
    ],
    related: [{ path: "documents/catering/catering-overview.md", title: "Catering" }],
  });

  return docs;
}

export { dateShort };
