import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { envelope, errorResponses, jsonContent } from "../../contracts/common";
import { getDocument, getFaq, listDocuments, listFaq, listScenarios, searchFaq, searchKnowledge } from "../../services/knowledge-service";
import type { AppEnv } from "../types";
import { readLimit } from "./shared";

const FaqSchema = z
  .object({ id: z.string(), category: z.string(), question: z.string(), answer: z.string(), tags: z.array(z.string()), relatedDocuments: z.array(z.string()) })
  .openapi("FaqEntry");

const DocSummarySchema = z
  .object({
    id: z.string().openapi({ example: "menu-catalog" }),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    answers: z.array(z.string()),
    wordCount: z.number().int(),
    sectionCount: z.number().int(),
    dataVersion: z.string(),
    url: z.string(),
    markdownUrl: z.string(),
  })
  .openapi("KnowledgeDocumentSummary");

const SectionSchema = z.object({ id: z.string(), heading: z.string(), level: z.number().int(), path: z.array(z.string()), content: z.string() });

const DocSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    answers: z.array(z.string()),
    markdown: z.string(),
    sections: z.array(SectionSchema),
    wordCount: z.number().int(),
    dataVersion: z.string(),
  })
  .openapi("KnowledgeDocument");

const HitSchema = z
  .object({
    type: z.enum(["document_section", "faq"]),
    documentId: z.string(),
    documentTitle: z.string(),
    sectionId: z.string(),
    heading: z.string(),
    snippet: z.string(),
    score: z.number(),
    url: z.string(),
  })
  .openapi("KnowledgeSearchHit");

const ScenarioSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    customerSays: z.string(),
    category: z.string(),
    expectedOutcome: z.array(z.string()),
    correctHandling: z.string(),
    clarificationNeeded: z.string().nullable(),
    apiCalls: z.array(z.string()),
    mustNotPromise: z.array(z.string()),
    rejectOrEscalateWhen: z.string(),
    expectedErrorCodes: z.array(z.string()),
  })
  .openapi("AgentScenario");

export function registerKnowledgeRoutes(app: OpenAPIHono<AppEnv>) {
  for (const p of ["/faq", "/faq/*", "/knowledge/*"]) app.use(p, readLimit);

  app.openapi(
    createRoute({
      method: "get",
      path: "/faq",
      tags: ["Knowledge"],
      summary: "All FAQ entries (optionally one category)",
      request: { query: z.object({ category: z.string().optional().openapi({ example: "Reservations" }) }) },
      responses: { 200: jsonContent(z.object({ data: z.array(FaqSchema), meta: z.object({ count: z.number().int(), categories: z.array(z.string()) }) }), "FAQ") },
    }),
    async (c) => {
      const r = await listFaq(c.req.valid("query").category);
      return c.json({ data: r.items, meta: { count: r.items.length, categories: r.categories } }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/faq/search",
      tags: ["Knowledge"],
      summary: "Search FAQ entries",
      request: { query: z.object({ q: z.string().min(1).max(300).openapi({ example: "is parking available" }), limit: z.coerce.number().int().min(1).max(20).optional() }) },
      responses: { 200: jsonContent(z.object({ data: z.array(FaqSchema.extend({ score: z.number() })) }), "Ranked FAQ entries"), ...errorResponses(400) },
    }),
    async (c) => {
      const q = c.req.valid("query");
      return c.json({ data: await searchFaq(q.q, q.limit ?? 5) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/faq/{id}",
      tags: ["Knowledge"],
      summary: "One FAQ entry",
      request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "faq-001" }) }) },
      responses: { 200: jsonContent(envelope(FaqSchema), "FAQ entry"), ...errorResponses(404) },
    }),
    async (c) => c.json({ data: await getFaq(c.req.valid("param").id) }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/knowledge/documents",
      tags: ["Knowledge"],
      summary: "List knowledge-base documents",
      responses: { 200: jsonContent(z.object({ data: z.array(DocSummarySchema) }), "Documents") },
    }),
    async (c) => c.json({ data: await listDocuments() }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/knowledge/documents/{id}",
      tags: ["Knowledge"],
      summary: "Get a document (JSON with sections, or raw Markdown with ?format=markdown)",
      description: "Rendered live from the database, so prices, hours, availability rules and policies always match the API.",
      request: {
        params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "reservations-and-seating" }) }),
        query: z.object({ format: z.enum(["json", "markdown"]).optional() }),
      },
      responses: {
        200: { description: "Document", content: { "application/json": { schema: envelope(DocSchema) }, "text/markdown": { schema: z.string() } } },
        ...errorResponses(404),
      },
    }),
    async (c) => {
      const doc = await getDocument(c.req.valid("param").id);
      if (c.req.valid("query").format === "markdown") {
        return c.body(doc.markdown, 200, { "Content-Type": "text/markdown; charset=utf-8" }) as never;
      }
      return c.json({ data: doc }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/knowledge/search",
      tags: ["Knowledge"],
      summary: "Search all knowledge documents and FAQ entries",
      description: "BM25 ranking over document sections and FAQ entries with spelling-variant and synonym handling. Returns passages with their source document and section.",
      request: {
        query: z.object({
          q: z.string().min(1).max(300).openapi({ example: "what is in sauce no 7" }),
          limit: z.coerce.number().int().min(1).max(25).optional(),
          documentId: z.string().optional().openapi({ description: "Restrict to one document id" }),
        }),
      },
      responses: { 200: jsonContent(z.object({ data: z.array(HitSchema), meta: z.object({ dataVersion: z.string(), count: z.number().int() }) }), "Ranked passages"), ...errorResponses(400) },
    }),
    async (c) => {
      const q = c.req.valid("query");
      const r = await searchKnowledge(q.q, q.limit ?? 8, q.documentId);
      return c.json({ data: r.results, meta: { dataVersion: r.dataVersion, count: r.results.length } }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/knowledge/scenarios",
      tags: ["Knowledge"],
      summary: "Voice-agent test scenarios (expected handling for unusual requests)",
      responses: { 200: jsonContent(z.object({ data: z.array(ScenarioSchema) }), "Scenarios") },
    }),
    async (c) => c.json({ data: await listScenarios() }, 200),
  );
}
