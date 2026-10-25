/**
 * FAQ documents (one per FAQ category, one section per question) and the
 * policy-numbers summary. FAQ answers come from the shared FAQ; the few answers that
 * refer to systems rather than to the restaurant are reworded for guests.
 */
import { policyFacts as pf } from "@/data/policies";
import type { KnowledgeContext } from "../context";
import { buildFaq, type FaqEntry } from "../faq";
import { docPath, node } from "./ids";
import type { RagDocument } from "./model";
import { aed, bullets, slugify, time } from "./text";

const R = "Bayt Al Ghaf";

const REWORD: Record<string, (a: string) => string | null> = {
  "faq-001": (a) => a.replace(/\s*\(Fictional test address\.\)/, ""),
  "faq-011": () => "Yes, normally with regular hours. Exceptions, such as the first day of Eid Al Fitr when we open at 14:00, are listed in the special-days calendar.",
  "faq-012": (a) => a.replace(/Availability depends on the exact time, so we check live availability for the date, time and seating area and then book with your name and phone number\./, "Availability depends on the exact time and seating area, so the team checks the date and time you want and then books it with your name and phone number."),
  "faq-042": (a) => a.replace(/ in the menu catalogue and the API \(`GET \/api\/v1\/menu\/items\/\{id\}`\)/, " on its menu page"),
  "faq-051": (a) => a.replace(/ \(menu catalogue, allergen matrix and the API\)/, " (on each dish and in the allergen list)"),
  "faq-076": () => null,
};

export function guestFaq(k: KnowledgeContext): FaqEntry[] {
  return buildFaq(k).flatMap((f) => {
    const fix = REWORD[f.id];
    if (!fix) return [f];
    const answer = fix(f.answer);
    return answer === null ? [] : [{ ...f, answer }];
  });
}

