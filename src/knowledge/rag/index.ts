/**
 * Builds the RAG corpus: Markdown documents with metadata front matter, section
 * chunks, a knowledge graph, evaluation questions, a manifest and a README.
 * Everything is generated from the restaurant's canonical data and is deterministic.
 */
import path from "node:path";
import type { KnowledgeContext } from "../context";
import { allergenDocuments } from "./allergen-docs";
import { calendarDocuments } from "./calendar-docs";
import { faqDocuments } from "./faq-docs";
import { buildGraph, graphFiles, type KnowledgeGraph } from "./graph";
import { allMenuDocuments } from "./menu-docs";
import { renderDocument, wordCount, type RagDocument } from "./model";
import { buildQuestions, type EvalQuestion } from "./questions";
import { restaurantDocuments } from "./restaurant-docs";
import { serviceDocuments } from "./service-docs";

export interface RagChunk {
  id: string;
  document_id: string;
  document_path: string;
  document_title: string;
  document_type: string;
  section: string;
  text: string;
  contextual_text: string;
  word_count: number;
  entities: string[];
  tags: string[];
}

export interface RagCorpus {
  documents: RagDocument[];
  graph: KnowledgeGraph;
  questions: EvalQuestion[];
  chunks: RagChunk[];
  files: Record<string, string>;
}

/** Wording that belongs to the software project, not to the restaurant's own knowledge. */
export const FORBIDDEN_IN_DOCUMENTS = /fictional|simulat|test environment|test restaurant|placeholder|does not exist|not a real|\bAPI\b|endpoint|voice agent|in this environment|X-Customer|seed data/i;

const MAX_CHUNK_WORDS = 380;

export function buildRagCorpus(k: KnowledgeContext): RagCorpus {
  const raw = [...restaurantDocuments(k), ...allMenuDocuments(k), ...allergenDocuments(k), ...serviceDocuments(k), ...calendarDocuments(k), ...faqDocuments(k)];
  const graph = buildGraph(k);
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const d of raw) {
    if (ids.has(d.id)) throw new Error(`Duplicate RAG document id ${d.id}`);
    if (paths.has(d.path)) throw new Error(`Duplicate RAG document path ${d.path}`);
    ids.add(d.id);
    paths.add(d.path);
  }
  const index = indexDocument(raw);
  paths.add(index.path);
  const documents = [index, ...raw].map((d) => ({
    ...d,
    entities: [...new Set(d.entities)].filter((e) => nodeIds.has(e)),
    tags: [...new Set(d.tags)],
    related: d.related.filter((r) => paths.has(r.path)),
  }));

  const files: Record<string, string> = {};
  for (const d of documents) {
    const md = renderDocument(d, { dataVersion: k.dataVersion });
    const bad = md.match(FORBIDDEN_IN_DOCUMENTS);
    if (bad) throw new Error(`RAG document ${d.path} contains “${bad[0]}”`);
    files[d.path] = md;
  }

  const chunks = buildChunks(documents, graph);
  const questions = buildQuestions(k);
  Object.assign(files, graphFiles(graph));
  files["chunks/chunks.jsonl"] = chunks.map((c) => JSON.stringify(c)).join("\n") + "\n";
  files["evaluation/questions.jsonl"] = questions.map((q) => JSON.stringify(q)).join("\n") + "\n";
  files["evaluation/questions.csv"] = questionsCsv(questions);
  files["evaluation/questions.md"] = questionsMarkdown(questions);
  files["manifest.json"] = JSON.stringify(manifest(k, documents, chunks, graph, questions), null, 2) + "\n";
  files["README.md"] = readme(k, documents, chunks, graph, questions);
  return { documents, graph, questions, chunks, files };
}

function indexDocument(docs: RagDocument[]): RagDocument {
  const groups = new Map<string, RagDocument[]>();
  for (const d of docs) {
    const g = d.path.split("/").slice(1, -1).join("/") || "documents";
    groups.set(g, [...(groups.get(g) ?? []), d]);
  }
  const titles: Record<string, string> = {
    restaurant: "The restaurant",
    menu: "Menu",
    "menu/categories": "Menu sections",
    "menu/dishes": "Dishes",
    "menu/sauces-and-preparations": "Sauces, marinades and spice blends",
    "menu/ingredients": "Ingredients",
    "allergens-and-diets": "Allergens and diets",
    ordering: "Ordering",
    delivery: "Delivery",
    reservations: "Reservations and seating",
    catering: "Catering",
    calendar: "Calendar and special days",
    "calendar/weekdays": "Days of the week",
    policies: "Policies",
    faq: "Frequently asked questions",
  };
  return {
    id: "index",
    path: "documents/index.md",
    title: "Bayt Al Ghaf knowledge base: index",
    docType: "index",
    summary: `The table of contents of the Bayt Al Ghaf knowledge base: ${docs.length} documents about the restaurant, its menu, allergens, ordering, delivery, reservations, catering, calendar and policies.`,
    entities: ["restaurant:bayt-al-ghaf"],
    tags: ["index"],
    sections: [...groups.entries()].map(([g, ds]) => ({
      heading: `${titles[g] ?? g} (${ds.length} documents)`,
      body: ds.map((d) => `- [${d.title}](${path.posix.relative("documents", d.path)}): ${d.summary}`).join("\n"),
    })),
    related: [],
  };
}

