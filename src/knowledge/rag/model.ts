/**
 * Document model of the RAG corpus and its Markdown rendering.
 *
 * Each document is one entity or one topic. Each `##` section is written to stand
 * alone when retrieved as a chunk: it names its subject in the first sentence
 * instead of relying on the heading or on earlier sections.
 */
import path from "node:path";

export interface RagSection {
  heading: string;
  body: string;
}

export interface RagDocument {
  /** Stable id, e.g. "dish-lamb-machboos". */
  id: string;
  /** Path inside the corpus, e.g. "documents/menu/dishes/lamb-machboos.md". */
  path: string;
  title: string;
  /** Kind of document: dish, sauce, ingredient, allergen, policy, faq… */
  docType: string;
  /** One or two sentences describing the document. */
  summary: string;
  /** Graph node ids this document is about (first = primary entity). */
  entities: string[];
  tags: string[];
  sections: RagSection[];
  related: { path: string; title: string }[];
}

export interface RenderOptions {
  dataVersion: string;
}

const yamlString = (s: string) => JSON.stringify(s);
const yamlList = (xs: string[]) => `[${xs.map(yamlString).join(", ")}]`;

export function renderDocument(doc: RagDocument, opts: RenderOptions): string {
  const front = [
    "---",
    `id: ${yamlString(doc.id)}`,
    `title: ${yamlString(doc.title)}`,
    `type: ${yamlString(doc.docType)}`,
    `summary: ${yamlString(doc.summary)}`,
    `entities: ${yamlList(doc.entities)}`,
    `tags: ${yamlList(doc.tags)}`,
    `language: "en"`,
    `restaurant: "Bayt Al Ghaf"`,
    `data_version: ${yamlString(opts.dataVersion)}`,
    "---",
  ];
  const body: string[] = [`# ${doc.title}`, "", doc.summary, ""];
  for (const s of doc.sections) {
    if (!s.body.trim()) continue;
    body.push(`## ${s.heading}`, "", s.body.trim(), "");
  }
  if (doc.related.length) {
    const dir = path.posix.dirname(doc.path);
    body.push(
      "## Related documents",
      "",
      ...dedupeRelated(doc).map((r) => `- [${r.title}](${path.posix.relative(dir, r.path)})`),
      "",
    );
  }
  return [...front, "", ...body].join("\n").replace(/\n{3,}/g, "\n\n");
}

function dedupeRelated(doc: RagDocument) {
  const seen = new Set<string>([doc.path]);
  return doc.related.filter((r) => (seen.has(r.path) ? false : (seen.add(r.path), true)));
}

/** Plain text of a section as it should be embedded: document title + heading + body. */
export function sectionContext(doc: RagDocument, section: RagSection): string {
  return `${doc.title} — ${section.heading}`;
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