export function faqDocuments(k: KnowledgeContext): RagDocument[] {
  const faq = guestFaq(k);
  const categories = [...new Set(faq.map((f) => f.category))];
  const docs: RagDocument[] = categories.map((cat) => {
    const entries = faq.filter((f) => f.category === cat);
    const slug = slugify(cat);
    return {
      id: `faq-${slug}`,
      path: docPath.faq(slug),
      title: `${R} FAQ: ${cat}`,
      docType: "faq",
      summary: `Frequently asked questions about ${cat.toLowerCase()} at ${R}, each with a complete answer.`,
      entities: [node.restaurant()],
      tags: ["faq", slug, ...new Set(entries.flatMap((e) => e.tags))].slice(0, 12),
      sections: entries.map((e) => ({ heading: e.question, body: `${e.answer}` })),
      related: [],
    };
  });

  const s = k.rc.settings;
  docs.push({
    id: "policy-numbers",
    path: "documents/policies/policy-numbers-at-a-glance.md",
    title: `${R} rules and numbers at a glance`,
    docType: "policy",
    summary: `Every limit, time and fee in ${R}'s rules in one place: reservations, orders, delivery, catering, house rules and customer service.`,
    entities: [node.restaurant()],
    tags: ["policy", "numbers", "summary"],
    sections: [
      {
        heading: `${R} reservation numbers`,
        body: bullets([
          `Party size: ${s.reservations.minPartySize} to ${s.reservations.maxPartySize} guests`,
          `Confirmed instantly: up to ${s.reservations.autoConfirmMaxPartySize} guests; ${s.reservations.autoConfirmMaxPartySize + 1}–${s.reservations.maxPartySize} guests are a request confirmed by phone`,
          `Notice: at least ${s.reservations.minNoticeMinutes} minutes; up to ${s.reservations.maxAdvanceDays} days ahead`,
          `Last reservation: ${s.reservations.lastSeatingMinutesBeforeClose} minutes before closing`,
          `Table time: ${[...s.reservations.durations].sort((a, b) => a.maxPartySize - b.maxPartySize).map((d, i, arr) => `${i === 0 ? 1 : arr[i - 1].maxPartySize + 1}–${d.maxPartySize} guests ${d.minutes} minutes`).join("; ")}`,
          `Reset between bookings: ${s.reservations.turnoverBufferMinutes} minutes`,
          `Majlis: minimum ${s.reservations.majlis.minPartySize} guests, ${s.reservations.majlis.minNoticeHours} hours' notice, ${s.reservations.majlis.durationMinutes} minutes, minimum spend ${aed(s.reservations.majlis.minimumSpendPerPersonFils)} per person`,
          `Terrace season: 15 October to 30 April`,
          `Changes: until ${s.reservations.modificationCutoffMinutes / 60} hours before; cancelling less than ${pf.lateCancellationThresholdMinutes / 60} hours before is a late cancellation`,
          `Late arrival: table held ${s.reservations.lateArrivalGraceMinutes} minutes`,
          `High chairs: ${pf.highChairsTotal} in total, up to ${pf.maxHighChairsPerBooking} per booking`,
        ]),
      },
      {
        heading: `${R} ordering numbers`,
        body: bullets([
          `Slots: every ${s.ordering.slotMinutes} minutes, up to ${s.ordering.maxAdvanceDays} days ahead`,
          `Lead time: longest preparation time + ${s.ordering.prepBufferMinutes} minutes, minimum ${s.ordering.minLeadMinutes} minutes`,
          `Kitchen capacity: ${s.ordering.slotCapacityPortions} portions and ${s.ordering.maxOrdersPerSlot} orders per slot`,
          `Order size: up to ${s.ordering.maxQuantityPerLine} of one dish and ${s.ordering.maxPortionsPerOrder} kitchen portions per regular order`,
          `Confirmed by phone: orders above ${aed(s.ordering.manualReviewAboveFils)}`,
          `Changes: until ${s.ordering.modificationCutoffMinutes} minutes before or until preparation starts`,
          `Pickup orders held: ${s.ordering.pickupHoldMinutes} minutes (hot food kept warm about ${pf.hotHoldingMinutes} minutes)`,
          `Late order: free cancellation if more than ${pf.lateOrderFreeCancelMinutes} minutes late`,
        ]),
      },
      {
        heading: `${R} delivery numbers`,
        body: bullets([
          `Delivery arrivals: ${time(s.delivery.start)} to ${time(s.delivery.end)}`,
          ...s.delivery.zones.map((z) => `${z.name}: fee ${aed(z.feeFils)}, minimum ${aed(z.minimumOrderFils)}${z.freeDeliveryAboveFils ? `, free from ${aed(z.freeDeliveryAboveFils)}` : ""}, about ${z.driveMinutes} minutes${z.regularOrders ? "" : ", catering only"}`),
          `Driver change: up to AED ${pf.driverChangeAed}`,
          `Driver waits: ${pf.deliveryWaitMinutes} minutes at the address`,
        ]),
      },
      {
        heading: `${R} catering numbers`,
        body: bullets([
          `Catering starts above ${s.ordering.maxPortionsPerOrder} portions; maximum ${s.bulk.maxPortionsPerOrder} per order and ${s.bulk.dailyCapacityPortions} per day`,
          `Notice: ${[...s.bulk.noticeTiers].sort((a, b) => a.maxPortions - b.maxPortions).map((t) => `${t.hours} hours up to ${t.maxPortions} portions`).join("; ")}`,
          `Discounts: ${[...s.bulk.discountTiers].sort((a, b) => a.minPortions - b.minPortions).map((t) => `${t.percent}% from ${t.minPortions} portions`).join("; ")}`,
          `Deposit: ${s.bulk.depositPercent}% for orders of ${aed(s.bulk.depositThresholdFils)} or more`,
          `Quotes valid ${s.bulk.quoteValidityHours} hours; free cancellation until ${s.bulk.freeCancellationHours} hours before; team confirms within ${s.bulk.reviewResponseHours} hours`,
          `Collection or delivery ${time(s.bulk.fulfilmentStart)} to ${time(s.bulk.fulfilmentEnd)}, up to ${s.bulk.maxAdvanceDays} days ahead`,
        ]),
      },
      {
        heading: `${R} customer-service numbers`,
        body: bullets([
          `Report a missing or incorrect item within ${pf.complaintWindowHours} hours`,
          `Celebration-cake plating fee: AED ${pf.celebrationCakeFeeAed}`,
          `Valet parking: AED 40, Thursday to Saturday 18:00 to midnight`,
          `Booking or order look-up locked for ${pf.verificationLockMinutes} minutes after ${pf.verificationFailureLimit} wrong attempts`,
          `VAT: ${s.vatRatePercent}%, included in menu prices`,
        ]),
      },
    ],
    related: [
      { path: "documents/reservations/reservations-overview.md", title: "Reservations" },
      { path: "documents/ordering/ordering-overview.md", title: "Ordering" },
      { path: "documents/catering/catering-overview.md", title: "Catering" },
    ],
  });

  docs.push({
    id: "privacy-and-verification",
    path: "documents/policies/privacy-and-verification.md",
    title: `${R} personal details, privacy and booking look-ups`,
    docType: "policy",
    summary: `What personal details ${R} asks for, why, how bookings and orders are looked up safely, and what is never asked for.`,
    entities: [node.policy("privacy")],
    tags: ["policy", "privacy"],
    sections: [
      { heading: `Personal details ${R} asks for`, body: "Bayt Al Ghaf asks for a name and a phone number for every reservation and order, an address for deliveries, and optionally an e-mail address. The phone number is used to confirm the booking, to call about changes, and to identify the guest when they call back." },
      { heading: `Looking up a ${R} booking or order`, body: `Staff discuss a reservation or order only with someone who gives its reference (for example RES-482913 or ORD-604215) and the phone number used to make it. After ${pf.verificationFailureLimit} wrong attempts the record is locked for ${pf.verificationLockMinutes} minutes. Details of one guest's booking are never shared with another caller.` },
      { heading: `What ${R} never asks for`, body: "Bayt Al Ghaf never asks for card numbers, card security codes or bank passwords by phone, WhatsApp or e-mail. Payment is made in person by cash or card." },
    ],
    related: [{ path: "documents/restaurant/payments-and-prices.md", title: "Payments" }],
  });
  return docs;
}
