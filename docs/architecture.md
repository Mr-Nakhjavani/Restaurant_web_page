# Architecture

## Overview

One Next.js 15 application (TypeScript) serves the public website, the back office and the versioned REST API; PostgreSQL 16 (via Prisma 6) is the single persistent store.

```
                ┌──────────────────────────── Next.js app (Node 22) ────────────────────────────┐
 Browser ──────►│ App Router pages (React 19, Tailwind 4)  ──► services ──► repositories ──► Prisma ├──► PostgreSQL 16
                │   server components call services directly                     ▲               │     • tables & enums
 Voice agent ──►│ /api/[[...route]] → Hono app (/api/v1)   ──► services ──────────┘               │     • advisory locks
 (HTTPS + key)  │   middleware: request id · CORS · body limit · auth · rate limit · idempotency  │     • exclusion constraint
                │   zod contracts → validation + OpenAPI 3.1                                      │
                └─────────────────────────────────────────────────────────────────────────────────┘
                         ▲ pure business rules (src/domain) — no I/O, unit-tested with a fixed clock
```

Why one deployable: the website and the API share every rule and query; a separate backend service would duplicate deployment and auth without benefit at this scale. The API is nevertheless framework-independent (Hono on Web-standard `Request`/`Response`), so it can be tested in-process (`app.request()`) and moved to its own process later if needed.

## Layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| Canonical data | `src/data` | The restaurant as code: profile, default settings, floor plan, calendar, 113 ingredients, 19 sauces, 46 dishes, policy facts. Validated by `validateCanonicalData()` (seed refuses invalid data; unit test asserts zero problems). |
| Domain | `src/domain` | Pure functions: Dubai-time handling, opening hours with special periods and closures, item availability rules, allergen/diet derivation, pricing and option validation, order lead time & slot capacity, reservation durations and table choice, catering notice/capacity/discounts, delivery zones, state machines, BM25 search, feeding optimiser. |
| Contracts | `src/server/contracts` | zod schemas for every request and response (validation **and** OpenAPI generation — one definition). |
| Services | `src/server/services` | Use cases: load data, apply domain rules, persist inside transactions, map to DTOs. |
| Repositories | `src/server/repositories` | Database rows ↔ domain objects; seed-data equivalents for documentation snapshots. |
| API | `src/server/api` | Routing, middleware, error mapping, OpenAPI document, Swagger UI. |
| Knowledge | `src/knowledge` | Document generators, FAQ, agent scenarios, search bundle. |
| UI | `src/app`, `src/components` | Pages and components; client components call the API, server components call services. |

## Single source of truth

- **Menu, prices, ingredients, sauces, settings, calendar, tables** are seeded from `src/data` into PostgreSQL. At runtime the database is authoritative; admins change prices, availability and settings there.
- **Allergens and dietary tags are never stored on dishes.** They are derived from ingredient records (including ingredients inside nested sauces, e.g. bezar inside a marinade) plus declared trace risks, so the menu, dish pages, API, allergen matrix and FAQ cannot disagree.
- **Knowledge documents are generated**, not hand-maintained: `src/knowledge/docs/*` render Markdown from a `KnowledgeContext` (catalogue + settings + calendar + profile). The API renders them live from the database (cached per data version); `docs/restaurant-knowledge/*.md` are snapshots rendered from the seed data by `npm run kb:build`. A unit test fails if the snapshots drift, if any dish price is missing, or if the allergen matrix disagrees with the derived allergens.
- **Numbers inside prose** (party-size limits, lead times, notice tiers, fees) are interpolated from settings, and customer-service facts (complaint window, refund method…) come from `src/data/policies.ts`.
- **Website pages read the same services** as the API (server components) or call the API (client components). The UI never computes final prices: checkout shows the server quote.

## Time

All business logic uses Luxon in `Asia/Dubai` (UTC+04:00, no DST). Inputs are local `YYYY-MM-DD` + `HH:mm`; outputs also carry ISO timestamps with `+04:00`. "Now" is injected (`c.get("now")`), which lets tests and the optional test clock (`X-Test-Now`, disabled when `APP_ENV=production`) exercise Friday, Ramadan and National Day rules on any day. Midnight closing is modelled as `24:00`; service windows are split by partial closures (e.g. dining room closed from 18:00 for a private event while takeaway continues).

## Availability engine

Each dish carries machine-readable `availabilityRules` (`days_of_week`, `time_window`, `date_range`, `during_period`, `not_during_period`, `order_types`, `min_notice_hours`, `same_day_cutoff`, `orders_open_from`, `min_quantity`, `channels`) plus fulfilment flags, catering flags, daily limits and operational state (`available`, `sold_out` until a time, `paused`). `evaluateItemAvailability()` returns `orderable`, every failing reason code with a message, the serving window, remaining daily quantity and the next available date/time. The same function guards the menu, the dish page, the order quote, order creation, modification and catering quotes, so the UI can never show a dish as orderable that the backend would reject.

