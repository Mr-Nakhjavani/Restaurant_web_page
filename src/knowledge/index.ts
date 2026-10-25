import { SearchIndex } from "@/domain/search";
import { header, table, type KnowledgeContext } from "./context";
import { allergensGuideDoc, ingredientsAndSaucesDoc, menuCatalogDoc } from "./docs/menu-docs";
import { bulkDoc, deliveryDoc, orderingDoc, reservationsDoc, specialDaysDoc } from "./docs/operations-docs";
import { directionsDoc, restaurantProfileDoc } from "./docs/profile-directions";
import { dataDictionaryDoc, faqDoc, policiesDoc, scenariosDoc, voiceAgentReferenceDoc } from "./docs/agent-docs";
import { buildFaq, type FaqEntry } from "./faq";
import { buildScenarios } from "./scenarios";

export interface DocDefinition {
  id: string;
  title: string;
  description: string;
  category: "restaurant" | "menu" | "operations" | "policies" | "agent" | "reference";
  answers: string[];
  render: (k: KnowledgeContext) => string;
}

export const DOCUMENTS: DocDefinition[] = [
  { id: "restaurant-profile", title: "Restaurant Profile", category: "restaurant", description: "Identity, address, contact details, cuisine, facilities, opening hours, seating and house rules.", answers: ["Where is the restaurant?", "What are the opening hours?", "Phone and e-mail", "Facilities, dress code, alcohol, smoking, pets"], render: restaurantProfileDoc },
  { id: "menu-catalog", title: "Menu Catalog", category: "menu", description: "Every dish with price, ingredients and quantities, portions, allergens, diet, preparation time, customisations and ordering eligibility.", answers: ["What is in a dish?", "How much does it cost?", "How long does it take?", "Can an ingredient be removed?"], render: menuCatalogDoc },
  { id: "ingredients-and-sauces", title: "Ingredients & Sauces", category: "menu", description: "Full composition of every sauce, marinade, spice blend, topping and syrup, and the ingredient catalogue.", answers: ["What exactly is in each sauce?", "What is the house sauce?", "What is loomi / bezar / hashu?"], render: ingredientsAndSaucesDoc },
  { id: "allergens-and-dietary-guide", title: "Allergens & Dietary Guide", category: "menu", description: "Allergen matrix, dietary lists, ingredient caveats and the cross-contact policy.", answers: ["Does this contain nuts/dairy/gluten/sesame/shellfish?", "Is it vegan or vegetarian?", "Can you guarantee no cross-contamination?"], render: allergensGuideDoc },
  { id: "reservations-and-seating", title: "Reservations & Seating", category: "operations", description: "Party sizes, table types, seating preferences, durations, cancellations, late arrivals, walk-ins and groups.", answers: ["Can I book for 6 tomorrow?", "Outdoor / window seating?", "Change or cancel a booking", "Late arrival"], render: reservationsDoc },
  { id: "ordering-and-takeaway", title: "Ordering, Pickup & Takeaway", category: "operations", description: "Order types, lead times, pickup process, payment, statuses, modification and cancellation.", answers: ["Order now and collect on arrival?", "How early to order?", "Change after confirmation?", "Late for pickup?"], render: orderingDoc },
  { id: "delivery-areas", title: "Delivery Areas & Fees", category: "operations", description: "Delivery zones, fees, minimum orders and delivery rules.", answers: ["Do you deliver to my area?", "Delivery fee and minimum", "Abu Dhabi?"], render: deliveryDoc },
  { id: "bulk-and-catering-orders", title: "Bulk & Catering Orders", category: "operations", description: "Catering thresholds, notice periods, capacity, pricing, eligible dishes and escalation.", answers: ["40 meals for an office?", "100 portions for an event?", "Family platter contents", "Cheapest way to feed a group"], render: bulkDoc },
  { id: "directions-and-transportation", title: "Directions & Transportation", category: "restaurant", description: "Getting here by car, taxi, metro, bus, abra or on foot; parking and accessibility.", answers: ["Easiest way from a landmark?", "Is parking available?", "Nearest metro?"], render: directionsDoc },
  { id: "special-days-and-seasonal-menu", title: "Special Days & Seasonal Menu", category: "operations", description: "Weekly specials, Ramadan, National Day, Eid, seasonal dishes, closures and advance-order rules.", answers: ["Which items are available on Fridays?", "Is the Ramadan menu available outside Ramadan?", "National Day special"], render: specialDaysDoc },
  { id: "faq", title: "Frequently Asked Questions", category: "reference", description: "Customer-friendly answers grouped by topic.", answers: ["Common customer questions"], render: faqDoc },
  { id: "policies-and-edge-cases", title: "Policies & Edge Cases", category: "policies", description: "Complaints, refunds, substitutions, late orders, unavailable items, declined requests and ambiguity.", answers: ["Missing item?", "Refund?", "Item unavailable after ordering?", "Requests we decline"], render: policiesDoc },
  { id: "agent-test-scenarios", title: "Voice-Agent Test Scenarios", category: "agent", description: "Unusual and adversarial test cases with the expected handling.", answers: ["How should the agent handle tricky requests?"], render: scenariosDoc },
  { id: "voice-agent-reference", title: "Voice-Agent Quick Reference", category: "agent", description: "Golden rules, key facts, intent-to-API mapping and escalation rules for the external voice assistant.", answers: ["Which API call answers which question?", "When to escalate"], render: voiceAgentReferenceDoc },
  { id: "data-dictionary", title: "Data Dictionary", category: "reference", description: "Identifiers, fields, statuses, codes and business terms.", answers: ["What does a status mean?", "Reference formats", "Error codes"], render: dataDictionaryDoc },
  { id: "knowledge-index", title: "Knowledge Index", category: "reference", description: "Where each category of information lives and how to retrieve it.", answers: ["Where do I find X?"], render: () => "" },
];

