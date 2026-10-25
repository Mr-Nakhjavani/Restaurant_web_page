import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { makeKnowledgeContext } from "@/knowledge/context";
import { buildRagCorpus, FORBIDDEN_IN_DOCUMENTS } from "@/knowledge/rag";
import { docPath } from "@/knowledge/rag/ids";
import { ALLERGENS } from "@/domain/types";
import { catalogFromSeed, restaurantContextFromSeed } from "@/server/repositories/catalog-repo";

const k = makeKnowledgeContext(catalogFromSeed(), restaurantContextFromSeed());
const corpus = buildRagCorpus(k);
const files = corpus.files;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

function listFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

describe("RAG corpus", () => {
  it("committed rag-corpus/ equals the generator output (run npm run rag:build)", () => {
    const dir = path.join(process.cwd(), "rag-corpus");
    const onDisk = listFiles(dir).sort();
    expect(onDisk).toEqual(Object.keys(files).sort());
    for (const [rel, content] of Object.entries(files)) expect(readFileSync(path.join(dir, rel), "utf8"), rel).toBe(content);
  });

  it("is deterministic", () => {
    expect(buildRagCorpus(k).files).toEqual(files);
  });

  it("has a document for every dish, preparation, ingredient, allergen, category and weekday", () => {
    for (const i of k.catalog.items.filter((x) => x.isVisible)) expect(files[docPath.dish(i.slug)], i.id).toBeDefined();
    for (const s of k.catalog.saucesById.values()) expect(files[docPath.preparation(s.slug)], s.id).toBeDefined();
    for (const ing of k.catalog.ingredientsById.values()) expect(files[docPath.ingredient(ing.id)], ing.id).toBeDefined();
    for (const a of ALLERGENS) expect(files[docPath.allergen(a)], a).toBeDefined();
    for (const c of k.catalog.categories) expect(files[docPath.category(c.slug)], c.id).toBeDefined();
    for (const d of [1, 2, 3, 4, 5, 6, 7] as const) expect(files[docPath.weekday(d)]).toBeDefined();
  });

  it("documents are written for guests: no test-environment, fictional or API wording", () => {
    expect(FORBIDDEN_IN_DOCUMENTS.test("This restaurant is fictional")).toBe(true);
    for (const d of corpus.documents) expect(files[d.path].match(FORBIDDEN_IN_DOCUMENTS)?.[0], d.path).toBeUndefined();
  });

  it("documents never call a dish allergen-free or safe for allergies", () => {
    for (const d of corpus.documents) expect(files[d.path], d.path).not.toMatch(/\b(is|are) (completely |totally |100% )?(allergen|nut|gluten|dairy|peanut)-free\b|\b(is|are) (completely )?safe for\b|\bguaranteed? (to be )?free\b/i);
  });

  it("every document has front matter, a title and standalone sections", () => {
    for (const d of corpus.documents) {
      const md = files[d.path];
      expect(md.startsWith("---\nid: "), d.path).toBe(true);
      expect(md, d.path).toContain(`\n# ${d.title}\n`);
      expect(d.sections.length, d.path).toBeGreaterThan(0);
    }
  });

  it("entity ids, graph documents and edges all resolve", () => {
    const ids = new Set(corpus.graph.nodes.map((n) => n.id));
    for (const n of corpus.graph.nodes) if (n.document) expect(files[n.document], `${n.id} → ${n.document}`).toBeDefined();
    for (const e of corpus.graph.edges) {
      expect(ids.has(e.source), `edge source ${e.source}`).toBe(true);
      expect(ids.has(e.target), `edge target ${e.target}`).toBe(true);
    }
    for (const d of corpus.documents) for (const e of d.entities) expect(ids.has(e), `${d.path}: ${e}`).toBe(true);
    for (const c of corpus.chunks) for (const e of c.entities) expect(ids.has(e), `${c.id}: ${e}`).toBe(true);
    // Primary entities of entity documents are never dropped.
    for (const d of corpus.documents.filter((x) => ["dish", "preparation", "ingredient", "allergen"].includes(x.docType))) expect(d.entities.length, d.path).toBeGreaterThan(0);
  });

  it("chunks are bounded and carry their document context", () => {
    expect(corpus.chunks.length).toBeGreaterThan(1000);
    for (const c of corpus.chunks) {
      expect(c.word_count, c.id).toBeGreaterThan(0);
      expect(c.word_count, c.id).toBeLessThanOrEqual(600);
      expect(c.contextual_text.startsWith(`Bayt Al Ghaf knowledge base — ${c.document_title}`), c.id).toBe(true);
    }
    expect(new Set(corpus.chunks.map((c) => c.id)).size).toBe(corpus.chunks.length);
  });

  it("evaluation questions are unique, sourced, and grounded questions quote their sources", () => {
    expect(corpus.questions.length).toBeGreaterThan(400);
    expect(new Set(corpus.questions.map((q) => q.id)).size).toBe(corpus.questions.length);
    expect(new Set(corpus.questions.map((q) => q.question)).size).toBe(corpus.questions.length);
    const missing: string[] = [];
    for (const q of corpus.questions) {
      for (const s of q.sources) expect(files[s], `${q.id} source ${s}`).toBeDefined();
      if (!q.grounded) continue;
      const text = norm(q.sources.map((s) => files[s]).join("\n"));
      for (const f of q.key_facts) if (!text.includes(norm(f))) missing.push(`${q.id} “${q.question}” — key fact “${f}” not in ${q.sources.join(", ")}`);
    }
    expect(missing).toEqual([]);
  });

  it("no expected answer contains its own must-not-say phrases", () => {
    for (const q of corpus.questions) for (const m of q.must_not_say ?? []) expect(norm(q.answer).includes(norm(m)), `${q.id}: “${m}”`).toBe(false);
  });

  it("has core questions in every main category", () => {
    const core = corpus.questions.filter((q) => q.priority === "core");
    for (const cat of ["menu-prices", "allergens", "safety", "hours", "location", "reservations", "ordering", "delivery", "catering", "calendar", "policies", "out-of-scope", "live-data"]) {
      expect(core.some((q) => q.category === cat), cat).toBe(true);
    }
  });

  it("states key facts correctly", () => {
    expect(files[docPath.dish("lamb-machboos")]).toContain("AED 72 (72 dirhams)");
    expect(files[docPath.allergen("tree_nuts")]).toMatch(/Camel Kofta \(AED 76\): contains tree nuts from the Al Ghaf House Red/);
    expect(files[docPath.dish("mehyawa-regag")]).toMatch(/Fish: from the Mehyawa/);
    expect(files["documents/delivery/delivery-areas-a-to-z.md"]).toMatch(/## Delivery to Al Karama\n\nBayt Al Ghaf delivers to Al Karama \(also called “karama”\)\. Al Karama is in Zone B/);
    expect(files["documents/calendar/closures.md"]).toContain("The dining room is closed to the public from 18:00 on Saturday 14 November 2026");
  });
});
