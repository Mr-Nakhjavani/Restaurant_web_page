/**
 * Calendar documents: one per weekday, weekly specials, each special period
 * (Ramadan, National Day, Eid, winter season), closures and a special-days overview.
 * Hours on specific dates come from the same calendar logic the website uses.
 */
import { describeDay } from "@/domain/hours";
import { addDays } from "@/domain/time";
import type { IsoWeekday, SpecialPeriodDef } from "@/domain/types";
import type { KnowledgeContext } from "../context";
import { dishFacts, PERIOD_TYPE_WORDS, visibleItems } from "./facts";
import { docPath, node } from "./ids";
import { availabilitySentences } from "./menu-docs";
import type { RagDocument, RagSection } from "./model";
import { minus, plus } from "./restaurant-docs";
import { aed, bullets, date, dateShort, list, paragraphs, plural, time, timeRange, weekday, WEEKDAYS } from "./text";

const R = "Bayt Al Ghaf";

/** "Open 12:00 (noon) to midnight (24:00); kitchen last orders 23:30 (11:30 pm)" for a calendar date. */
export function hoursOn(k: KnowledgeContext, iso: string): string {
  const h = describeDay(iso, k.rc);
  if (!h.isOpen) return `${R} is closed on ${date(iso)}.`;
  const dining = h.windows.dining.map((w) => timeRange(w.start, w.end));
  const orders = h.windows.orders.map((w) => timeRange(w.start, w.end));
  const parts = [
    dining.length ? `the dining room is open ${list(dining)}` : "the dining room is closed",
    orders.length && orders.join() !== dining.join() ? `takeaway and delivery orders run ${list(orders)}` : "",
    h.kitchenLastOrderAt ? `kitchen last orders ${time(h.kitchenLastOrderAt)}` : "",
  ].filter(Boolean);
  return `On ${date(iso)}, ${parts.join("; ")}.${h.notes.length ? ` ${h.notes.join(" ")}` : ""}`;
}

