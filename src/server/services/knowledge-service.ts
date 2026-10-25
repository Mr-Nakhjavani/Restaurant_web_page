import { buildKnowledgeBundle, type KnowledgeBundle } from "@/knowledge";
import { makeKnowledgeContext } from "@/knowledge/context";
import { ApiError } from "../errors";
import { loadCatalog, loadRestaurantContext } from "../repositories/catalog-repo";

let cache: KnowledgeBundle | null = null;

/** Knowledge documents rendered live from the database; re-rendered only when the data changes. */
export async function getKnowledge(): Promise<KnowledgeBundle> {
  const [catalog, rc] = await Promise.all([loadCatalog(), loadRestaurantContext()]);
  const k = makeKnowledgeContext(catalog, rc);
  if (cache && cache.dataVersion === k.dataVersion) return cache;
  cache = buildKnowledgeBundle(k);
  return cache;
}

export async function listDocuments() {
  const kb = await getKnowledge();
  return kb.documents.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    answers: d.answers,
    wordCount: d.wordCount,
    sectionCount: d.sections.length,
    dataVersion: d.dataVersion,
    url: `/api/v1/knowledge/documents/${d.id}`,
    markdownUrl: `/api/v1/knowledge/documents/${d.id}?format=markdown`,
  }));
}

export async function getDocument(id: string) {
  const kb = await getKnowledge();
  const doc = kb.documents.find((d) => d.id === id.replace(/\.md$/, ""));
  if (!doc) throw new ApiError("NOT_FOUND", `No knowledge document “${id}”.`, { available: kb.documents.map((d) => d.id) });
  return doc;
}

export async function searchKnowledge(q: string, limit: number, documentId?: string) {
  const kb = await getKnowledge();
  return { dataVersion: kb.dataVersion, results: kb.search(q, limit, documentId) };
}

export async function listFaq(category?: string) {
  const kb = await getKnowledge();
  const items = category ? kb.faq.filter((f) => f.category.toLowerCase() === category.toLowerCase()) : kb.faq;
  return { items, categories: [...new Set(kb.faq.map((f) => f.category))] };
}

export async function getFaq(id: string) {
  const kb = await getKnowledge();
  const f = kb.faq.find((x) => x.id === id);
  if (!f) throw new ApiError("NOT_FOUND", `No FAQ entry ${id}.`);
  return f;
}

export async function searchFaq(q: string, limit: number) {
  const kb = await getKnowledge();
  return kb.searchFaq(q, limit);
}

export async function listScenarios() {
  const kb = await getKnowledge();
  return kb.scenarios;
}