function buildChunks(documents: RagDocument[], graph: KnowledgeGraph): RagChunk[] {
  const mentionable = graph.nodes
    .filter((n) => ["Dish", "Preparation", "Ingredient", "Allergen", "Area", "DeliveryZone", "SpecialPeriod", "SeatingArea", "Landmark", "Person", "Table", "Facility"].includes(n.type) && n.name.length >= 4)
    .map((n) => ({ id: n.id, needle: n.name.toLowerCase().replace(/ \(.*\)$/, "") }));
  const chunks: RagChunk[] = [];
  for (const d of documents) {
    if (d.docType === "index") continue;
    d.sections.forEach((s, si) => {
      const parts = splitBody(s.body);
      parts.forEach((body, pi) => {
        const section = parts.length > 1 ? `${s.heading} (part ${pi + 1} of ${parts.length})` : s.heading;
        const text = `## ${section}\n\n${body}`;
        const lower = `${section}\n${body}`.toLowerCase();
        const mentioned = mentionable.filter((m) => lower.includes(m.needle)).map((m) => m.id);
        chunks.push({
          id: `${d.id}#${si + 1}${parts.length > 1 ? `.${pi + 1}` : ""}`,
          document_id: d.id,
          document_path: d.path,
          document_title: d.title,
          document_type: d.docType,
          section,
          text,
          contextual_text: `Bayt Al Ghaf knowledge base — ${d.title}\nSection: ${section}\n\n${body}`,
          word_count: wordCount(body),
          entities: [...new Set([...(d.entities[0] ? [d.entities[0]] : []), ...mentioned])],
          tags: d.tags,
        });
      });
    });
  }
  return chunks;
}

/**
 * Split long sections at paragraph, bullet, Q&A or table-row boundaries, never inside a
 * line. Table parts repeat the table header so every chunk stays readable.
 */
function splitBody(body: string): string[] {
  if (wordCount(body) <= MAX_CHUNK_WORDS) return [body.trim()];
  const lines = body.split("\n");
  const headerAt = lines.findIndex((l, i) => l.startsWith("|") && lines[i + 1]?.startsWith("| ---"));
  const tableHeader = headerAt >= 0 ? `${lines[headerAt]}\n${lines[headerAt + 1]}` : "";
  const blocks: { text: string; row: boolean }[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ text: para.join("\n").trim(), row: false });
    para = [];
  };
  lines.forEach((l, i) => {
    if (i === headerAt || i === headerAt + 1) return flush();
    if (l.startsWith("|")) {
      flush();
      blocks.push({ text: l, row: true });
    } else if (l.startsWith("- ") || l.startsWith("**Q:") || l.trim() === "") {
      flush();
      if (l.trim()) para.push(l);
    } else para.push(l);
  });
  flush();
  const parts: string[] = [];
  let current: string[] = [];
  let words = 0;
  let inTable = false;
  for (const b of blocks.filter((x) => x.text)) {
    const w = wordCount(b.text);
    if (words + w > MAX_CHUNK_WORDS && current.length) {
      parts.push(current.join("\n"));
      current = [];
      words = 0;
      inTable = false;
    }
    if (b.row && !inTable) {
      current.push(tableHeader);
      words += wordCount(tableHeader);
      inTable = true;
    }
    if (!b.row) inTable = false;
    current.push(b.text);
    words += w;
  }
  if (current.length) parts.push(current.join("\n"));
  return parts.map((p) => p.replace(/\n(?=\*\*Q:|A: )/g, "\n\n").replace(/\n(?=[^|\n])(?<=\|[^\n]*\n)/g, "\n\n").trim());
}

const csvCell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(" | ") : v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function questionsCsv(qs: EvalQuestion[]): string {
  const cols: (keyof EvalQuestion)[] = ["id", "priority", "category", "reasoning", "difficulty", "question", "answer", "key_facts", "must_not_say", "sources", "grounded"];
  return [cols.join(","), ...qs.map((q) => cols.map((c) => csvCell(q[c])).join(","))].join("\n") + "\n";
}