export function calendarDocuments(k: KnowledgeContext): RagDocument[] {
  const s = k.rc.settings;
  const items = visibleItems(k);
  const facts = items.map((i) => dishFacts(k, i));
  const weekly = facts.filter((f) => f.weekdays.length < 7);
  const breakfast = facts.filter((f) => f.isBreakfast && f.weekdays.length === 7);
  const wk = s.weeklyHours;
  const docs: RagDocument[] = [];

  for (const d of WEEKDAYS) {
    const h = wk[String(d) as keyof typeof wk]!;
    const specials = weekly.filter((f) => f.weekdays.includes(d));
    const notToday = weekly.filter((f) => !f.weekdays.includes(d));
    const extras: string[] = [];
    if (d === 5) extras.push(`Live oud music on Friday evenings, ${timeRange("20:00", "22:00")}.`);
    if (d === 4 || d === 5 || d === 6) extras.push(`Valet parking at Heritage Quarter Gate 3 from ${timeRange("18:00", "24:00")} (AED 40, paid to the valet operator).`);
    else extras.push("There is no valet parking on this day; paid public parking is available along Al Seef Street and in the Al Seef multi-storey car park.");
    if (d === 5) extras.push("Friday evenings are among the busiest times; booking ahead is recommended. For Friday lunch, ordering a day ahead is recommended.");
    if (d === 6) extras.push("Saturday lunch is among the busiest times; booking ahead is recommended.");
    const name = weekday(d);
    const sections: RagSection[] = [
      {
        heading: `${R} opening hours on ${name}`,
        body: bullets([
          `Open: ${timeRange(h.open, h.close)}`,
          `Breakfast: ${timeRange(s.breakfast.start, s.breakfast.end)} (not during Ramadan)`,
          `Lunch and dinner dishes: from ${time("12:00")}`,
          `Kitchen last orders: ${time(minus(h.close, s.kitchenLastOrderMinutesBeforeClose))}`,
          `Last table reservation: ${time(minus(h.close, s.reservations.lastSeatingMinutesBeforeClose))}`,
          `Pickup orders ready: ${timeRange(plus(h.open, s.ordering.firstReadyMinutesAfterOpen), minus(h.close, s.ordering.lastReadyMinutesBeforeClose))}`,
          `Delivery arrivals: ${timeRange(s.delivery.start, s.delivery.end)}`,
          `Catering collection or delivery: ${timeRange(s.bulk.fulfilmentStart, s.bulk.fulfilmentEnd)}`,
        ]),
      },
      {
        heading: `${R} specials on ${name}`,
        body: specials.length
          ? bullets(specials.map((f) => `${f.item.name} (${aed(f.item.priceFils)}): ${f.item.availabilityNote}`))
          : `There is no weekly special on ${name}s at ${R}; the full permanent menu is available.`,
      },
      {
        heading: `${R} dishes not served on ${name}`,
        body: notToday.length ? bullets(notToday.map((f) => `${f.item.name} is only served on ${list(f.weekdays.map((x) => `${weekday(x)}s`))}.`)) : "",
      },
      { heading: `Breakfast at ${R} on ${name}`, body: `Breakfast on ${name} is served ${timeRange(s.breakfast.start, s.breakfast.end)}: ${list(breakfast.map((f) => `${f.item.name} (${aed(f.item.priceFils)})`))}${d === 6 || d === 7 ? `, plus the Weekend Fuala Breakfast Spread until ${time("12:00")}` : ""}. Breakfast is not delivered and is not served during Ramadan.` },
      { heading: `${name} at ${R}: good to know`, body: bullets(extras) },
    ];
    docs.push({
      id: `weekday-${name.toLowerCase()}`,
      path: docPath.weekday(d),
      title: `${name} at ${R}`,
      docType: "weekday",
      summary: `Everything that is specific to ${name}s at ${R}: opening hours, breakfast, specials served and not served, parking and music.`,
      entities: [node.weekday(d), ...specials.map((f) => node.dish(f.item.slug))],
      tags: ["calendar", "weekday", name.toLowerCase()],
      sections,
      related: [...specials.map((f) => ({ path: docPath.dish(f.item.slug), title: f.item.name })), { path: "documents/restaurant/opening-hours.md", title: "Opening hours" }],
    });
  }

  docs.push({
    id: "weekly-specials",
    path: "documents/calendar/weekly-specials.md",
    title: `${R} weekly specials`,
    docType: "specials",
    summary: `Which ${R} dishes are cooked only on certain days of the week, how to pre-order them, and why they cannot be served on other days.`,
    entities: weekly.map((f) => node.dish(f.item.slug)),
    tags: ["calendar", "specials"],
    sections: [
      { heading: `${R} weekly specials by day`, body: bullets(WEEKDAYS.map((d) => `${weekday(d)}: ${list(weekly.filter((f) => f.weekdays.includes(d)).map((f) => `${f.item.name} (${aed(f.item.priceFils)})`)) || "no weekly special"}`)) },
      ...weekly.map((f) => ({ heading: `${f.item.name}: weekly special`, body: bullets(availabilitySentences(k, f)) })),
      {
        heading: `Pre-ordering a ${R} weekly special`,
        body: `A weekly special can be ordered on any day for collection on its own day, up to ${s.ordering.maxAdvanceDays} days ahead. It cannot be served on a different day at any price. For example, the Friday Family Machboos Platter ordered on a Tuesday is collected on the coming Friday.`,
      },
    ],
    related: weekly.map((f) => ({ path: docPath.dish(f.item.slug), title: f.item.name })),
  });

  const sorted = [...k.rc.specialPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const p of sorted) docs.push(periodDocument(k, p));

  docs.push({
    id: "closures",
    path: "documents/calendar/closures.md",
    title: `${R} closures and private events`,
    docType: "closures",
    summary: `Dates when ${R} is fully or partly closed, what stays open, and what it means for reservations and orders.`,
    entities: k.rc.closures.map((c) => node.closure(c.id)),
    tags: ["calendar", "closures"],
    sections: [
      ...k.rc.closures.map((c) => ({
        heading: `${R} closure on ${date(c.date)}`,
        body: paragraphs(
          `${c.publicNote}`,
          bullets([
            `Date: ${date(c.date)} (${c.date})`,
            `From: ${c.startTime && c.startTime !== "00:00" ? time(c.startTime) : "the start of the day"}`,
            `Until: ${c.endTime ? time(c.endTime) : "closing time"}`,
            `Affects: ${c.scope === "reservations" ? "the dining room and table reservations only — takeaway and delivery continue as normal" : c.scope === "orders" ? "takeaway and delivery orders only — the dining room stays open" : "the whole restaurant: dining room, reservations, takeaway and delivery"}`,
            `Reason: ${c.reason}`,
          ]),
          hoursOn(k, c.date),
        ),
      })),
    ],
    related: [{ path: "documents/calendar/special-days-overview.md", title: "Special days" }],
  });

  docs.push({
    id: "special-days-overview",
    path: "documents/calendar/special-days-overview.md",
    title: `${R} special days, holidays and seasonal menus`,
    docType: "calendar",
    summary: `All special periods and closures in the ${R} calendar with dates, hours and the dishes they bring, plus how public holidays work.`,
    entities: [...sorted.map((p) => node.period(p)), ...k.rc.closures.map((c) => node.closure(c.id))],
    tags: ["calendar", "holidays"],
    sections: [
      {
        heading: `${R} calendar of special periods`,
        body: bullets(sorted.map((p) => `${p.name}: ${dateShort(p.startDate)} to ${dateShort(p.endDate)}${p.provisional ? " (provisional, subject to moon sighting)" : ""}${p.hoursOverride ? `; open ${timeRange(p.hoursOverride.open, p.hoursOverride.close)}` : "; normal hours"}. ${p.notes}`)),
      },
      { heading: `${R} closures`, body: bullets(k.rc.closures.map((c) => `${date(c.date)}: ${c.publicNote}`)) },
      { heading: `Public holidays at ${R}`, body: "On public holidays Bayt Al Ghaf normally keeps its regular hours. Exceptions are listed in this calendar, such as the first day of Eid Al Fitr, when the restaurant opens at 14:00." },
      {
        heading: `${R} limited-time and seasonal dishes`,
        body: bullets(facts.filter((f) => f.item.kind === "limited_time").map((f) => `${f.item.name} (${aed(f.item.priceFils)}): ${f.item.availabilityNote}`)),
      },
      { heading: `${R} terrace season`, body: `The outdoor creek terrace is seasonal: open from 15 October to 30 April, weather permitting, and closed in summer (1 May to 14 October).` },
    ],
    related: sorted.map((p) => ({ path: docPath.period(p.slug), title: p.name })),
  });
  return docs;
}

