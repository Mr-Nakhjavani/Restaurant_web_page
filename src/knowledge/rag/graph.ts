/**
 * Knowledge graph of the restaurant: typed nodes and edges built from the same data
 * as the documents. Every node points at the document that describes it, and every
 * edge carries a one-sentence description for GraphRAG systems that index edge text.
 */
import { composeSauce, sauceIngredientIds } from "@/domain/catalog";
import { PAYMENT_METHOD_LABELS } from "@/domain/policies";
import { ALLERGENS, DIETARY_TAGS, SEATING_AREA_LABELS, SEATING_AREAS, type IsoWeekday } from "@/domain/types";
import type { KnowledgeContext } from "../context";
import { categoryOf, dishFacts, PERIOD_TYPE_WORDS, ROLE_WORDS, visibleItems } from "./facts";
import { docPath, node } from "./ids";
import { ORDER_STATUS_TEXT, RESERVATION_STATUS_TEXT } from "./service-docs";
import { GLOSSARY_TERMS } from "./restaurant-docs";
import { ALLERGEN_NAMES, ALLERGEN_TITLES, aed, slugify, weekday, WEEKDAYS } from "./text";

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  description: string;
  document: string | null;
  properties: Record<string, string | number | boolean | string[] | null>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  description: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(k: KnowledgeContext): KnowledgeGraph {
  const c = k.catalog;
  const s = k.rc.settings;
  const p = k.rc.profile;
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const add = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n.id;
  };
  const link = (source: string, type: string, target: string, description: string, properties: GraphEdge["properties"] = {}) =>
    edges.push({ source, target, type, description, properties });

  const RID = add({
    id: node.restaurant(),
    type: "Restaurant",
    name: p.name,
    description: p.description,
    document: "documents/restaurant/about-bayt-al-ghaf.md",
    properties: { arabic_name: p.arabicName, address: p.address.formatted, phone: p.contact.phone, whatsapp: p.contact.whatsapp, email: p.contact.email, website: p.contact.website, established: p.established, seats: p.capacity.totalSeats, latitude: p.coordinates.latitude, longitude: p.coordinates.longitude },
  });
  const chef = add({ id: node.person("chef-hessa"), type: "Person", name: "Chef Hessa", description: "Head chef of Bayt Al Ghaf, who grew up in Al Bastakiya near Dubai Creek.", document: "documents/restaurant/about-bayt-al-ghaf.md", properties: { role: "head chef" } });
  link(chef, "HEAD_CHEF_OF", RID, "Chef Hessa is the head chef of Bayt Al Ghaf.");

  // Contact, facilities, landmarks, payment
  const contacts: [string, string, string][] = [
    ["phone", "Phone", p.contact.phone],
    ["whatsapp", "WhatsApp (text only)", p.contact.whatsapp],
    ["email", "General e-mail", p.contact.email],
    ["reservations-email", "Reservations e-mail", p.contact.reservationsEmail],
    ["events-email", "Events e-mail", p.contact.eventsEmail],
    ["website", "Website", p.contact.website],
    ["instagram", "Instagram", p.contact.instagram],
  ];
  for (const [slug, name, value] of contacts) {
    const id = add({ id: node.contact(slug), type: "ContactChannel", name, description: `${name} of Bayt Al Ghaf: ${value}.`, document: "documents/restaurant/contact.md", properties: { value } });
    link(RID, "CONTACT_VIA", id, `Bayt Al Ghaf can be contacted by ${name.toLowerCase()} at ${value}.`, { value });
  }
  const facilities: [string, string, string, string][] = [
    ["wifi", "Free Wi-Fi", "Free guest Wi-Fi (network “BaytAlGhaf-Guest”, password printed on the menu).", "documents/restaurant/facilities.md"],
    ["prayer-room", "Prayer room", "Prayer room for men and women on the first floor of the Heritage Quarter building (shared facility).", "documents/restaurant/facilities.md"],
    ["takeaway-counter", "Takeaway collection counter", "Takeaway collection counter at the Al Seef Street entrance (Heritage Quarter Gate 3), with a 10-minute drop-off bay.", "documents/ordering/pickup.md"],
    ["live-oud-music", "Live oud music", "Live oud music on Friday evenings, 20:00–22:00.", "documents/restaurant/facilities.md"],
    ["high-chairs", "High chairs", "Six high chairs; up to four per booking.", "documents/restaurant/families-and-children.md"],
    ["accessible-restroom", "Accessible restroom", "Step-free accessible restroom on the ground floor, with a baby-changing table.", "documents/restaurant/accessibility.md"],
    ["parking", "Public parking", "Paid public parking along Al Seef Street and in the Al Seef multi-storey car park, about 3 minutes' walk.", "documents/restaurant/parking.md"],
    ["valet-parking", "Valet parking", "Valet at Gate 3, 18:00–24:00 on Thursdays, Fridays and Saturdays, AED 40 paid to the operator.", "documents/restaurant/parking.md"],
    ["terrace", "Creek terrace", "Outdoor creek terrace, open 15 October to 30 April, weather permitting.", "documents/reservations/seating-terrace.md"],
    ["majlis-rooms", "Private majlis rooms", "Two private majlis rooms with floor seating: Majlis Al Sidr (6–10) and Majlis Al Ghaf (10–20).", "documents/reservations/seating-majlis.md"],
  ];
  for (const [slug, name, description, document] of facilities) {
    const id = add({ id: node.facility(slug), type: "Facility", name, description, document, properties: {} });
    link(RID, "HAS_FACILITY", id, `Bayt Al Ghaf has ${name.toLowerCase()}: ${description}`);
  }
  const transport: [string, string, string[]][] = [
    ["car", "Car", p.transportation.byCar],
    ["taxi", "Taxi or ride-hailing", p.transportation.byTaxi],
    ["metro", "Dubai Metro", p.transportation.byMetro],
    ["bus", "Bus", p.transportation.byBus],
    ["abra", "Abra or water taxi", p.transportation.byAbra],
    ["walking", "On foot", p.transportation.onFoot],
  ];
  for (const [slug, name, steps] of transport) {
    const id = add({ id: node.transport(slug), type: "TransportMode", name, description: steps.join(" "), document: "documents/restaurant/getting-there.md", properties: {} });
    link(RID, "REACHABLE_BY", id, `Bayt Al Ghaf can be reached by ${name.toLowerCase()}: ${steps[0]}`);
  }
  for (const [term, arabic, meaning] of GLOSSARY_TERMS) {
    add({ id: node.term(slugify(term)), type: "Term", name: term, description: meaning, document: "documents/restaurant/glossary.md", properties: { arabic } });
  }
  for (const l of p.landmarks) {
    const id = add({ id: node.landmark(l.name), type: "Landmark", name: l.name, description: `${l.name}, ${l.distance} from Bayt Al Ghaf (${l.walk}).`, document: "documents/restaurant/location-and-address.md", properties: { distance: l.distance, walk: l.walk } });
    link(RID, "NEAR", id, `Bayt Al Ghaf is ${l.distance} from ${l.name}, ${l.walk}.`, { distance: l.distance, walk: l.walk });
  }
  for (const [code, label] of Object.entries(PAYMENT_METHOD_LABELS)) {
    const id = add({ id: node.paymentMethod(code), type: "PaymentMethod", name: label, description: label, document: "documents/restaurant/payments-and-prices.md", properties: { code } });
    link(RID, "ACCEPTS_PAYMENT", id, `Bayt Al Ghaf accepts: ${label}.`);
  }
  const hr = p.houseRules;
  const policies: [string, string, string, string][] = [
    ["alcohol", "Alcohol", hr.alcohol, "documents/policies/house-rules.md"],
    ["halal", "Halal", hr.halal, "documents/policies/house-rules.md"],
    ["smoking", "Smoking, vaping and shisha", hr.smoking, "documents/policies/house-rules.md"],
    ["dress-code", "Dress code", hr.dressCode, "documents/policies/house-rules.md"],
    ["children", "Children", hr.children, "documents/restaurant/families-and-children.md"],
    ["pets", "Pets", hr.pets, "documents/policies/house-rules.md"],
    ["outside-food", "Outside food and celebration cakes", hr.outsideFood, "documents/policies/house-rules.md"],
    ["photography", "Photography", hr.photography, "documents/policies/house-rules.md"],
    ["allergens", "Allergen policy", "One shared kitchen; no dish is guaranteed free from any allergen; severe allergies should speak to the duty manager.", "documents/allergens-and-diets/allergen-policy.md"],
    ["order-changes", "Changing an order", `Orders can be changed until ${s.ordering.modificationCutoffMinutes} minutes before the pickup or delivery time, or until preparation starts.`, "documents/ordering/changes-and-cancellations.md"],
    ["order-cancellation", "Cancelling an order", "Cancellation is free until the kitchen starts preparing the order.", "documents/ordering/changes-and-cancellations.md"],
    ["complaints", "Complaints", "Missing or incorrect items are reported within 24 hours by phone or WhatsApp with the order number.", "documents/policies/complaints-and-refunds.md"],
    ["refunds", "Refunds", "Card payments are refunded to the original card through the restaurant's terminal; cash as cash or a credit note.", "documents/policies/complaints-and-refunds.md"],
    ["catering", "Catering", `Orders above ${s.ordering.maxPortionsPerOrder} portions are catering orders with notice periods, discounts and deposits.`, "documents/catering/catering-overview.md"],
    ["table-duration", "Table time", "Tables are booked for 90 to 180 minutes depending on party size.", "documents/reservations/table-times.md"],
    ["large-groups", "Large groups", `Groups of ${s.reservations.autoConfirmMaxPartySize + 1}–${s.reservations.maxPartySize} are confirmed by phone; larger groups go to the events team.`, "documents/reservations/large-groups-and-events.md"],
    ["reservation-changes", "Changing a reservation", `Reservations can be changed until ${s.reservations.modificationCutoffMinutes / 60} hours before.`, "documents/reservations/changes-cancellations-and-late-arrival.md"],
    ["reservation-cancellation", "Cancelling a reservation", "Cancellation is free; less than 2 hours before counts as a late cancellation.", "documents/reservations/changes-cancellations-and-late-arrival.md"],
    ["late-arrival", "Late arrival", `Tables are held ${s.reservations.lateArrivalGraceMinutes} minutes after the booking time.`, "documents/reservations/changes-cancellations-and-late-arrival.md"],
    ["privacy", "Personal details and look-ups", "Bookings and orders are discussed only with the reference and the phone number used.", "documents/policies/privacy-and-verification.md"],
  ];
  for (const [slug, name, description, document] of policies) {
    const id = add({ id: node.policy(slug), type: "Policy", name, description, document, properties: {} });
    link(RID, "HAS_POLICY", id, `Bayt Al Ghaf policy — ${name}: ${description}`);
  }

  // Opening hours, meal periods
  for (const d of WEEKDAYS) {
    const h = s.weeklyHours[String(d) as keyof typeof s.weeklyHours]!;
    const id = add({ id: node.weekday(d), type: "Weekday", name: weekday(d), description: `${weekday(d)}: Bayt Al Ghaf is open ${h.open}–${h.close}.`, document: docPath.weekday(d), properties: { opens: h.open, closes: h.close } });
    link(RID, "OPEN_ON", id, `Bayt Al Ghaf is open on ${weekday(d)} from ${h.open} to ${h.close}.`, { opens: h.open, closes: h.close });
  }
  const breakfast = add({ id: node.mealPeriod("breakfast"), type: "MealPeriod", name: "Breakfast", description: `Emirati breakfast, served ${s.breakfast.start}–${s.breakfast.end} daily except during Ramadan.`, document: "documents/restaurant/opening-hours.md", properties: { start: s.breakfast.start, end: s.breakfast.end } });

  // Allergens, diets, spice, order types
  for (const a of ALLERGENS) add({ id: node.allergen(a), type: "Allergen", name: ALLERGEN_TITLES[a], description: `${ALLERGEN_TITLES[a]}, one of the 14 major allergens.`, document: docPath.allergen(a), properties: { code: a } });
  const dietDoc: Record<string, string> = { vegan: "vegan", vegetarian: "vegetarian", pescatarian: "pescatarian", gluten_free_ingredients: "gluten-free-ingredients", dairy_free: "dairy-free", egg_free: "egg-free", nut_free_ingredients: "nut-free-ingredients", sesame_free_ingredients: "sesame-free-ingredients", shellfish_free: "shellfish-free", halal: "halal" };
  for (const t of DIETARY_TAGS) add({ id: node.diet(t), type: "Diet", name: t.replace(/_/g, " "), description: `Dietary classification: ${t.replace(/_/g, " ")}.`, document: docPath.diet(dietDoc[t]), properties: { code: t } });
  for (const l of [0, 1, 2, 3]) add({ id: node.spiceLevel(l), type: "SpiceLevel", name: ["Not spicy", "Mild", "Medium-hot", "Hot"][l], description: `Spice level ${l} of 3.`, document: "documents/menu/spice-guide.md", properties: { level: l } });
  const orderTypes: [string, string, string][] = [
    ["dine-in", "Dine-in", "Eating at the restaurant."],
    ["pickup", "Pickup (takeaway)", "Collected at the takeaway counter at Heritage Quarter Gate 3."],
    ["delivery", "Delivery", `Delivered by Bayt Al Ghaf drivers, ${s.delivery.start}–${s.delivery.end}.`],
    ["dine-in-preorder", "Dine-in pre-order", "Ordered ahead with a confirmed reservation."],
    ["catering", "Catering", `Orders above ${s.ordering.maxPortionsPerOrder} portions or catering-only dishes.`],
  ];
  for (const [slug, name, d] of orderTypes) add({ id: node.orderType(slug), type: "OrderType", name, description: d, document: slug === "catering" ? "documents/catering/catering-overview.md" : "documents/ordering/ordering-overview.md", properties: {} });

  // Categories
  for (const cat of c.categories) {
    const id = add({ id: node.category(cat.slug), type: "MenuCategory", name: cat.name, description: cat.description, document: docPath.category(cat.slug), properties: { arabic_name: cat.arabicName } });
    link(RID, "HAS_MENU_SECTION", id, `Bayt Al Ghaf's menu has a ${cat.name} section.`);
  }

  // Ingredients
  for (const ing of c.ingredientsById.values()) {
    const id = add({ id: node.ingredient(ing.id), type: "Ingredient", name: ing.name, description: ing.description, document: docPath.ingredient(ing.id), properties: { arabic_name: ing.arabicName ?? null, diet: ing.diet, aliases: ing.aliases ?? [] } });
    for (const a of ing.allergens) link(id, "HAS_ALLERGEN", node.allergen(a), `${ing.name} contains ${ALLERGEN_NAMES[a]}.`);
    for (const a of ing.mayContain ?? []) link(id, "MAY_CONTAIN_ALLERGEN", node.allergen(a), `${ing.name} may contain traces of ${ALLERGEN_NAMES[a]} (supplier statement).`);
  }

  // Preparations
  for (const sauce of c.saucesById.values()) {
    const comp = composeSauce(c, sauce.id);
    const id = add({
      id: node.preparation(sauce.slug),
      type: "Preparation",
      name: sauce.name,
      description: `${sauce.description} Flavour: ${sauce.flavourProfile}`,
      document: docPath.preparation(sauce.slug),
      properties: { arabic_name: sauce.arabicName ?? null, kind: sauce.kind, house_preparation: sauce.houseSpecial, spice_level: sauce.spiceLevel, diet: comp.diet, side_price_aed: sauce.sidePriceFils === null ? null : sauce.sidePriceFils / 100, batch_yield: sauce.batchYield, aliases: sauce.aliases ?? [] },
    });
    link(id, "HAS_SPICE_LEVEL", node.spiceLevel(sauce.spiceLevel), `${sauce.name} is spice level ${sauce.spiceLevel}.`);
    for (const x of sauce.ingredients) {
      const ing = c.ingredientsById.get(x.ingredientId)!;
      link(id, "CONTAINS_INGREDIENT", node.ingredient(ing.id), `${sauce.name} contains ${ing.name} (${x.quantity} per batch).`, { quantity: x.quantity });
    }
    for (const n of sauce.includesSauces ?? []) {
      const nested = c.saucesById.get(n.sauceId)!;
      link(id, "INCLUDES_PREPARATION", node.preparation(nested.slug), `${sauce.name} includes ${nested.name} (${n.quantity}).`, { quantity: n.quantity });
    }
    for (const a of comp.allergens) link(id, "CONTAINS_ALLERGEN", node.allergen(a), `${sauce.name} contains ${ALLERGEN_NAMES[a]}.`);
    for (const a of comp.mayContain) link(id, "MAY_CONTAIN_ALLERGEN", node.allergen(a), `${sauce.name} may contain traces of ${ALLERGEN_NAMES[a]}.`);
  }

  // Special periods and closures
  for (const sp of k.rc.specialPeriods) {
    const id = add({ id: node.period(sp), type: "SpecialPeriod", name: sp.name, description: sp.notes, document: docPath.period(sp.slug), properties: { period_type: sp.type, start_date: sp.startDate, end_date: sp.endDate, provisional: sp.provisional, opens: sp.hoursOverride?.open ?? null, closes: sp.hoursOverride?.close ?? null } });
    link(RID, "HAS_SPECIAL_PERIOD", id, `${sp.name} runs from ${sp.startDate} to ${sp.endDate}${sp.provisional ? " (provisional)" : ""}.`, { start_date: sp.startDate, end_date: sp.endDate });
  }
  for (const cl of k.rc.closures) {
    const id = add({ id: node.closure(cl.id), type: "Closure", name: `Closure on ${cl.date}`, description: cl.publicNote, document: "documents/calendar/closures.md", properties: { date: cl.date, start_time: cl.startTime, end_time: cl.endTime, scope: cl.scope, reason: cl.reason } });
    link(RID, "HAS_CLOSURE", id, cl.publicNote, { date: cl.date });
  }

  // Dishes
  for (const item of visibleItems(k)) {
    const f = dishFacts(k, item);
    const cat = categoryOf(k, item);
    const id = add({
      id: node.dish(item.slug),
      type: "Dish",
      name: item.name,
      description: `${item.shortDescription} ${item.description}`,
      document: docPath.dish(item.slug),
      properties: {
        arabic_name: item.arabicName,
        aliases: item.aliases,
        menu_code: item.id,
        price_aed: item.priceFils / 100,
        price: aed(item.priceFils),
        serves: item.portion.servesPeople,
        portion: item.portion.description,
        kind: item.kind,
        diet: f.comp.diet,
        spice_level: item.spiceLevel,
        prep_minutes: item.prepTimeMinutes,
        lead_time_minutes: f.leadTimeMinutes,
        daily_limit: item.dailyLimit,
        max_per_order: item.maxPerOrder,
        signature: item.signature,
        availability: item.availabilityNote,
        serving_start: f.timeWindow?.start ?? null,
        serving_end: f.timeWindow?.end ?? null,
      },
    });
    link(id, "IN_CATEGORY", node.category(cat.slug), `${item.name} is in the ${cat.name} section of the menu.`);
    link(id, "HAS_SPICE_LEVEL", node.spiceLevel(item.spiceLevel), `${item.name} is spice level ${item.spiceLevel} of 3.`);
    for (const x of item.ingredients) {
      const ing = c.ingredientsById.get(x.ingredientId)!;
      link(id, "CONTAINS_INGREDIENT", node.ingredient(ing.id), `${item.name} contains ${ing.name}: ${x.quantity}${x.removable ? " (can be left out)" : ""}.`, { quantity: x.quantity, removable: !!x.removable });
    }
    for (const x of item.sauces) {
      const sauce = c.saucesById.get(x.sauceId)!;
      link(id, "MADE_WITH_PREPARATION", node.preparation(sauce.slug), `${sauce.name} is ${ROLE_WORDS[x.role]} ${item.name}.`, { role: x.role, note: x.note ?? null });
    }
    for (const src of f.allergenSources) {
      const from = [...src.ingredients, ...src.preparations.map((pp) => pp.name)];
      link(id, "CONTAINS_ALLERGEN", node.allergen(src.allergen), `${item.name} contains ${ALLERGEN_NAMES[src.allergen]} (from ${from.join(", ")}).`, { sources: from.join("; ") });
    }
    for (const t of f.traceSources) link(id, "MAY_CONTAIN_ALLERGEN", node.allergen(t.allergen), `${item.name} may contain traces of ${ALLERGEN_NAMES[t.allergen]}.`, { reason: t.reasons.join(" ") });
    for (const t of f.comp.dietaryTags) link(id, "SUITABLE_FOR_DIET", node.diet(t), `${item.name} is suitable for: ${t.replace(/_/g, " ")}.`);
    for (const d of f.weekdays as IsoWeekday[]) link(id, "SERVED_ON", node.weekday(d), `${item.name} is served on ${weekday(d)}s.`);
    if (f.isBreakfast) link(id, "SERVED_AT", breakfast, `${item.name} is served at breakfast (${s.breakfast.start}–${s.breakfast.end}).`);
    for (const pt of f.onlyDuring) for (const sp of k.rc.specialPeriods.filter((x) => x.type === pt)) link(id, "ONLY_DURING", node.period(sp), `${item.name} is available only during ${PERIOD_TYPE_WORDS[pt]} (${sp.name}).`);
    for (const pt of f.notDuring) for (const sp of k.rc.specialPeriods.filter((x) => x.type === pt)) link(id, "NOT_SERVED_DURING", node.period(sp), `${item.name} is not served during ${PERIOD_TYPE_WORDS[pt]} (${sp.name}).`);
    if (f.dateRange) for (const sp of k.rc.specialPeriods.filter((x) => x.startDate <= f.dateRange!.end && x.endDate >= f.dateRange!.start && x.type === "seasonal")) link(id, "ONLY_DURING", node.period(sp), `${item.name} is served only from ${f.dateRange.start} to ${f.dateRange.end}.`);
    const modes: [boolean, string, string][] = [
      [item.fulfilment.dineIn, "dine-in", "eaten at the restaurant"],
      [item.fulfilment.pickup && !item.bulk.bulkOnly, "pickup", "ordered for pickup"],
      [item.fulfilment.delivery && !item.bulk.bulkOnly, "delivery", "delivered"],
      [item.fulfilment.dineInPreorder && !item.bulk.bulkOnly, "dine-in-preorder", "pre-ordered with a reservation"],
      [item.bulk.eligible, "catering", "ordered for catering"],
    ];
    for (const [ok, mode, words] of modes) if (ok) link(id, "AVAILABLE_FOR", node.orderType(mode), `${item.name} can be ${words}.`);
    if (!item.fulfilment.delivery) link(id, "NOT_AVAILABLE_FOR", node.orderType("delivery"), `${item.name} is not delivered.`);
    for (const pid of item.pairings) {
      const pair = c.itemsById.get(pid);
      if (pair) link(id, "PAIRS_WITH", node.dish(pair.slug), `${item.name} pairs well with ${pair.name}.`);
    }
    for (const g of item.customizations) {
      for (const o of g.options) {
        const oid = add({ id: node.option(item.slug, o.id), type: "MenuOption", name: `${item.name}: ${o.name}`, description: `${g.name} option for ${item.name}: ${o.name}${o.priceDeltaFils ? ` (${o.priceDeltaFils > 0 ? "+" : ""}${aed(o.priceDeltaFils)})` : ""}.`, document: docPath.dish(item.slug), properties: { option_code: o.id, group: g.name, price_delta_aed: o.priceDeltaFils / 100, default: !!o.default } });
        link(id, "HAS_OPTION", oid, `${item.name} can be ordered with “${o.name}” (${g.name}).`);
        for (const ing of o.removesIngredientIds ?? []) link(oid, "REMOVES_INGREDIENT", node.ingredient(ing), `“${o.name}” removes ${c.ingredientsById.get(ing)?.name ?? ing} from ${item.name}.`);
        for (const ing of o.addsIngredientIds ?? []) link(oid, "ADDS_INGREDIENT", node.ingredient(ing), `“${o.name}” adds ${c.ingredientsById.get(ing)?.name ?? ing} to ${item.name}.`);
        for (const sid of o.removesSauceIds ?? []) link(oid, "REMOVES_PREPARATION", node.preparation(c.saucesById.get(sid)!.slug), `“${o.name}” removes ${c.saucesById.get(sid)!.name} from ${item.name}.`);
        for (const sid of o.addsSauceIds ?? []) link(oid, "ADDS_PREPARATION", node.preparation(c.saucesById.get(sid)!.slug), `“${o.name}” adds ${c.saucesById.get(sid)!.name} to ${item.name}.`);
        const eff = f.optionEffects.find((e) => e.option.id === o.id);
        for (const a of eff?.removesAllergens ?? []) link(oid, "REMOVES_ALLERGEN", node.allergen(a), `Choosing “${o.name}” removes ${ALLERGEN_NAMES[a]} from the recipe of ${item.name} (traces may remain).`);
        for (const a of eff?.addsAllergens ?? []) link(oid, "ADDS_ALLERGEN", node.allergen(a), `Choosing “${o.name}” adds ${ALLERGEN_NAMES[a]} to ${item.name}.`);
      }
    }
  }

  // Seating and tables
  for (const area of SEATING_AREAS) {
    const id = add({ id: node.seatingArea(area), type: "SeatingArea", name: SEATING_AREA_LABELS[area], description: SEATING_AREA_LABELS[area], document: docPath.seatingArea(area), properties: { code: area } });
    link(RID, "HAS_SEATING_AREA", id, `Bayt Al Ghaf has a ${SEATING_AREA_LABELS[area].toLowerCase()}.`);
  }
  for (const t of k.rc.tables) {
    const id = add({ id: node.table(t.code), type: "Table", name: `Table ${t.code}`, description: `Table ${t.code}: ${t.minCovers}–${t.maxCovers} guests, ${SEATING_AREA_LABELS[t.area].toLowerCase()}.`, document: "documents/reservations/tables.md", properties: { min_guests: t.minCovers, max_guests: t.maxCovers, bookable: t.onlineBookable, features: t.features } });
    link(id, "IN_SEATING_AREA", node.seatingArea(t.area), `Table ${t.code} is in the ${SEATING_AREA_LABELS[t.area].toLowerCase()}.`);
  }

  // Delivery
  for (const z of s.delivery.zones) {
    const id = add({ id: node.zone(z.id), type: "DeliveryZone", name: z.name, description: z.description, document: docPath.zone(z.id), properties: { fee_aed: z.feeFils / 100, minimum_order_aed: z.minimumOrderFils / 100, free_delivery_above_aed: z.freeDeliveryAboveFils === null ? null : z.freeDeliveryAboveFils / 100, drive_minutes: z.driveMinutes, regular_orders: z.regularOrders } });
    link(RID, "DELIVERS_TO", id, `Bayt Al Ghaf delivers to ${z.name}${z.regularOrders ? "" : " (catering only)"}: fee ${aed(z.feeFils)}, minimum ${aed(z.minimumOrderFils)}.`);
    for (const a of z.areas) {
      const aid = add({ id: node.area(a), type: "Area", name: a, description: `${a}, a Dubai area in ${z.name}.`, document: "documents/delivery/delivery-areas-a-to-z.md", properties: {} });
      link(aid, "IN_DELIVERY_ZONE", id, `${a} is in ${z.name}.`);
    }
  }

  // Statuses
  for (const [code, [label, text]] of Object.entries(ORDER_STATUS_TEXT)) add({ id: node.status("order", code), type: "OrderStatus", name: label, description: text, document: "documents/ordering/order-statuses.md", properties: { code } });
  for (const [code, [label, text]] of Object.entries(RESERVATION_STATUS_TEXT)) add({ id: node.status("reservation", code), type: "ReservationStatus", name: label, description: text, document: "documents/reservations/reservation-statuses.md", properties: { code } });

  // Ingredients reached only through preparations (multi-hop shortcut edges)
  for (const item of visibleItems(k)) {
    const direct = new Set(item.ingredients.map((x) => x.ingredientId));
    for (const x of item.sauces) {
      for (const ingId of sauceIngredientIds(c, x.sauceId)) {
        if (direct.has(ingId)) continue;
        direct.add(ingId);
        const sauce = c.saucesById.get(x.sauceId)!;
        link(node.dish(item.slug), "CONTAINS_VIA_PREPARATION", node.ingredient(ingId), `${item.name} contains ${c.ingredientsById.get(ingId)!.name} through ${sauce.name}.`, { via: sauce.name });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}

const csv = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function graphFiles(g: KnowledgeGraph): Record<string, string> {
  const nodeTypes = [...new Set(g.nodes.map((n) => n.type))].sort();
  const edgeTypes = [...new Set(g.edges.map((e) => e.type))].sort();
  const cypher = [
    "// Load the Bayt Al Ghaf knowledge graph into Neo4j 5.",
    "// Copy nodes.csv and edges.csv into the Neo4j import directory, then run this file (for example with cypher-shell -f import.cypher).",
    "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;",
    ...nodeTypes.map(
      (t) =>
        `LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row WITH row WHERE row.type = '${t}' MERGE (n:Entity {id: row.id}) SET n:${t}, n.name = row.name, n.description = row.description, n.document = row.document, n.properties = row.properties;`,
    ),
    ...edgeTypes.map(
      (t) =>
        `LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row WITH row WHERE row.type = '${t}' MATCH (a:Entity {id: row.source}), (b:Entity {id: row.target}) MERGE (a)-[r:${t}]->(b) SET r.description = row.description, r.properties = row.properties;`,
    ),
    "",
  ].join("\n");
  return {
    "graph/nodes.jsonl": g.nodes.map((n) => JSON.stringify(n)).join("\n") + "\n",
    "graph/edges.jsonl": g.edges.map((e) => JSON.stringify(e)).join("\n") + "\n",
    "graph/nodes.csv": ["id,type,name,description,document,properties", ...g.nodes.map((n) => [n.id, n.type, n.name, n.description, n.document, n.properties].map(csv).join(","))].join("\n") + "\n",
    "graph/edges.csv": ["source,target,type,description,properties", ...g.edges.map((e) => [e.source, e.target, e.type, e.description, e.properties].map(csv).join(","))].join("\n") + "\n",
    "graph/import.cypher": cypher,
    "graph/schema.md": graphSchema(g, nodeTypes, edgeTypes),
  };
}

function graphSchema(g: KnowledgeGraph, nodeTypes: string[], edgeTypes: string[]): string {
  const count = (t: string) => g.nodes.filter((n) => n.type === t).length;
  const ecount = (t: string) => g.edges.filter((e) => e.type === t).length;
  const example = (t: string) => g.edges.find((e) => e.type === t)?.description ?? "";
  return [
    "# Knowledge graph schema",
    "",
    `${g.nodes.length} nodes and ${g.edges.length} edges, built from the same data as the documents. Node ids are stable and prefixed with their type (for example \`dish:lamb-machboos\`, \`allergen:milk\`); every node's \`document\` field points at the document in \`documents/\` that describes it, and every document's front matter lists the node ids it covers in \`entities\`.`,
    "",
    "## Node types",
    "",
    "| Type | Count |",
    "| --- | --- |",
    ...nodeTypes.map((t) => `| ${t} | ${count(t)} |`),
    "",
    "## Edge types",
    "",
    "| Type | Count | Example |",
    "| --- | --- | --- |",
    ...edgeTypes.map((t) => `| ${t} | ${ecount(t)} | ${example(t).replace(/\|/g, "/")} |`),
    "",
    "## Files",
    "",
    "- `nodes.jsonl`, `edges.jsonl`: one JSON object per line (`id`, `type`, `name`, `description`, `document`, `properties` / `source`, `target`, `type`, `description`, `properties`).",
    "- `nodes.csv`, `edges.csv`: the same data as CSV; `properties` is a JSON string.",
    "- `import.cypher`: loads the CSV files into Neo4j 5 (each node gets the label `Entity` plus its type).",
    "",
    "`CONTAINS_VIA_PREPARATION` edges are shortcuts: they connect a dish directly to ingredients it contains only through a sauce, marinade or spice blend, so “which dishes contain walnuts?” is a single hop.",
    "",
  ].join("\n");
}
