import { minutesToTime, timeToMinutes } from "@/domain/time";
import { SEATING_AREAS, SEATING_AREA_LABELS, WEEKDAY_NAMES, type IsoWeekday } from "@/domain/types";
import { aed, header, table, type KnowledgeContext } from "../context";

export function weeklyHoursTable(k: KnowledgeContext): string {
  const s = k.rc.settings;
  const rows = ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).map((d) => {
    const h = s.weeklyHours[String(d) as "1"];
    if (!h) return [WEEKDAY_NAMES[d], "Closed", "—", "—"];
    const last = minutesToTime(timeToMinutes(h.close) - s.kitchenLastOrderMinutesBeforeClose);
    const lastSeat = minutesToTime(timeToMinutes(h.close) - s.reservations.lastSeatingMinutesBeforeClose);
    return [WEEKDAY_NAMES[d], `${h.open}–${h.close === "24:00" ? "00:00 (midnight)" : h.close}`, last, lastSeat];
  });
  return table(["Day", "Open", "Kitchen last orders", "Last reservation start"], rows);
}

export function restaurantProfileDoc(k: KnowledgeContext): string {
  const p = k.rc.profile;
  const s = k.rc.settings;
  const areaRows = SEATING_AREAS.map((area) => {
    const tables = k.rc.tables.filter((t) => t.area === area);
    const seats = tables.reduce((n, t) => n + t.maxCovers, 0);
    const sizes = [...new Set(tables.map((t) => `${t.minCovers}–${t.maxCovers}`))].join(", ");
    return [SEATING_AREA_LABELS[area], tables.length, seats, sizes];
  });
  return [
    header(k, "restaurant-profile", "Restaurant Profile — Bayt Al Ghaf", "Business identity, location, contact details, cuisine, facilities, opening hours and general house rules."),
    "## Identity",
    "",
    table(
      ["Field", "Value"],
      [
        ["Name", `${p.name} (${p.arabicName})`],
        ["Meaning", p.meaning],
        ["Tagline", p.tagline],
        ["Cuisine", p.cuisine.join(", ")],
        ["Established", String(p.established)],
        ["Concept", "Contemporary Emirati restaurant and majlis; alcohol-free; all meat halal"],
        ["Languages", "Service in English and Arabic (some team members also speak Hindi/Urdu and Tagalog)"],
        ["Currency", `${s.currency}; menu prices include ${s.vatRatePercent}% VAT`],
        ["Timezone", `${s.timezone} (UTC+04:00, no daylight saving)`],
      ],
    ),
    "",
    p.description,
    "",
    "## Location",
    "",
    table(
      ["Field", "Value"],
      [
        ["Full address", p.address.formatted],
        ["Unit", p.address.unit],
        ["Building", p.address.building],
        ["Street", p.address.street],
        ["Area", `${p.address.area} (${p.address.community})`],
        ["City / Emirate", `${p.address.city}, ${p.address.emirate}, ${p.address.country}`],
        ["Coordinates", `${p.coordinates.latitude}, ${p.coordinates.longitude} — ${p.coordinates.note}`],
        ["Entrance", "Heritage Quarter Gate 3 on Al Seef Street (takeaway counter and drop-off bay at the same entrance)"],
      ],
    ),
    "",
    "Nearby landmarks:",
    "",
    table(["Landmark", "Distance", "On foot"], p.landmarks.map((l) => [l.name, l.distance, l.walk])),
    "",
    "Full directions: see `directions-and-transportation.md`.",
    "",
    "## Contact",
    "",
    table(
      ["Channel", "Details", "Use for"],
      [
        ["Phone", p.contact.phone, p.contact.phoneNote],
        ["WhatsApp", p.contact.whatsapp, p.contact.whatsappNote],
        ["E-mail", p.contact.email, "General enquiries"],
        ["Reservations e-mail", p.contact.reservationsEmail, "Written booking requests"],
        ["Events & catering", p.contact.eventsEmail, "Catering, private majlis events, groups above 20, buy-outs"],
        ["Website", p.contact.website, "Menu, reservations, online ordering"],
        ["Instagram", p.contact.instagram, "Photos and announcements"],
      ],
    ),
    "",
    "All contact details are simulated (555 numbers and the reserved `.example` domain).",
    "",
    "## Opening hours (regular week)",
    "",
    weeklyHoursTable(k),
    "",
    `- Emirati breakfast menu: daily ${s.breakfast.start}–${s.breakfast.end} (not served during Ramadan). The Weekend Fuala breakfast spread is served on Saturdays and Sundays until 12:00.`,
    `- Takeaway collection: from ${minutesToTime(timeToMinutes(s.weeklyHours["1"]!.open) + s.ordering.firstReadyMinutesAfterOpen)} until ${s.ordering.lastReadyMinutesBeforeClose} minutes before closing.`,
    `- Delivery: daily ${s.delivery.start}–${s.delivery.end} (arrival times).`,
    "- Public holidays: normal hours unless a closure or special period is listed in `special-days-and-seasonal-menu.md`.",
    "- Ramadan, Eid and private-event hours are listed in `special-days-and-seasonal-menu.md` and returned by `GET /api/v1/restaurant/hours?date=YYYY-MM-DD`.",
    "",
    "## Seating and capacity",
    "",
    table(["Area", "Tables", "Seats", "Party sizes per table"], areaRows),
    "",
    `Total seats: ${p.capacity.totalSeats}. Some main-hall tables are never offered online and are kept for walk-in guests.`,
    "",
    "## Facilities",
    "",
    ...p.facilities.map((f) => `- ${f}`),
    "",
    "## House rules",
    "",
    ...Object.entries(p.houseRules).map(([key, v]) => `- **${key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}:** ${v}`),
    "",
    "## Payment",
    "",
    "Accepted at the restaurant, on collection and on delivery:",
    "",
    ...p.paymentMethodsAccepted.map((m) => `- ${m}`),
    "",
    "Not accepted:",
    "",
    ...p.paymentMethodsNotAccepted.map((m) => `- ${m}`),
    "",
    `Prices are in UAE dirhams (AED) and include ${s.vatRatePercent}% VAT. There is no service charge; tipping is optional. Majlis rooms carry a minimum spend of ${aed(s.reservations.majlis.minimumSpendPerPersonFils)} per person.`,
    "",
    "## Our story",
    "",
    "Bayt Al Ghaf began with a family majlis: Chef Hessa grew up in a house in Al Bastakiya where the ghaf tree in the courtyard was where neighbours gathered for gahwa and dates. The restaurant recreates that welcome on the creek, a few minutes' walk from where she grew up — serving the slow-cooked dishes of Emirati homes, the seafood of the old pearling coast, and contemporary plates that use local camel, dates and loomi.",
    "",
    "Hospitality follows the majlis tradition: guests are welcomed with gahwa poured from the dallah, served from right to left, and offered dates before the meal.",
    "",
  ].join("\n");
}