function periodDocument(k: KnowledgeContext, p: SpecialPeriodDef): RagDocument {
  const facts = visibleItems(k).map((i) => dishFacts(k, i));
  const only = facts.filter((f) => f.onlyDuring.includes(p.type));
  const notDuring = facts.filter((f) => f.notDuring.includes(p.type));
  const ranged = facts.filter((f) => f.dateRange && f.dateRange.start <= p.endDate && f.dateRange.end >= p.startDate);
  const days: string[] = [];
  for (let d = p.startDate; d <= p.endDate && days.length < 40; d = addDays(d, 1)) days.push(d);
  const sample = p.type === "ramadan" || p.type === "seasonal" ? [days[0], days[Math.floor(days.length / 2)], days[days.length - 1]] : days;
  const sections: RagSection[] = [
    {
      heading: `${p.name} at ${R}: dates`,
      body: paragraphs(
        `${p.name} runs from ${date(p.startDate)} to ${date(p.endDate)} (${plural(days.length, "day")}).${p.provisional ? " These dates are provisional: they depend on the moon sighting, and the team confirms them when they are announced." : ""}`,
        p.notes,
      ),
    },
    {
      heading: `${R} opening hours during ${p.name}`,
      body: paragraphs(
        p.hoursOverride
          ? `During ${p.name}, ${R} is open ${timeRange(p.hoursOverride.open, p.hoursOverride.close)} every day.`
          : `${R} keeps its normal opening hours during ${p.name}, except where a closure is listed.`,
        bullets(sample.map((d) => hoursOn(k, d))),
      ),
    },
  ];
  if (only.length) {
    sections.push(
      ...only.map((f) => ({
        heading: `${f.item.name}: only during ${PERIOD_TYPE_WORDS[p.type]}`,
        body: paragraphs(
          `${f.item.name} (${f.item.arabicName}) costs ${aed(f.item.priceFils)} and serves ${f.item.portion.servesPeople}. ${f.item.description}`,
          bullets(availabilitySentences(k, f)),
          f.item.customizations.length ? `Choices: ${f.item.customizations.map((g) => `${g.name} — ${list(g.options.map((o) => o.name), "or")}`).join("; ")}.` : "",
        ),
      })),
    );
  }
  if (ranged.length) sections.push({ heading: `Seasonal dishes at ${R} during ${p.name}`, body: bullets(ranged.map((f) => `${f.item.name} (${aed(f.item.priceFils)}): served ${dateShort(f.dateRange!.start)} to ${dateShort(f.dateRange!.end)}. ${f.item.shortDescription}`)) });
  if (notDuring.length) sections.push({ heading: `${R} dishes not served during ${p.name}`, body: `${list(notDuring.map((f) => f.item.name))} are not served during ${PERIOD_TYPE_WORDS[p.type]}.` });
  if (p.type === "ramadan") {
    sections.push({
      heading: `Iftar and reservations at ${R} during Ramadan`,
      body: bullets([
        "Iftar seating starts at 17:30. Dates and laban are served at the sunset call to prayer to break the fast.",
        "Iftar tables are the busiest of the year; booking early is recommended.",
        "The Iftar Set Menu is ordered as a dine-in pre-order linked to the reservation, or for pickup. It is not delivered.",
        "The individual dishes of the iftar set (lentil shorba, sambousa, machboos, harees and luqaimat) are on the regular menu all year.",
        "The Iftar Set Menu is not available outside Ramadan.",
        "Eating and drinking in public during fasting hours is permitted in Dubai; the dining room is open from 12:00.",
      ]),
    });
  }
  return {
    id: `period-${p.slug}`,
    path: docPath.period(p.slug),
    title: `${p.name} at ${R}`,
    docType: "special-period",
    summary: `${p.name} at ${R}: dates${p.provisional ? " (provisional)" : ""}, opening hours, and the dishes that are added or removed.`,
    entities: [node.period(p), node.periodType(p.type), ...only.map((f) => node.dish(f.item.slug))],
    tags: ["calendar", "special-period", p.type],
    sections,
    related: [...only.map((f) => ({ path: docPath.dish(f.item.slug), title: f.item.name })), { path: "documents/calendar/special-days-overview.md", title: "Special days" }],
  };
}

export type { IsoWeekday };