function knowledgeIndexDoc(k: KnowledgeContext): string {
  return [
    header(k, "knowledge-index", "Knowledge Index", "Where each category of information lives and how an external system can retrieve it."),
    "## Documents",
    "",
    table(
      ["Document", "File", "Contains", "Typical questions"],
      DOCUMENTS.map((d) => [d.title, `\`${d.id}.md\``, d.description, d.answers.join("; ")]),
    ),
    "",
    "## Retrieval",
    "",
    "- `GET /api/v1/knowledge/documents` — list of documents (id, title, description, category, data version).",
    "- `GET /api/v1/knowledge/documents/{id}` — one document as JSON with `markdown` and pre-split `sections`; add `?format=markdown` for raw Markdown.",
    "- `GET /api/v1/knowledge/search?q=…` — ranked passages (document, section heading, snippet, score) from all documents and the FAQ.",
    "- `GET /api/v1/faq`, `GET /api/v1/faq/search?q=…` — structured FAQ entries.",
    "- `GET /api/v1/knowledge/scenarios` — agent test scenarios as JSON.",
    "- The Markdown files in `docs/restaurant-knowledge/` are snapshots generated from the canonical seed data with `npm run kb:build`. The API versions are rendered live from the database, so they reflect admin changes (prices, hours, sold-out dishes) immediately.",
    "",
    "## Where to find…",
    "",
    table(
      ["Information", "Document", "Live structured API"],
      [
        ["Address, contact, facilities", "restaurant-profile", "GET /api/v1/restaurant"],
        ["Opening hours (any date)", "restaurant-profile, special-days-and-seasonal-menu", "GET /api/v1/restaurant/hours?date="],
        ["Directions, parking", "directions-and-transportation", "GET /api/v1/restaurant/location, /restaurant/transportation"],
        ["Policies with numbers", "reservations-and-seating, ordering-and-takeaway, bulk-and-catering-orders", "GET /api/v1/restaurant/policies"],
        ["Menu, prices, ingredients", "menu-catalog", "GET /api/v1/menu, /menu/items/{id}"],
        ["Sauces and ingredients", "ingredients-and-sauces", "GET /api/v1/sauces/{id}, /ingredients/{id}"],
        ["Allergens and diets", "allergens-and-dietary-guide", "GET /api/v1/menu?excludeAllergens=&dietary="],
        ["Availability on a date", "special-days-and-seasonal-menu", "GET /api/v1/menu/items/{id}/availability, /menu/specials"],
        ["Tables", "reservations-and-seating", "GET /api/v1/reservations/availability"],
        ["Delivery zones", "delivery-areas", "GET /api/v1/delivery/zones, /delivery/check?area="],
        ["Catering", "bulk-and-catering-orders", "POST /api/v1/bulk-orders/quotes"],
        ["Statuses, codes, terms", "data-dictionary", "OpenAPI: /api/v1/openapi.json"],
      ],
    ),
    "",
    "## How search works",
    "",
    "Search is a dependency-free BM25 ranking over document sections (split at `##`/`###` headings) and FAQ entries, with light stemming, Arabic-transliteration variants (majboos → machboos, lugaimat → luqaimat, harris → harees…) and domain synonyms (dried lemon → loomi, booking → reservation, takeaway → pickup). There is no vector database; results are deterministic.",
    "",
  ].join("\n");
}

export interface DocumentSection {
  id: string;
  heading: string;
  level: number;
  path: string[];
  content: string;
}

