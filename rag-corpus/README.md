# Bayt Al Ghaf knowledge base for RAG and GraphRAG

Everything a chatbot needs to answer questions about Bayt Al Ghaf, the Emirati restaurant and majlis on Dubai Creek: 286 documents (163,016 words), 2082 pre-made chunks, a knowledge graph of 564 entities and 2783 relationships, and 593 evaluation questions with exact answers. Data version `cf5711bbbcc1`.

## Folders

| Folder | What it is | Ingest? |
| --- | --- | --- |
| `documents/` | The knowledge base: one Markdown file per dish, sauce, ingredient, allergen, diet, menu section, weekday, special period, delivery zone, seating area and policy, plus FAQ and overview documents. | Yes — this is the corpus |
| `chunks/chunks.jsonl` | The same documents already split into retrieval chunks (one `##` section each, long sections split at list boundaries). | Optional — use instead of your own chunker |
| `graph/` | Entities and relationships as JSONL and CSV, a Neo4j import script and the schema. | Optional — for GraphRAG |
| `evaluation/` | Questions the chatbot must answer, with expected answers, key facts and sources. | No — use for testing |
| `manifest.json` | Every document with its metadata, sections and word count. | No |

Document types: index (1), restaurant-profile (1), location (1), directions (2), contact (1), hours (1), facilities (1), accessibility (1), families (1), policy (5), payments (1), culture (1), glossary (1), menu-overview (1), price-list (1), guide (1), overview (1), menu-category (11), dish (46), preparation (19), ingredient (113), allergen (14), diet (10), ordering (6), delivery (1), delivery-zone (4), delivery-areas (1), reservations (5), seating-area (4), tables (1), catering (2), weekday (7), specials (1), special-period (4), closures (1), calendar (1), faq (13).

## How the documents are written

- **Front matter** on every file: `id`, `title`, `type`, `summary`, `entities` (graph node ids), `tags`, `language`, `data_version`. Keep it as chunk metadata for filtering (for example `type: dish` or `tags: allergens`).
- **One topic per `##` section, and each section stands alone.** The first sentence names the dish, rule or place in full, so a retrieved chunk never depends on the heading or on an earlier section. Splitting on `##` headings is the recommended chunking; most sections are 40–380 words.
- **Facts are repeated where they are needed** — a dish's price appears on the dish page, in its menu section, in the price list and in its FAQ — so any of those chunks can answer the question.
- **Times** are written as `23:00 (11 pm)` and prices as `AED 72 (72 dirhams)`, matching both written and spoken questions. Arabic names are given for dishes, sauces and ingredients, and common transliterations (majboos, machbous, harris…) are listed under “Guests also ask for…”.
- **Allergen answers** always separate “contains” from “may contain traces of” and include the shared-kitchen statement. Documents never call a dish allergen-free or safe; keep that behaviour in the chatbot prompt.
- Links between documents (“Related documents”) are relative Markdown links.

## Chunks

Each line of `chunks/chunks.jsonl` has `id`, `document_id`, `document_path`, `document_title`, `document_type`, `section`, `text`, `contextual_text`, `word_count`, `entities` and `tags`. Embed `contextual_text`: it prefixes the section with the document title, which noticeably improves retrieval for short sections such as “Table W3” or “Delivery to Al Karama”. `entities` lists the graph nodes the chunk mentions, for joining chunks to the graph.

## Knowledge graph

See `graph/schema.md` for node and edge types with counts. Typical uses:

- **Microsoft GraphRAG / LightRAG**: index `documents/` as the input text. The explicit relationship sentences in the documents (for example “Sauce No. 7 is brushed as a glaze on Rish Ghanam (Lamb Chops)”) extract cleanly. If your tool accepts a pre-built graph, load `graph/nodes.jsonl` and `graph/edges.jsonl` instead of (or in addition to) LLM extraction: each node and edge has a natural-language `description`.
- **Neo4j**: copy `graph/nodes.csv` and `graph/edges.csv` to the import folder and run `graph/import.cypher`.
- Multi-hop questions (“which dishes contain walnuts?”, “which vegan dishes can be delivered?”) are answered by following `CONTAINS_INGREDIENT`, `MADE_WITH_PREPARATION`, `INCLUDES_PREPARATION`, `CONTAINS_VIA_PREPARATION`, `SUITABLE_FOR_DIET` and `AVAILABLE_FOR` edges.

## Evaluation questions

`evaluation/questions.jsonl` (also `.csv` and a readable `.md`). Fields: `id`, `question`, `answer` (the expected answer), `key_facts` (strings a correct answer must contain), `must_not_say`, `category`, `reasoning` (single-fact, multi-hop, aggregation, comparison, temporal, numeric, negative, safety, unanswerable, live-check), `difficulty`, `priority` (`core` = a compact test set), `sources` (documents holding the answer), `entities`, `grounded` (true when every key fact appears verbatim in the sources), `paraphrases` and `notes`.

Simple automatic scoring: an answer passes when it contains every key fact (case-insensitive) and none of the `must_not_say` phrases. For `unanswerable` questions the chatbot should say it does not know; for `live-check` questions it should say it needs to check current availability or the booking, and may quote the rules given in the expected answer.

## Regenerating

The corpus is generated from the restaurant's data by `npm run rag:build` in the project repository (output: `rag-corpus/`). Re-run it after changing the menu, prices or rules, then re-index.