export function directionsDoc(k: KnowledgeContext): string {
  const p = k.rc.profile;
  const t = p.transportation;
  const list = (items: string[]) => items.map((x) => `- ${x}`).join("\n");
  return [
    header(k, "directions-and-transportation", "Directions & Transportation", "How to reach the restaurant by car, taxi, metro, bus, abra and on foot, with parking and landmark information."),
    "## Where exactly are we?",
    "",
    `${p.address.formatted}.`,
    "",
    t.summary,
    "",
    `Approximate coordinates: ${p.coordinates.latitude}, ${p.coordinates.longitude} (${p.coordinates.note})`,
    "",
    "## Easiest way from nearby landmarks",
    "",
    table(["From", "Distance", "How"], p.landmarks.map((l) => [l.name, l.distance, l.walk])),
    "",
    "Best single instruction for a caller: *“We're on the Al Seef creek promenade in Bur Dubai, five minutes' walk from the Al Fahidi Historical Neighbourhood. The entrance is Heritage Quarter Gate 3 on Al Seef Street.”*",
    "",
    "## By car",
    "",
    list(t.byCar),
    "",
    "## Parking",
    "",
    list(t.parking),
    "",
    "Parking is not owned or validated by the restaurant; we cannot reserve spaces. Tariffs and hours are set by the parking operator.",
    "",
    "## By taxi or ride-hailing",
    "",
    list(t.byTaxi),
    "",
    "## By metro",
    "",
    list(t.byMetro),
    "",
    "## By bus",
    "",
    list(t.byBus),
    "",
    "## By abra (water taxi)",
    "",
    list(t.byAbra),
    "",
    "## On foot",
    "",
    list(t.onFoot),
    "",
    "## Accessibility",
    "",
    list(t.accessibility),
    "",
    "## Things we cannot help with",
    "",
    "- We do not arrange taxis, chauffeurs or parking reservations.",
    "- Travel times are estimates; Dubai traffic varies, especially on Thursday and Friday evenings.",
    "- Public transport timetables change — callers should check the RTA journey planner for live times.",
    "",
  ].join("\n");
}