function questionsMarkdown(qs: EvalQuestion[]): string {
  const cats = [...new Set(qs.map((q) => q.category))];
  const core = qs.filter((q) => q.priority === "core");
  const out = [
    "# Evaluation questions",
    "",
    `${qs.length} questions with exact expected answers (${core.length} marked core). Each question lists the facts a correct answer must contain (key facts), anything it must not say, and the documents that hold the answer. Questions marked “live check” or “unanswerable” test that the assistant does not invent information.`,
    "",
    "| Category | Questions | Core |",
    "| --- | --- | --- |",
    ...cats.map((c) => `| ${c} | ${qs.filter((q) => q.category === c).length} | ${qs.filter((q) => q.category === c && q.priority === "core").length} |`),
    "",
  ];
  for (const priority of ["core", "extended"] as const) {
    out.push(`## ${priority === "core" ? "Core questions" : "Extended questions"}`, "");
    for (const c of cats) {
      const list = qs.filter((q) => q.category === c && q.priority === priority);
      if (!list.length) continue;
      out.push(`### ${c} (${list.length})`, "");
      for (const q of list) {
        out.push(
          `**${q.id}. ${q.question}**`,
          "",
          `- Expected answer: ${q.answer}`,
          `- Key facts: ${q.key_facts.length ? q.key_facts.map((f) => `\`${f}\``).join(", ") : "—"}`,
          ...(q.must_not_say?.length ? [`- Must not say: ${q.must_not_say.map((f) => `“${f}”`).join(", ")}`] : []),
          `- Type: ${q.reasoning}, ${q.difficulty}${q.grounded ? "" : " (computed or behavioural — not a verbatim quote)"}`,
          `- Sources: ${q.sources.length ? q.sources.map((s) => `\`${s}\``).join(", ") : "none (not in the knowledge base)"}`,
          ...(q.paraphrases?.length ? [`- Also asked as: ${q.paraphrases.map((p) => `“${p}”`).join(", ")}`] : []),
          ...(q.notes ? [`- Note: ${q.notes}`] : []),
          "",
        );
      }
    }
  }
  return out.join("\n");
}

function manifest(k: KnowledgeContext, documents: RagDocument[], chunks: RagChunk[], graph: KnowledgeGraph, questions: EvalQuestion[]) {
  return {
    name: "Bayt Al Ghaf knowledge base",
    data_version: k.dataVersion,
    language: "en",
    counts: {
      documents: documents.length,
      sections: documents.reduce((n, d) => n + d.sections.length, 0),
      words: documents.reduce((n, d) => n + d.sections.reduce((m, s) => m + wordCount(s.body), 0), 0),
      chunks: chunks.length,
      graph_nodes: graph.nodes.length,
      graph_edges: graph.edges.length,
      questions: questions.length,
      core_questions: questions.filter((q) => q.priority === "core").length,
    },
    documents: documents.map((d) => ({
      id: d.id,
      path: d.path,
      title: d.title,
      type: d.docType,
      summary: d.summary,
      entities: d.entities,
      tags: d.tags,
      sections: d.sections.map((s) => s.heading),
      words: d.sections.reduce((m, s) => m + wordCount(s.body), 0),
    })),
  };
}

function readme(k: KnowledgeContext, documents: RagDocument[], chunks: RagChunk[], graph: KnowledgeGraph, questions: EvalQuestion[]): string {
  const words = documents.reduce((n, d) => n + d.sections.reduce((m, s) => m + wordCount(s.body), 0), 0);
  const byType = [...new Set(documents.map((d) => d.docType))].map((t) => `${t} (${documents.filter((d) => d.docType === t).length})`);
  return [
    "# Bayt Al Ghaf knowledge base for RAG and GraphRAG",
    "",
    `Everything a chatbot needs to answer questions about Bayt Al Ghaf, the Emirati restaurant and majlis on Dubai Creek: ${documents.length} documents (${words.toLocaleString("en-US")} words), ${chunks.length} pre-made chunks, a knowledge graph of ${graph.nodes.length} entities and ${graph.edges.length} relationships, and ${questions.length} evaluation questions with exact answers. Data version \`${k.dataVersion}\`.`,
    "",
    "## Folders",
    "",
    "| Folder | What it is | Ingest? |",
    "| --- | --- | --- |",
    "| `documents/` | The knowledge base: one Markdown file per dish, sauce, ingredient, allergen, diet, menu section, weekday, special period, delivery zone, seating area and policy, plus FAQ and overview documents. | Yes — this is the corpus |",
    "| `chunks/chunks.jsonl` | The same documents already split into retrieval chunks (one `##` section each, long sections split at list boundaries). | Optional — use instead of your own chunker |",
    "| `graph/` | Entities and relationships as JSONL and CSV, a Neo4j import script and the schema. | Optional — for GraphRAG |",
    "| `evaluation/` | Questions the chatbot must answer, with expected answers, key facts and sources. | No — use for testing |",
    "| `manifest.json` | Every document with its metadata, sections and word count. | No |",
    "",
    `Document types: ${byType.join(", ")}.`,
    "",
    "## How the documents are written",
    "",
    "- **Front matter** on every file: `id`, `title`, `type`, `summary`, `entities` (graph node ids), `tags`, `language`, `data_version`. Keep it as chunk metadata for filtering (for example `type: dish` or `tags: allergens`).",
    "- **One topic per `##` section, and each section stands alone.** The first sentence names the dish, rule or place in full, so a retrieved chunk never depends on the heading or on an earlier section. Splitting on `##` headings is the recommended chunking; most sections are 40–380 words.",
    "- **Facts are repeated where they are needed** — a dish's price appears on the dish page, in its menu section, in the price list and in its FAQ — so any of those chunks can answer the question.",
    "- **Times** are written as `23:00 (11 pm)` and prices as `AED 72 (72 dirhams)`, matching both written and spoken questions. Arabic names are given for dishes, sauces and ingredients, and common transliterations (majboos, machbous, harris…) are listed under “Guests also ask for…”.",
    "- **Allergen answers** always separate “contains” from “may contain traces of” and include the shared-kitchen statement. Documents never call a dish allergen-free or safe; keep that behaviour in the chatbot prompt.",
    "- Links between documents (“Related documents”) are relative Markdown links.",
    "",
    "## Chunks",
    "",
    "Each line of `chunks/chunks.jsonl` has `id`, `document_id`, `document_path`, `document_title`, `document_type`, `section`, `text`, `contextual_text`, `word_count`, `entities` and `tags`. Embed `contextual_text`: it prefixes the section with the document title, which noticeably improves retrieval for short sections such as “Table W3” or “Delivery to Al Karama”. `entities` lists the graph nodes the chunk mentions, for joining chunks to the graph.",
    "",
    "## Knowledge graph",
    "",
    "See `graph/schema.md` for node and edge types with counts. Typical uses:",
    "",
    "- **Microsoft GraphRAG / LightRAG**: index `documents/` as the input text. The explicit relationship sentences in the documents (for example “Sauce No. 7 is brushed as a glaze on Rish Ghanam (Lamb Chops)”) extract cleanly. If your tool accepts a pre-built graph, load `graph/nodes.jsonl` and `graph/edges.jsonl` instead of (or in addition to) LLM extraction: each node and edge has a natural-language `description`.",
    "- **Neo4j**: copy `graph/nodes.csv` and `graph/edges.csv` to the import folder and run `graph/import.cypher`.",
    "- Multi-hop questions (“which dishes contain walnuts?”, “which vegan dishes can be delivered?”) are answered by following `CONTAINS_INGREDIENT`, `MADE_WITH_PREPARATION`, `INCLUDES_PREPARATION`, `CONTAINS_VIA_PREPARATION`, `SUITABLE_FOR_DIET` and `AVAILABLE_FOR` edges.",
    "",
    "## Evaluation questions",
    "",
    "`evaluation/questions.jsonl` (also `.csv` and a readable `.md`). Fields: `id`, `question`, `answer` (the expected answer), `key_facts` (strings a correct answer must contain), `must_not_say`, `category`, `reasoning` (single-fact, multi-hop, aggregation, comparison, temporal, numeric, negative, safety, unanswerable, live-check), `difficulty`, `priority` (`core` = a compact test set), `sources` (documents holding the answer), `entities`, `grounded` (true when every key fact appears verbatim in the sources), `paraphrases` and `notes`.",
    "",
    "Simple automatic scoring: an answer passes when it contains every key fact (case-insensitive) and none of the `must_not_say` phrases. For `unanswerable` questions the chatbot should say it does not know; for `live-check` questions it should say it needs to check current availability or the booking, and may quote the rules given in the expected answer.",
    "",
    "## Regenerating",
    "",
    "The corpus is generated from the restaurant's data by `npm run rag:build` in the project repository (output: `rag-corpus/`). Re-run it after changing the menu, prices or rules, then re-index.",
    "",
  ].join("\n");
}
