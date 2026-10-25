/**
 * Restaurant documents: identity and story, location, getting there, parking, contact,
 * opening hours, facilities, accessibility, families, house rules, payments,
 * hospitality customs, neighbourhood and a glossary of Emirati food terms.
 */
import { vatIncluded } from "@/domain/money";
import { PAYMENT_METHOD_LABELS } from "@/domain/policies";
import { minutesToTime, timeToMinutes } from "@/domain/time";
import { policyFacts as pf } from "@/data/policies";
import type { KnowledgeContext } from "../context";
import { dishFacts, visibleItems } from "./facts";
import { docPath, node } from "./ids";
import type { RagDocument } from "./model";
import { aed, bullets, list, paragraphs, plural, price, slugify, time, timeRange, weekday, WEEKDAYS } from "./text";

const R = "Bayt Al Ghaf";

export const GLOSSARY_TERMS: [string, string, string][] = [
  ["gahwa", "قهوة", "Emirati coffee: lightly roasted Arabic coffee with cardamom and saffron, poured from the dallah into small finjan cups and served with dates. On the menu as Gahwa Emirati (Dallah for the Table)."],
  ["dallah", "دلة", "The traditional brass coffee pot used to pour gahwa."],
  ["finjan", "فنجان", "The small handle-less cup gahwa is served in."],
  ["majlis", "مجلس", "A traditional sitting room for receiving guests, with floor seating."],
  ["bezar", "بزار", "The Emirati spice blend (cumin, coriander, fennel, pepper, turmeric, cinnamon, cardamom, chilli, clove, nutmeg) that seasons machboos and saloona."],
  ["loomi", "لومي", "Dried black lime (sometimes called dried lemon), used whole or ground for a sour, smoky flavour. A citrus fruit, not an allergen."],
  ["regag", "رقاق", "Paper-thin crisp Emirati bread cooked on a hot iron plate."],
  ["iftar", "إفطار", "The meal that breaks the fast at sunset during Ramadan."],
  ["Khalas dates", "تمر خلاص", "A prized Emirati date variety, served with gahwa."],
  ["abra", "عبرة", "The traditional wooden water taxi that crosses Dubai Creek."],
  ["ghaf", "غاف", "Prosopis cineraria, the UAE's national tree and the tree the restaurant is named after."],
];

export function minus(t: string, minutes: number): string {
  return minutesToTime(timeToMinutes(t) - minutes);
}
export function plus(t: string, minutes: number): string {
  return minutesToTime(timeToMinutes(t) + minutes);
}