export interface RenderedDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  answers: string[];
  markdown: string;
  sections: DocumentSection[];
  wordCount: number;
  dataVersion: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export function splitSections(markdown: string): DocumentSection[] {
  const lines = markdown.split("\n");
  const sections: DocumentSection[] = [];
  const path: string[] = [];
  let current: DocumentSection | null = null;
  const used = new Map<string, number>();
  for (const line of lines) {
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      const level = m[1].length;
      const heading = m[2].trim();
      path.length = Math.max(0, level - 1);
      path[level - 1] = heading;
      let id = slugify(heading) || "section";
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      if (n) id = `${id}-${n + 1}`;
      current = { id, heading, level, path: path.filter(Boolean), content: "" };
      continue;
    }
    if (current) current.content += line + "\n";
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, content: s.content.trim() }));
}

export function renderDocuments(k: KnowledgeContext): RenderedDocument[] {
  return DOCUMENTS.map((d) => {
    const markdown = (d.id === "knowledge-index" ? knowledgeIndexDoc(k) : d.render(k)).trimEnd() + "\n";
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      answers: d.answers,
      markdown,
      sections: splitSections(markdown),
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
      dataVersion: k.dataVersion,
    };
  });
}

export interface KnowledgeHit {
  type: "document_section" | "faq";
  documentId: string;
  documentTitle: string;
  sectionId: string;
  heading: string;
  snippet: string;
  score: number;
  url: string;
}

export interface KnowledgeBundle {
  dataVersion: string;
  documents: RenderedDocument[];
  faq: FaqEntry[];
  scenarios: ReturnType<typeof buildScenarios>;
  search: (q: string, limit?: number, documentId?: string) => KnowledgeHit[];
  searchFaq: (q: string, limit?: number) => (FaqEntry & { score: number })[];
}

function snippetOf(text: string, terms: string[], length = 320): string {
  const plain = text.replace(/\|/g, " ").replace(/[#*`>_]/g, "").replace(/\s+/g, " ").trim();
  const lower = plain.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase().slice(0, Math.max(3, t.length - 1)));
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  const start = Math.max(0, pos - 80);
  const s = plain.slice(start, start + length);
  return (start > 0 ? "…" : "") + s + (start + length < plain.length ? "…" : "");
}

export function buildKnowledgeBundle(k: KnowledgeContext): KnowledgeBundle {
  const documents = renderDocuments(k);
  const faq = buildFaq(k);
  const scenarios = buildScenarios(k);
  type Payload = { type: "document_section" | "faq"; doc: RenderedDocument | null; section: DocumentSection | null; faq: FaqEntry | null };
  const docs = [
    ...documents
      .filter((d) => d.id !== "faq")
      .flatMap((d) =>
        d.sections
          .filter((s) => s.content.length > 0)
          .map((s) => ({
            id: `${d.id}#${s.id}`,
            payload: { type: "document_section" as const, doc: d, section: s, faq: null } as Payload,
            fields: [
              { text: s.path.join(" "), weight: 2.5 },
              { text: s.content, weight: 1 },
            ],
          })),
      ),
    ...faq.map((f) => ({
      id: `faq#${f.id}`,
      payload: { type: "faq" as const, doc: documents.find((d) => d.id === "faq")!, section: null, faq: f } as Payload,
      fields: [
        { text: f.question, weight: 3 },
        { text: f.tags.join(" "), weight: 2 },
        { text: f.answer, weight: 1 },
      ],
    })),
  ];
  const index = new SearchIndex(docs);
  const faqIndex = new SearchIndex(faq.map((f) => ({ id: f.id, payload: f, fields: [{ text: f.question, weight: 3 }, { text: f.tags.join(" "), weight: 2 }, { text: f.answer, weight: 1 }] })));
  return {
    dataVersion: k.dataVersion,
    documents,
    faq,
    scenarios,
    search: (q, limit = 8, documentId) =>
      index
        .search(q, documentId ? 200 : limit)
        .filter((h) => !documentId || h.payload.doc?.id === documentId || (documentId === "faq" && h.payload.type === "faq"))
        .slice(0, limit)
        .map((h) => {
          const p = h.payload;
          if (p.type === "faq") {
            return {
              type: "faq",
              documentId: "faq",
              documentTitle: "Frequently Asked Questions",
              sectionId: p.faq!.id,
              heading: p.faq!.question,
              snippet: p.faq!.answer.length > 400 ? p.faq!.answer.slice(0, 400) + "…" : p.faq!.answer,
              score: h.score,
              url: `/api/v1/faq/${p.faq!.id}`,
            };
          }
          return {
            type: "document_section",
            documentId: p.doc!.id,
            documentTitle: p.doc!.title,
            sectionId: p.section!.id,
            heading: p.section!.path.join(" › "),
            snippet: snippetOf(p.section!.content, h.matchedTerms),
            score: h.score,
            url: `/api/v1/knowledge/documents/${p.doc!.id}#${p.section!.id}`,
          };
        }),
    searchFaq: (q, limit = 8) => faqIndex.search(q, limit).map((h) => ({ ...h.payload, score: h.score })),
  };
}

export { buildFaq, buildScenarios };
