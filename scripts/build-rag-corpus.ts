/**
 * Generates the RAG / GraphRAG corpus in rag-corpus/ from the canonical seed data.
 * Run: npm run rag:build   ·   Check only: npm run rag:build -- --check
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalogFromSeed, restaurantContextFromSeed } from "@/server/repositories/catalog-repo";
import { makeKnowledgeContext } from "@/knowledge/context";
import { buildRagCorpus } from "@/knowledge/rag";

const outDir = path.join(process.cwd(), "rag-corpus");
const check = process.argv.includes("--check");
const k = makeKnowledgeContext(catalogFromSeed(), restaurantContextFromSeed());
const corpus = buildRagCorpus(k);

function listFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

const wanted = new Map(Object.entries(corpus.files));
const existing = new Set(listFiles(outDir));
let stale = 0;
for (const [rel, content] of wanted) {
  const file = path.join(outDir, rel);
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale++;
  if (check) console.error(`stale: rag-corpus/${rel}`);
  else {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}
for (const rel of existing) {
  if (wanted.has(rel)) continue;
  stale++;
  if (check) console.error(`obsolete: rag-corpus/${rel}`);
  else rmSync(path.join(outDir, rel));
}

const words = corpus.documents.reduce((n, d) => n + d.sections.reduce((m, s) => m + s.body.split(/\s+/).filter(Boolean).length, 0), 0);
console.log(
  `${check ? "checked" : "wrote"} ${wanted.size} files (${stale} ${check ? "stale" : "changed"}): ${corpus.documents.length} documents, ${words} words, ${corpus.chunks.length} chunks, ${corpus.graph.nodes.length} nodes, ${corpus.graph.edges.length} edges, ${corpus.questions.length} questions; data version ${k.dataVersion}`,
);
if (check && stale > 0) process.exit(1);