export function restaurantDocuments(k: KnowledgeContext): RagDocument[] {
  const p = k.rc.profile;
  const s = k.rc.settings;
  const tables = k.rc.tables;
  const items = visibleItems(k);
  const signature = items.filter((i) => i.signature);
  const ct = p.contact;
  const tr = p.transportation;
  const docs: RagDocument[] = [];

  docs.push({
    id: "about-bayt-al-ghaf",
    path: "documents/restaurant/about-bayt-al-ghaf.md",
    title: `About ${R} (${p.arabicName})`,
    docType: "restaurant-profile",
    summary: `Who ${R} is: an Emirati restaurant and majlis on Dubai Creek — its name, story, chef, cuisine, dining rooms, signature dishes and values.`,
    entities: [node.restaurant(), node.person("chef-hessa"), ...signature.map((i) => node.dish(i.slug))],
    tags: ["restaurant", "about", "story"],
    sections: [
      {
        heading: `${R} in one paragraph`,
        body: paragraphs(p.description, `${R} (Arabic: ${p.arabicName}) describes itself as “${p.tagline}”. It opened in ${p.established}. Cuisine: ${list(p.cuisine)}.`),
      },
      { heading: `What the name ${R} means`, body: `${R} means ${p.meaning} The restaurant's sign is a brass ghaf tree on a coral-stone building.` },
      {
        heading: `The story of ${R}`,
        body: paragraphs(
          `${R} began with a family majlis in Al Bastakiya and a ghaf tree in the courtyard, where neighbours gathered for gahwa, dates and long conversations.`,
          `Chef Hessa grew up a few streets from the creek, in a house where machboos was cooked every Friday and harees simmered all night before Eid. ${R} brings that kitchen to Al Seef: the same unhurried methods, the same respect for rice, lamb, dates and loomi, served in a coral-stone dining room that looks out over the abras.`,
        ),
      },
      {
        heading: `Chef Hessa, head chef of ${R}`,
        body: `Chef Hessa is the head chef of ${R}. She grew up in Al Bastakiya, a few streets from Dubai Creek and a few minutes' walk from the restaurant. Her family cooked machboos every Friday and harees overnight before Eid, and the ${R} menu is built on those home recipes, alongside a few contemporary dishes that use local camel, dates and loomi.`,
      },
      {
        heading: `How the ${R} kitchen cooks`,
        body: bullets([
          "The bezar spice blend is toasted and ground in-house every week.",
          "Regag bread is stretched on the hot iron plate in front of guests, and chebab is baked to order.",
          "Seafood comes from licensed Gulf suppliers; hammour is bought only outside the seasonal fishing ban.",
          "Harees is cooked overnight in one batch, so it is limited each day.",
          "All meat and poultry are halal, and the restaurant is alcohol-free.",
          "Contemporary dishes include camel kofta with the walnut-and-pepper Al Ghaf House Red sauce, a camel burger glazed with Sauce No. 7, and ice cream churned from UAE camel milk and dates.",
        ]),
      },
      {
        heading: `${R} dining rooms and seats`,
        body: `${R} has ${p.capacity.totalSeats} seats: ${p.capacity.indoorSeats} indoors (the main dining hall and the creek-view window tables), ${p.capacity.terraceSeats} on the seasonal creek terrace and ${p.capacity.majlisSeats} in two private majlis rooms with traditional floor seating (Majlis Al Sidr and Majlis Al Ghaf). The dining room has coral-stone walls, palm-frond ceilings and views over the abras and dhows on the creek.`,
      },
      { heading: `${R} signature dishes`, body: bullets(signature.map((i) => `${i.name} (${i.arabicName}), ${aed(i.priceFils)}: ${i.shortDescription}`)) },
      {
        heading: `${R} values: welcome, generosity and respect`,
        body: bullets([
          "Welcome (الترحيب): every table is welcomed with gahwa from the dallah and Khalas dates. Coffee is poured from right to left; a gentle shake of the finjan says you have had enough.",
          "Generosity (الكرم): Emirati meals are shared. Platters and machboos are portioned generously, and family-style serving is always offered.",
          "Respect (الاحترام): a family restaurant — alcohol-free, smoke-free and modest. Children are welcome, and the majlis rooms give families privacy.",
        ]),
      },
    ],
    related: [
      { path: "documents/restaurant/location-and-address.md", title: "Location and address" },
      { path: "documents/restaurant/opening-hours.md", title: "Opening hours" },
      { path: "documents/menu/menu-overview.md", title: "Menu overview" },
    ],
  });

  docs.push({
    id: "location-and-address",
    path: "documents/restaurant/location-and-address.md",
    title: `${R} location and address`,
    docType: "location",
    summary: `Where ${R} is: full address, entrance, GPS coordinates, how to describe the location, and distances to nearby landmarks.`,
    entities: [node.restaurant(), ...p.landmarks.map((l) => node.landmark(l.name))],
    tags: ["location", "address", "directions"],
    sections: [
      {
        heading: `${R} address`,
        body: paragraphs(
          `The full address of ${R} is: ${p.address.formatted}.`,
          bullets([
            `Unit: ${p.address.unit}`,
            `Building: ${p.address.building}`,
            `Street: ${p.address.street}`,
            `Area: ${p.address.area} (community: ${p.address.community})`,
            `City and emirate: ${p.address.city}, ${p.address.emirate}`,
            `Country: ${p.address.country}`,
            `GPS coordinates: ${p.coordinates.latitude}, ${p.coordinates.longitude} (the Al Seef creek-side promenade)`,
          ]),
        ),
      },
      { heading: `${R} entrance`, body: `The ${R} entrance faces Al Seef Street at Heritage Quarter Gate 3. A drop-off bay is directly outside the takeaway collection counter at the Al Seef Street entrance. From the promenade side, ${R} is the coral-stone building with the brass ghaf-tree sign.` },
      { heading: `How to describe where ${R} is`, body: `${tr.summary} A good short description is: “${R}, Al Seef, Heritage Quarter Gate 3, Bur Dubai — near the Al Fahidi Historical Neighbourhood.”` },
      ...p.landmarks.map((l) => ({
        heading: `Distance from ${R} to ${l.name}`,
        body: `${l.name} is ${l.distance} from ${R}, ${l.walk}.`,
      })),
    ],
    related: [
      { path: "documents/restaurant/getting-there.md", title: "Getting there" },
      { path: "documents/restaurant/parking.md", title: "Parking" },
    ],
  });

  docs.push({
    id: "getting-there",
    path: "documents/restaurant/getting-there.md",
    title: `Getting to ${R}: car, taxi, metro, bus, abra and on foot`,
    docType: "directions",
    summary: `Step-by-step directions to ${R} by car, taxi or ride-hailing, Dubai Metro, bus, abra and on foot, with travel times from the airport and Downtown.`,
    entities: [node.restaurant(), ...["car", "taxi", "metro", "bus", "abra", "walking"].map((t) => node.transport(t))],
    tags: ["directions", "transport"],
    sections: [
      { heading: `Directions to ${R} by car`, body: bullets(tr.byCar) },
      { heading: `Getting to ${R} by taxi or ride-hailing`, body: bullets(tr.byTaxi) },
      { heading: `Getting to ${R} by Dubai Metro`, body: bullets(tr.byMetro) },
      { heading: `Getting to ${R} by bus`, body: bullets(tr.byBus) },
      { heading: `Getting to ${R} by abra or water taxi`, body: bullets(tr.byAbra) },
      { heading: `Walking to ${R}`, body: bullets(tr.onFoot) },
      {
        heading: `Travel times to ${R}`,
        body: bullets([
          "From Dubai International Airport (DXB): about 15–25 minutes by taxi, depending on traffic.",
          "From Downtown Dubai: about 15–20 minutes by taxi.",
          "From Al Fahidi Metro Station (Green Line): about 10 minutes on foot.",
          "From BurJuman Metro Station (Red and Green lines): 20–25 minutes on foot or about 5 minutes by taxi.",
          "From the Bur Dubai Abra Station: about 12 minutes on foot along the creek.",
          "From the Al Fahidi Historical Neighbourhood: about 5 minutes on foot.",
        ]),
      },
      { heading: `Step-free route to ${R}`, body: bullets(tr.accessibility) },
    ],
    related: [{ path: "documents/restaurant/location-and-address.md", title: "Location and address" }, { path: "documents/restaurant/parking.md", title: "Parking" }],
  });

  docs.push({
    id: "parking",
    path: "documents/restaurant/parking.md",
    title: `Parking at ${R}`,
    docType: "directions",
    summary: `Where to park near ${R}: public parking, the multi-storey car park, valet days, times and price, accessible bays and the takeaway drop-off bay.`,
    entities: [node.restaurant(), node.facility("parking"), node.facility("valet-parking")],
    tags: ["parking", "valet", "directions"],
    sections: [
      { heading: `Parking near ${R}`, body: bullets(tr.parking) },
      {
        heading: `Valet parking at ${R}`,
        body: `Valet parking for ${R} guests is run by the Heritage Quarter at Gate 3, from ${timeRange("18:00", "24:00")} on Thursdays, Fridays and Saturdays only. It costs AED 40, paid to the valet operator (not to the restaurant). There is no valet on Sunday, Monday, Tuesday or Wednesday.`,
      },
      { heading: `Can ${R} reserve parking?`, body: `No. ${R} cannot reserve parking spaces. Public parking along Al Seef Street and in the Al Seef multi-storey car park is first come, first served and paid at standard Dubai public-parking tariffs.` },
    ],
    related: [{ path: "documents/restaurant/getting-there.md", title: "Getting there" }],
  });

  docs.push({
    id: "contact",
    path: "documents/restaurant/contact.md",
    title: `Contacting ${R}`,
    docType: "contact",
    summary: `${R} phone number, WhatsApp, e-mail addresses for general enquiries, reservations and events, website and Instagram — and which to use for what.`,
    entities: [node.restaurant(), ...["phone", "whatsapp", "email", "reservations-email", "events-email", "website", "instagram"].map((c) => node.contact(c))],
    tags: ["contact", "phone", "email"],
    sections: [
      { heading: `${R} phone number`, body: `The ${R} phone number is ${ct.phone} (international format ${ct.phoneE164}). ${ct.phoneNote}` },
      { heading: `${R} WhatsApp`, body: `The ${R} WhatsApp number is ${ct.whatsapp} (${ct.whatsappE164}). ${ct.whatsappNote}` },
      {
        heading: `${R} e-mail addresses`,
        body: bullets([
          `General enquiries: ${ct.email}`,
          `Reservations: ${ct.reservationsEmail}`,
          `Events, private hire and catering beyond ${s.bulk.maxPortionsPerOrder} portions: ${ct.eventsEmail}`,
        ]),
      },
      { heading: `${R} website and social media`, body: `Website: ${ct.website}. Instagram: ${ct.instagram}. Orders and reservations can be made on the website or by phone.` },
      {
        heading: `Which ${R} contact to use`,
        body: bullets([
          `To book, change or cancel a table: call ${ct.phone}, use the website, or e-mail ${ct.reservationsEmail}.`,
          `To order takeaway or delivery: call ${ct.phone} or order on the website.`,
          `For a problem with an order (missing or incorrect item): call ${ct.phone} or send a WhatsApp message with a photo to ${ct.whatsapp} within ${pf.complaintWindowHours} hours.`,
          `For events, private hire or groups above ${s.reservations.maxPartySize} guests: e-mail ${ct.eventsEmail}.`,
        ]),
      },
    ],
    related: [{ path: "documents/restaurant/opening-hours.md", title: "Opening hours" }],
  });

  const wk = s.weeklyHours;
  const dayLine = (d: (typeof WEEKDAYS)[number]) => {
    const h = wk[String(d) as keyof typeof wk]!;
    return { d, open: h.open, close: h.close };
  };
  const days = WEEKDAYS.map(dayLine);
  docs.push({
    id: "opening-hours",
    path: "documents/restaurant/opening-hours.md",
    title: `${R} opening hours`,
    docType: "hours",
    summary: `${R} opening hours for every day of the week, breakfast hours, kitchen last orders, last reservation times, pickup and delivery hours, catering hours and holiday changes.`,
    entities: [node.restaurant(), ...WEEKDAYS.map((d) => node.weekday(d)), node.mealPeriod("breakfast")],
    tags: ["hours", "opening-times"],
    sections: [
      {
        heading: `${R} weekly opening hours`,
        body: paragraphs(
          `${R} is open every day of the week. Monday, Tuesday, Wednesday, Thursday and Sunday: ${timeRange(wk["1"]!.open, wk["1"]!.close)}. Friday and Saturday: ${timeRange(wk["5"]!.open, wk["5"]!.close)}.`,
          bullets(days.map((x) => `${weekday(x.d)}: ${timeRange(x.open, x.close)}`)),
        ),
      },
      ...days.map((x) => ({
        heading: `${R} hours on ${weekday(x.d)}`,
        body: bullets([
          `Open: ${timeRange(x.open, x.close)}`,
          `Breakfast: ${timeRange(s.breakfast.start, s.breakfast.end)}`,
          `Lunch and dinner dishes: from ${time("12:00")}`,
          `Kitchen last orders: ${time(minus(x.close, s.kitchenLastOrderMinutesBeforeClose))}`,
          `Last table reservation: ${time(minus(x.close, s.reservations.lastSeatingMinutesBeforeClose))}`,
          `Pickup orders can be ready: ${timeRange(plus(x.open, s.ordering.firstReadyMinutesAfterOpen), minus(x.close, s.ordering.lastReadyMinutesBeforeClose))}`,
          `Delivery arrival times: ${timeRange(s.delivery.start, s.delivery.end)}`,
        ]),
      })),
      {
        heading: `${R} breakfast hours`,
        body: `${R} serves Emirati breakfast every day from ${timeRange(s.breakfast.start, s.breakfast.end)}, except during Ramadan. The Weekend Fuala Breakfast Spread is served on Saturdays and Sundays from ${timeRange("08:00", "12:00")}. Breakfast is not delivered.`,
      },
      {
        heading: `${R} kitchen last orders`,
        body: `The ${R} kitchen takes its last orders ${s.kitchenLastOrderMinutesBeforeClose} minutes before closing: ${time(minus(wk["1"]!.close, s.kitchenLastOrderMinutesBeforeClose))} on Monday to Thursday and Sunday, and ${time(minus(wk["5"]!.close, s.kitchenLastOrderMinutesBeforeClose))} on Friday and Saturday.`,
      },
      {
        heading: `${R} last reservation times`,
        body: `The last table reservation at ${R} starts ${s.reservations.lastSeatingMinutesBeforeClose} minutes before closing: ${time(minus(wk["1"]!.close, s.reservations.lastSeatingMinutesBeforeClose))} on Monday to Thursday and Sunday, and ${time(minus(wk["5"]!.close, s.reservations.lastSeatingMinutesBeforeClose))} on Friday and Saturday. Breakfast tables can be booked from opening time.`,
      },
      {
        heading: `${R} pickup, delivery and catering hours`,
        body: bullets([
          `Pickup orders can be ready from ${s.ordering.firstReadyMinutesAfterOpen} minutes after opening (${time(plus(wk["1"]!.open, s.ordering.firstReadyMinutesAfterOpen))}) until ${s.ordering.lastReadyMinutesBeforeClose} minutes before closing (${time(minus(wk["1"]!.close, s.ordering.lastReadyMinutesBeforeClose))} Monday–Thursday and Sunday, ${time(minus(wk["5"]!.close, s.ordering.lastReadyMinutesBeforeClose))} Friday and Saturday).`,
          `Delivery arrives between ${timeRange(s.delivery.start, s.delivery.end)} every day.`,
          `Catering orders can be collected or delivered between ${timeRange(s.bulk.fulfilmentStart, s.bulk.fulfilmentEnd)}.`,
        ]),
      },
      {
        heading: `${R} hours on holidays and special days`,
        body: bullets([
          ...k.rc.specialPeriods.map((sp) => `${sp.name} (${sp.startDate} to ${sp.endDate}${sp.provisional ? ", provisional — subject to moon sighting" : ""}): ${sp.hoursOverride ? `open ${timeRange(sp.hoursOverride.open, sp.hoursOverride.close)} every day. ` : ""}${sp.notes}`),
          ...k.rc.closures.map((c) => `${c.date}: ${c.publicNote}`),
          "On other public holidays the restaurant keeps its normal hours unless a closure is announced.",
        ]),
      },
      {
        heading: `Can ${R} stay open late for a group?`,
        body: `No. ${R} cannot extend its opening hours for individual guests or groups. For a late private event, the events team (${ct.eventsEmail}) can discuss a private booking in advance, but nothing beyond the published hours can be promised by phone.`,
      },
    ],
    related: [
      ...WEEKDAYS.map((d) => ({ path: docPath.weekday(d), title: `${weekday(d)} at ${R}` })),
      { path: "documents/calendar/special-days-overview.md", title: "Special days and holidays" },
    ],
  });

  const wheelchair = tables.filter((t) => t.features.includes("wheelchair_accessible") && t.onlineBookable);
  const highChairTables = tables.filter((t) => t.features.includes("high_chair_space"));
  docs.push({
    id: "facilities",
    path: "documents/restaurant/facilities.md",
    title: `${R} facilities`,
    docType: "facilities",
    summary: `Facilities at ${R}: dining areas, majlis rooms, Wi-Fi, prayer room, takeaway counter, live music, accessibility and baby facilities.`,
    entities: [node.restaurant(), ...["wifi", "prayer-room", "takeaway-counter", "live-oud-music", "high-chairs", "accessible-restroom"].map((f) => node.facility(f))],
    tags: ["facilities"],
    sections: [
      { heading: `Facilities at ${R}`, body: bullets(p.facilities) },
      { heading: `Wi-Fi at ${R}`, body: `${R} has free Wi-Fi for guests. The network is called “BaytAlGhaf-Guest”; the password is printed on the menu.` },
      { heading: `Prayer room near ${R}`, body: `A prayer room for men and women is on the first floor of the Heritage Quarter building, shared with the other businesses in the building.` },
      { heading: `Live music at ${R}`, body: `${R} has live oud music on Friday evenings from ${timeRange("20:00", "22:00")}. There is no live music on other days.` },
      { heading: `Takeaway collection counter at ${R}`, body: `Takeaway orders are collected at the counter by the Al Seef Street entrance (Heritage Quarter Gate 3), with a 10-minute drop-off bay outside.` },
    ],
    related: [{ path: "documents/restaurant/accessibility.md", title: "Accessibility" }, { path: "documents/restaurant/families-and-children.md", title: "Families and children" }],
  });

  docs.push({
    id: "accessibility",
    path: "documents/restaurant/accessibility.md",
    title: `Accessibility at ${R}`,
    docType: "accessibility",
    summary: `Wheelchair access at ${R}: step-free route, accessible restroom, wheelchair-accessible tables by area, majlis seating and accessible parking.`,
    entities: [node.restaurant(), node.facility("accessible-restroom"), ...wheelchair.map((t) => node.table(t.code))],
    tags: ["accessibility", "wheelchair"],
    sections: [
      { heading: `Step-free access to ${R}`, body: bullets(tr.accessibility) },
      {
        heading: `Wheelchair-accessible tables at ${R}`,
        body: `${plural(wheelchair.length, "bookable table")} at ${R} are wheelchair accessible: ${list(wheelchair.map((t) => `${t.code} (${t.area}, ${t.minCovers}–${t.maxCovers} guests)`))}. Mention a wheelchair when booking and only these tables are offered. Walk-in table M1 and M5 are also accessible.`,
      },
      { heading: `${R} majlis rooms and wheelchairs`, body: "The majlis rooms use traditional floor seating and are not suitable for wheelchairs. Majlis Al Sidr can be set with low chairs on request." },
      { heading: `Accessible parking at ${R}`, body: "Two accessible parking bays are beside Heritage Quarter Gate 3, next to the entrance." },
      { heading: `Assistance dogs at ${R}`, body: "Pets are not permitted inside or on the terrace, but assistance dogs are welcome." },
    ],
    related: [{ path: docPath.seatingArea("majlis"), title: "Majlis rooms" }],
  });

  const notSpicy = items.filter((i) => i.spiceLevel === 0 && i.kind !== "catering");
  docs.push({
    id: "families-and-children",
    path: "documents/restaurant/families-and-children.md",
    title: `Families and children at ${R}`,
    docType: "families",
    summary: `Visiting ${R} with children: high chairs, baby-changing, children's portions, tables with space for high chairs, non-spicy dishes and family platters.`,
    entities: [node.restaurant(), node.facility("high-chairs"), node.policy("children")],
    tags: ["families", "children"],
    sections: [
      { heading: `Children at ${R}`, body: p.houseRules.children },
      {
        heading: `High chairs at ${R}`,
        body: `${R} has ${pf.highChairsTotal} high chairs in total, and up to ${pf.maxHighChairsPerBooking} can be requested with one reservation. Children count towards the party size when booking. Tables with space for high chairs: ${list(highChairTables.map((t) => t.code))}.`,
      },
      { heading: `Baby-changing at ${R}`, body: "A baby-changing table is in the accessible restroom on the ground floor." },
      { heading: `Non-spicy dishes at ${R}`, body: `Dishes that are not spicy at all (spice level 0): ${list(notSpicy.map((i) => i.name))}.` },
      {
        heading: `Family platters at ${R}`,
        body: bullets(
          items.filter((i) => i.groupMeal && i.kind !== "catering").map((i) => `${i.name}: ${aed(i.priceFils)}, serves ${i.portion.servesPeople}. ${i.availabilityNote}`),
        ),
      },
      { heading: `Majlis rooms for families`, body: `Families who want privacy can book a majlis room: Majlis Al Sidr (6–10 guests) or Majlis Al Ghaf (10–20 guests), with at least ${s.reservations.majlis.minNoticeHours} hours' notice and a minimum spend of ${aed(s.reservations.majlis.minimumSpendPerPersonFils)} per person.` },
    ],
    related: [{ path: docPath.seatingArea("majlis"), title: "Majlis rooms" }],
  });

  const rules = p.houseRules;
  docs.push({
    id: "house-rules",
    path: "documents/policies/house-rules.md",
    title: `${R} house rules`,
    docType: "policy",
    summary: `${R} house rules on alcohol, halal food, smoking and shisha, dress code, children, pets, outside food and celebration cakes, and photography.`,
    entities: [node.restaurant(), ...["alcohol", "halal", "smoking", "dress-code", "children", "pets", "outside-food", "photography"].map((x) => node.policy(x))],
    tags: ["policy", "house-rules"],
    sections: [
      { heading: `Alcohol at ${R}`, body: `${rules.alcohol} Drinks at ${R} include gahwa, karak chai, sulaimani, chilled laban, limon na'na (fresh lemon-mint) and date shakes.` },
      { heading: `Halal food at ${R}`, body: rules.halal },
      { heading: `Smoking, vaping and shisha at ${R}`, body: `${rules.smoking} ${R} does not offer shisha.` },
      { heading: `Dress code at ${R}`, body: rules.dressCode },
      { heading: `Children at ${R}`, body: rules.children },
      { heading: `Pets at ${R}`, body: rules.pets },
      { heading: `Outside food and celebration cakes at ${R}`, body: `${rules.outsideFood} The celebration-cake plating fee is AED ${pf.celebrationCakeFeeAed}. Mention the cake when booking.` },
      { heading: `Photography at ${R}`, body: rules.photography },
    ],
    related: [{ path: "documents/restaurant/about-bayt-al-ghaf.md", title: `About ${R}` }],
  });

  const pm = s.ordering.paymentMethods;
  docs.push({
    id: "payments",
    path: "documents/restaurant/payments-and-prices.md",
    title: `Payments and prices at ${R}`,
    docType: "payments",
    summary: `How to pay at ${R}: accepted and refused payment methods, payment for pickup, delivery and pre-orders, VAT, catering deposits and refunds.`,
    entities: [node.restaurant(), ...Object.keys(PAYMENT_METHOD_LABELS).map((m) => node.paymentMethod(m))],
    tags: ["payment", "prices", "vat"],
    sections: [
      { heading: `Payment methods accepted at ${R}`, body: bullets(p.paymentMethodsAccepted) },
      {
        heading: `Payment methods not accepted at ${R}`,
        body: bullets(["Online card payment: orders are paid on collection, on delivery or at the table", "Foreign currency cash", "Cheques", "Cryptocurrency"]),
      },
      {
        heading: `Paying for orders at ${R}`,
        body: bullets([
          `Pickup orders: ${list(pm.pickup.map((m) => PAYMENT_METHOD_LABELS[m]), "or")}.`,
          `Delivery orders: ${list(pm.delivery.map((m) => PAYMENT_METHOD_LABELS[m]), "or")}. Drivers carry change up to AED ${pf.driverChangeAed}.`,
          `Dine-in pre-orders: ${PAYMENT_METHOD_LABELS[pm.dine_in_preorder[0]]}.`,
          `Catering deposits: ${PAYMENT_METHOD_LABELS.bank_transfer_deposit}.`,
        ]),
      },
      { heading: `Card details and ${R}`, body: `${R} never takes card numbers over the phone, by WhatsApp or by e-mail. Cards are only used in person on the restaurant's or the driver's card machine.` },
      { heading: `VAT and prices at ${R}`, body: `All ${R} menu prices are in UAE dirhams (AED) and include ${s.vatRatePercent}% VAT. Delivery fees are shown separately. For example, a dish priced ${price(7200)} includes ${aed(vatIncluded(7200, s.vatRatePercent))} VAT.` },
      { heading: `Refunds at ${R}`, body: pf.refundMethod },
    ],
    related: [{ path: "documents/policies/complaints-and-refunds.md", title: "Complaints and refunds" }],
  });

  docs.push({
    id: "hospitality-and-traditions",
    path: "documents/restaurant/hospitality-and-traditions.md",
    title: `Emirati hospitality at ${R}`,
    docType: "culture",
    summary: `The Emirati customs guests meet at ${R}: gahwa and dates on arrival, how coffee is poured and refused, family-style sharing, the majlis, and iftar in Ramadan.`,
    entities: [node.restaurant(), node.term("gahwa"), node.term("majlis"), node.term("dallah"), node.term("finjan")],
    tags: ["culture", "hospitality"],
    sections: [
      { heading: `Gahwa and dates on arrival at ${R}`, body: "Every table at Bayt Al Ghaf is welcomed with gahwa (Emirati coffee) poured from the dallah (a brass coffee pot) into small cups called finjan, served with Khalas dates." },
      { heading: `How gahwa is poured and refused`, body: "Gahwa is poured from right to left around the table, a little at a time. To say you have had enough, gently shake the finjan from side to side when handing it back." },
      { heading: `Sharing food the Emirati way`, body: "Emirati meals are shared. Bayt Al Ghaf portions its platters and machboos generously, and family-style serving is always offered." },
      { heading: `The majlis`, body: "A majlis is the traditional Emirati sitting room where guests are received, with cushions and floor seating. Bayt Al Ghaf has two private majlis rooms, Majlis Al Sidr and Majlis Al Ghaf." },
      { heading: `Iftar at ${R} during Ramadan`, body: "During Ramadan, iftar seating at Bayt Al Ghaf starts at 17:30. Dates and laban are served at the sunset call to prayer (maghrib) to break the fast, followed by the Iftar Set Menu or dishes from the menu." },
    ],
    related: [{ path: "documents/restaurant/glossary.md", title: "Glossary of Emirati food terms" }],
  });

  const terms = GLOSSARY_TERMS;
  const dishTerms = items.map((i) => [i.name, i.arabicName, `${i.shortDescription} On the ${R} menu at ${aed(i.priceFils)}.`] as [string, string, string]);
  docs.push({
    id: "glossary",
    path: "documents/restaurant/glossary.md",
    title: `Glossary of Emirati food and hospitality terms at ${R}`,
    docType: "glossary",
    summary: `Meanings of Emirati food, drink and hospitality words used at ${R}, with Arabic spellings, from gahwa and majlis to every dish name on the menu.`,
    entities: terms.map((t) => node.term(slugify(t[0]))),
    tags: ["glossary", "culture", "arabic"],
    sections: [...terms, ...dishTerms].map(([t, ar, d]) => ({ heading: `${t} (${ar})`, body: `${t} (Arabic: ${ar}): ${d}` })),
    related: [{ path: "documents/restaurant/hospitality-and-traditions.md", title: "Emirati hospitality" }],
  });

  return docs;
}

export { dishFacts };