## Orders and capacity

- Lead time = max(min lead, longest preparation + buffer), rounded to 15-minute slots; food can be ready from 30 minutes after opening to 15 minutes before closing; delivery arrival 12:00–22:30 with dispatch time = arrival − zone drive time.
- Kitchen capacity: portions and order count per 15-minute slot (`slotCapacityPortions`, `maxOrdersPerSlot`); dishes have `kitchenPortions` (drinks 0, platters = people served). Regular orders are capped at 20 portions; larger ones must use catering.
- ASAP picks the earliest slot at which **every** dish in the basket is available.
- Creation, modification and catering orders run inside a transaction holding a PostgreSQL advisory lock (`orders` / `bulk-orders`), re-evaluating capacity and daily limits with fresh data before inserting.
- Statuses follow an explicit state machine per order type; customer cancellation is allowed until preparation starts, modification until 30 minutes before (or preparation start).

## Reservations and concurrency

- Tables have an area, covers range, online-bookable flag and features (wheelchair-accessible, creek view…). Durations depend on party size (90/120/150/180 min; majlis 180) plus a 15-minute turnover buffer.
- Table choice picks the smallest fitting free table in preference order; walk-in-only tables are never offered online.
- **Race safety:** writes for a date take `pg_advisory_xact_lock(hashtext('reservations:<date>'))`, re-read bookings and allocate. Independently, the database enforces `EXCLUDE USING gist (tableId WITH =, tstzrange(startAt, blockedUntil) WITH &&) WHERE status IN (pending_confirmation, confirmed, seated)`, so even a buggy code path cannot double-book a table. A test fires concurrent bookings for the last table and asserts exactly one succeeds; another inserts an overlapping row directly and asserts the database rejects it.

## API design

- REST under `/api/v1`, JSON envelopes (`data`/`meta`, `error`), stable ids and references, OpenAPI generated from the zod route definitions (`/api/v1/openapi.json`, Swagger UI at `/api/v1/docs`).
- Error catalogue (`src/server/errors.ts`): every error has a code, HTTP status, category, retryable flag, description and agent guidance; validation errors list field paths.
- Middleware: request ID (`X-Request-Id`, accepted from callers), principal resolution (API key → scopes; signed session cookie), CORS allowlist (no credentials), 64 KB body limit, fixed-window rate limits by key/IP, CSRF origin check for cookie-authenticated mutations, structured access logs.
- Idempotency: `Idempotency-Key` on create endpoints stores the 2xx response (24 h) keyed by route + caller; concurrent duplicates are serialised by a unique constraint.

## Security

| Concern | Measure |
| --- | --- |
| Admin access | scrypt password hashes; HS256 session JWT in an HttpOnly, SameSite=Lax cookie (Secure on https); roles `admin`/`staff`; origin check on state-changing cookie requests |
| Machine access | Random API keys stored as SHA-256 hashes, shown once, scoped (`agent`, `staff`, `admin`), revocable, last-used tracking |
| Customer records | Reference + matching phone, or a per-record access token (stored hashed); identical 404 for wrong phone/unknown reference; lockout after 5 failures/15 min |
| Input | zod validation of every body/query/path; unknown fields stripped; server-side pricing only |
| Abuse | Rate limits, body limit, idempotency, duplicate-order detection |
| Secrets & config | Environment variables validated at start-up; production tier refuses placeholder secrets and the test clock |
| Privacy | Phones masked in logs; no card data anywhere; public endpoints expose no customer data |
| Headers | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; tokens passed to confirmation pages in the URL fragment (never sent to servers) |

## Search

`src/domain/search.ts` is a small BM25 index with tokenisation tuned for transcribed speech: transliteration variants of Arabic dish names (majboos/machbous/kabsa → machboos, lugaimat → luqaimat, harris → harees…), domain synonyms (dried lemon → loomi, booking → reservation, takeaway → pickup) and light stemming. It powers dish search (names, aliases, descriptions, ingredient names), FAQ search and knowledge search (documents split at headings). No vector database is used; results are deterministic and explainable (`matchedTerms`, `score`).

## Front-end design system

Tailwind CSS 4 tokens in `src/app/globals.css`: sand/cream grounds, date-brown and charcoal depth, brass accents used sparingly, muted creek teal; Cormorant Garamond for display, Jost for text, Amiri for Arabic. Original ornaments: Gulf-arch image frames, an Al Sadu weave band, a ghaf-tree mark. Components in `src/components/ui` (buttons, fields, dialog on native `<dialog>`, alerts, badges). Accessibility: semantic landmarks, skip link, visible focus, labelled controls, `aria-live` for async updates, reduced-motion support, contrast-checked text colours. Photographs are openly licensed (credits at `/credits`) with a light shared colour grade.
