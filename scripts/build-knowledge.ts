/**
 * Generates docs/restaurant-knowledge/*.md (and agent-test-scenarios.json) from the
 * canonical seed data. The API serves the same documents rendered live from the
 * database. Run: npm run kb:build   ·   Check only: npm run kb:build -- --check
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { catalogFromSeed, restaurantContextFromSeed } from "@/server/repositories/catalog-repo";
import { makeKnowledgeContext } from "@/knowledge/context";
import { buildKnowledgeBundle } from "@/knowledge";

const outDir = path.join(process.cwd(), "docs", "restaurant-knowledge");
const check = process.argv.includes("--check");
const k = makeKnowledgeContext(catalogFromSeed(), restaurantContextFromSeed());
const bundle = buildKnowledgeBundle(k);
const files: [string, string][] = [
  ...bundle.documents.map((d) => [`${d.id}.md`, d.markdown] as [string, string]),
  ["agent-test-scenarios.json", JSON.stringify({ dataVersion: k.dataVersion, scenarios: bundle.scenarios }, null, 2) + "\n"],
  ["faq.json", JSON.stringify({ dataVersion: k.dataVersion, faq: bundle.faq }, null, 2) + "\n"],
];
let stale = 0;
mkdirSync(outDir, { recursive: true });
for (const [name, content] of files) {
  const file = path.join(outDir, name);
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale++;
  if (check) console.error(`stale: ${name}`);
  else writeFileSync(file, content);
}
const words = bundle.documents.reduce((n, d) => n + d.wordCount, 0);
console.log(`${check ? "checked" : "wrote"} ${files.length} files (${stale} ${check ? "stale" : "changed"}), ${bundle.documents.length} documents, ${words} words, ${bundle.faq.length} FAQ entries, ${bundle.scenarios.length} scenarios, data version ${k.dataVersion}`);
if (check && stale) process.exit(1);
