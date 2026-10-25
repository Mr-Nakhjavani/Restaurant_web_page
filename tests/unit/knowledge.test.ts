import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildKnowledgeBundle } from "@/knowledge";
import { makeKnowledgeContext } from "@/knowledge/context";
import { formatAed } from "@/domain/money";
import { composeItem } from "@/domain/catalog";
import { catalog, ctx } from "./fixtures";

const k = makeKnowledgeContext(catalog, ctx);
const kb = buildKnowledgeBundle(k);
const doc = (id: string) => kb.documents.find((d) => d.id === id)!;
const DIR = path.join(process.cwd(), "docs", "restaurant-knowledge");

const REQUIRED = [
  "restaurant-profile",
  "menu-catalog",
  "ingredients-and-sauces",
  "allergens-and-dietary-guide",
  "reservations-and-seating",
  "ordering-and-takeaway",
  "bulk-and-catering-orders",
  "directions-and-transportation",
  "special-days-and-seasonal-menu",
  "faq",
  "policies-and-edge-cases",
  "voice-agent-reference",
  "data-dictionary",
  "knowledge-index",
];

describe("knowledge base", () => {
  it("contains every required document, rendered and committed", () => {
    for (const id of REQUIRED) {
      expect(doc(id), id).toBeTruthy();
      expect(existsSync(path.join(DIR, `${id}.md`)), `${id}.md missing`).toBe(true);
    }
  });

  it("committed Markdown files are identical to the generator output (run npm run kb:build)", () => {
    for (const d of kb.documents) {
      expect(readFileSync(path.join(DIR, `${d.id}.md`), "utf8"), d.id).toBe(d.markdown);
    }
  });

  it("states every dish's live price in the menu catalogue", () => {
    const md = doc("menu-catalog").markdown;
    for (const i of catalog.items) expect(md, i.id).toContain(`### ${i.name} (${i.arabicName}) — ${formatAed(i.priceFils)}`);
  });

  it("lists the derived allergens for each dish (no hand-typed contradictions)", () => {
    const matrix = doc("allergens-and-dietary-guide").markdown;
    for (const i of catalog.items) {
      const row = matrix.split("\n").find((l) => l.startsWith(`| ${i.name} |`));
      expect(row, i.id).toBeTruthy();
      expect((row!.match(/●/g) ?? []).length, i.id).toBe(composeItem(catalog, i).allergens.length);
    }
  });

  it("defines every sauce used by any dish", () => {
    const md = doc("ingredients-and-sauces").markdown;
    for (const i of catalog.items) for (const s of i.sauces) expect(md).toContain(catalog.saucesById.get(s.sauceId)!.name);
  });

  it("quotes operational numbers from settings", () => {
    expect(doc("reservations-and-seating").markdown).toContain(`**${ctx.settings.reservations.minPartySize}–${ctx.settings.reservations.maxPartySize} guests**`);
    expect(doc("ordering-and-takeaway").markdown).toContain(`Orders are held for **${ctx.settings.ordering.pickupHoldMinutes} minutes**`);
    expect(doc("bulk-and-catering-orders").markdown).toContain(`Daily catering capacity: **${ctx.settings.bulk.dailyCapacityPortions} portions**`);
  });

  it("has no placeholders", () => {
    for (const d of kb.documents) {
      expect(d.markdown, d.id).not.toMatch(/lorem|ipsum|\bTODO\b|\bTBD\b|\bundefined\b|\[object Object\]/i);
      expect(d.markdown, d.id).not.toMatch(/\bNaN\b/);
    }
  });

  it("answers the required customer questions in the FAQ", () => {
    const questions = kb.faq.map((f) => f.question.toLowerCase()).join("\n");
    for (const q of ["where exactly", "parking", "open and close", "six people", "outdoor", "cancel my reservation", "collect it when i arrive", "how early", "40 meals", "100 portions", "fridays", "ramadan menu", "family platter", "ingredients", "sauce", "nuts, dairy, gluten", "vegetarian", "less spicy", "ingredient be removed", "unavailable after", "without making a reservation", "children", "wheelchair", "payment", "someone else", "over the phone", "prepare", "late for pickup", "change my order after", "missing"]) {
      expect(questions, q).toContain(q);
    }
    expect(kb.faq.length).toBeGreaterThanOrEqual(60);
  });

  it("includes at least 15 structured agent test scenarios with expected handling", () => {
    expect(kb.scenarios.length).toBeGreaterThanOrEqual(15);
    for (const s of kb.scenarios) {
      expect(s.correctHandling.length).toBeGreaterThan(20);
      expect(s.expectedOutcome.length).toBeGreaterThan(0);
      expect(s.rejectOrEscalateWhen).toBeTruthy();
    }
    const json = JSON.parse(readFileSync(path.join(DIR, "agent-test-scenarios.json"), "utf8"));
    expect(json.scenarios).toHaveLength(kb.scenarios.length);
  });

  it("finds the right passages for typical questions", () => {
    expect(kb.search("is parking available")[0].heading.toLowerCase()).toContain("parking");
    expect(kb.search("what is in sauce no 7").some((h) => /sauce no\. 7/i.test(h.heading + h.snippet))).toBe(true);
    expect(kb.search("can I order the iftar menu outside ramadan").slice(0, 3).some((h) => /ramadan/i.test(h.heading + h.snippet))).toBe(true);
    expect(kb.searchFaq("deliver to abu dhabi")[0].question).toMatch(/Abu Dhabi/);
  });
});
