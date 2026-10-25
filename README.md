# Bayt Al Ghaf — Emirati restaurant website, backend & voice-agent-ready API

**Bayt Al Ghaf (بيت الغاف)** is a *fictional* contemporary Emirati restaurant and majlis on the Al Seef promenade of Dubai Creek. This repository contains its complete website, back office, PostgreSQL-backed business logic, versioned REST API and a 62,000-word knowledge base — a realistic environment for testing an **external** AI voice assistant.

> ⚠️ **Fictional test restaurant.** The name, address, phone numbers (`+971 4 555 0142`…), e-mail addresses (`*.example`), prices, availability and policies are simulated. No real orders are fulfilled and no payments are ever taken. Photos are openly licensed stand-ins (see `/credits`).

The voice assistant itself is **out of scope**: it already exists on another server. This project provides everything it needs to integrate — see [`docs/integration/external-agent-integration.md`](docs/integration/external-agent-integration.md).

---

## Contents

- [What's included](#whats-included)
- [Quick start (local)](#quick-start-local)
- [Running with Docker](#running-with-docker)
- [Configuration](#configuration)
- [Using the system](#using-the-system)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Documentation map](#documentation-map)
- [Known limitations](#known-limitations)

## What's included

| Area | Highlights |
| --- | --- |
| Website | Home, Menu (search with transliteration tolerance, dietary & allergen filters, date/mode-aware availability), dish pages (ingredients with quantities, sauces, allergen sources, customisations, 7-day availability), Order online (cart, customisation, pickup/delivery/dine-in pre-order, server-priced checkout, confirmation & live status), Reservations (availability → slot → details → confirmation; manage/change/cancel), Catering (live feasibility quote → request), Our story, Visit (directions, parking, illustrative map), FAQ, photo credits. Responsive, keyboard-accessible, no horizontal scroll at 360 px. |
| Back office (`/admin`) | Session login (admin & staff roles), today's dashboard, orders (filters, state-machine transitions, remove unavailable lines), reservations (confirm/seat/no-show), menu prices & sold-out/paused/visible/featured, special periods & closures, settings (switches, capacity, full validated JSON), API keys, audit log. |
| Restaurant data | 46 dishes in 11 categories (permanent, weekly specials, limited-time, catering-only), 113 ingredients, 19 fully defined sauces/marinades/spice blends (including three named house preparations), 31 tables in 4 seating areas, delivery zones A–D, Ramadan/National Day/Eid/seasonal calendar, closures. Allergens and diets are **derived** from ingredients, never typed by hand. |
| Business rules | Special-day rules enforced server-side in Dubai time; kitchen slot capacity; lead times; daily limits; manual review; delivery zones & minimums; reservation durations, seating areas, terrace season, majlis rules, closures; catering notice tiers, capacity, discounts, deposits; idempotency; duplicate prevention; concurrency-safe table allocation (advisory locks + PostgreSQL exclusion constraint). |
| API (`/api/v1`) | 57 paths: restaurant, hours, location, transportation, policies, delivery, menu, search, specials, availability, ingredients, sauces, feeding suggestions, reservations, orders, catering quotes/orders, FAQ, knowledge search/documents/scenarios, admin. OpenAPI 3.1 + Swagger UI, consistent error catalogue, request IDs, rate limits, body limits, CORS allowlist, structured JSON logs, health endpoint. |
| Knowledge base | 16 Markdown documents (+ FAQ and test scenarios as JSON) generated from the same canonical data the API uses, served live by the API. 76 FAQ entries; 30 adversarial agent test scenarios. |
| Tests | 74 unit, 62 API integration (real PostgreSQL), 23 end-to-end browser tests (desktop + mobile). |

## Quick start (local)

Prerequisites: **Node.js 20.9+ (22 LTS recommended)**, npm, Docker (for PostgreSQL) — or your own PostgreSQL 16 with the `btree_gist` extension available.

```bash
cp .env.example .env
```

```bash
docker compose up -d db
```

```bash
npm install
```

```bash
npm run db:migrate && npm run db:seed
```

```bash
npm run dev
```

Open <http://localhost:3000>. The seed creates reference data, a staff login, an admin login, a development API key and a few sample reservations/orders around today's date:

| What | Value (local development only) |
| --- | --- |
| Website | http://localhost:3000 |
| Back office | http://localhost:3000/admin — `admin@baytalghaf.example` / `ChangeMe-Admin-2026` (staff: `staff@baytalghaf.example` / `ChangeMe-Staff-2026`) |
| API | http://localhost:3000/api/v1 — Swagger UI at http://localhost:3000/api/v1/docs |
| Agent API key | `bg_dev_agent_key_for_local_testing_only` (scope `agent`) |

Try it:

```bash
curl -s 'http://localhost:3000/api/v1/menu/items/mi_friday_platter/availability?mode=pickup' | jq .data.availability
```

To run the production build locally instead of the dev server: `npm run build && npm start`.

Both `npm run dev` and `npm start` use port 3000 unless `PORT` is set. If port 3000 is taken (`EADDRINUSE`), the site is usually already running there — for example as the [systemd service](docs/deployment.md) — so use another port: `PORT=3001 npm run dev`. If a production server (`npm start`) is running from **this same folder**, also give the dev server its own build folder so it does not overwrite the `.next` build being served:

```bash
PORT=3001 NEXT_DIST_DIR=.next-dev npm run dev
```

Do not run `npm run build` while a production server is serving from the same folder; stop it first (by PID: `ss -ltnp | grep :3000`), build, then start it again.

The database runs on host port **5433** (to avoid clashing with a local PostgreSQL). The Docker init script also creates `bayt_al_ghaf_test` and `bayt_al_ghaf_e2e` for the test suites.

## Running with Docker

The `app` profile builds the production image and runs it next to PostgreSQL. A real session secret is required:

```bash
export ADMIN_SESSION_SECRET="$(openssl rand -base64 48)"
```

```bash
docker compose --profile app up --build
```

The container applies migrations on start and seeds reference data when `RUN_SEED_ON_START=true` (the compose default). `APP_ENV` defaults to `staging` in compose.

## Configuration

All configuration is via environment variables, validated at start-up (`src/server/config.ts`). See [`.env.example`](.env.example) for every variable with comments. The important ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection |
| `APP_ENV` | `development` / `staging` / `production`. Production refuses placeholder secrets and the test clock |
| `ADMIN_SESSION_SECRET` | ≥ 32 random characters for signing admin sessions |
| `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS` | Public URL; browser origins allowed by CORS |
| `SEED_*` | Initial admin/staff accounts and an optional development agent key |
| `RATE_LIMIT_ENABLED`, `TRUST_PROXY`, `LOG_LEVEL` | Operational switches |
| `SIMULATE_KITCHEN_PROGRESS` | Test environments: confirmed orders advance through preparing → ready as time passes |
| `ENABLE_TEST_CLOCK` | Test environments: requests may send `X-Test-Now` to simulate another date/time |

Operational settings (hours, capacities, lead times, delivery zones, reservation and catering rules) live in the database and are edited in **Admin → Settings**; their defaults are in `src/data/restaurant.ts`.

## Using the system

- **Customers** use the website (menu → order or reserve). Orders are paid in person; no card data is collected.
- **Staff** use `/admin` to confirm large groups and high-value orders, move order statuses, mark dishes sold out, add closures and confirm Ramadan dates.
- **The voice assistant** uses the API with an `agent` key. Start with [`docs/integration/external-agent-integration.md`](docs/integration/external-agent-integration.md), the workflows in [`docs/api/voice-agent-integration.md`](docs/api/voice-agent-integration.md), real examples in [`docs/api/examples.md`](docs/api/examples.md) and runnable clients in [`docs/integration/examples/`](docs/integration/examples/).

## Testing

| Command | What it runs |
| --- | --- |
| `npm run test:unit` | 74 unit tests: hours/timezone boundaries, availability rules, allergen derivation, pricing, slot capacity, reservation rules, catering rules, phones/references/zones, search, knowledge-base consistency |
| `npm run test:integration` | 62 API tests against a real PostgreSQL `bayt_al_ghaf_test` database (reset automatically; refuses other databases): every endpoint group, concurrency, idempotency, auth, rate limits, CORS, OpenAPI |
| `npm test` | Both of the above |
| `npm run test:e2e` | 23 Playwright tests (desktop + mobile) against the production build on `bayt_al_ghaf_e2e`. Run `npm run build` first and `npx playwright install chromium` once |
| `npm run lint`, `npm run typecheck`, `npm run build` | ESLint, TypeScript, production build |
| `npm run kb:build -- --check` | Fails if the committed knowledge-base files differ from the canonical data |

Latest results are recorded in [`docs/testing.md`](docs/testing.md).

## Project structure

```
src/
  data/            canonical seed content: restaurant profile & settings, menu, ingredients, sauces, calendar, policy facts
  domain/          pure business rules (no I/O): time/hours, availability, allergens/diets, pricing, order timing & capacity,
                   reservations, catering, delivery zones, statuses, search, feeding suggestions
  server/
    api/           Hono app mounted at /api: middleware (request ids, CORS, limits, auth, idempotency), routes, OpenAPI
    contracts/     zod request/response schemas (validation + OpenAPI)
    services/      application services: menu, reservations, orders, catering, knowledge, restaurant, admin
    repositories/  database ↔ domain mapping
    auth/          API keys, sessions, passwords, customer-record verification
  knowledge/       knowledge-base generators, FAQ, agent scenarios, search index
  app/             Next.js App Router pages (public site, admin) and the API mount
  components/      UI components (design system, menu, order, reservations, admin)
prisma/            schema, migrations (incl. exclusion constraint), seed
scripts/           knowledge build, OpenAPI/docs export, API examples, test-database reset
docs/              restaurant knowledge base, API docs, integration guide & examples, architecture, testing, report
tests/             unit, integration (API + PostgreSQL), e2e (Playwright)
```

More detail: [`docs/architecture.md`](docs/architecture.md).

## Deployment

1. Provision PostgreSQL 16 (the migration enables `btree_gist`; the database user needs permission to create it, or enable it beforehand).
2. Set the environment variables above with real secrets (`APP_ENV=production` or `staging`).
3. Build and run the Docker image, or run it as a systemd service with `deploy/deploy.sh` (releases in `/opt/bayt-al-ghaf`, health-checked restarts, rollback — see [`docs/deployment.md`](docs/deployment.md)). Put it behind a TLS-terminating reverse proxy; set `TRUST_PROXY=true` there.
4. Seed once (`npm run db:seed -- --no-sample`, or `RUN_SEED_ON_START=true` on first start), sign in to `/admin`, change the seeded passwords, create the voice assistant's API key.
5. Monitor `GET /api/health`; logs are JSON lines on stdout with request IDs.

Production URLs, credentials and network settings are intentionally **not** defined here — see [`docs/integration/handoff-checklist.md`](docs/integration/handoff-checklist.md).

## Documentation map

| Path | Contents |
| --- | --- |
| `docs/restaurant-knowledge/` | Knowledge base: profile, menu catalogue, ingredients & sauces, allergens, reservations, ordering, delivery, catering, directions, special days, FAQ, policies & edge cases, agent test scenarios, voice-agent reference, data dictionary, index |
| `docs/api/` | `openapi.json`, `api-reference.md`, `error-codes.md`, `examples.md` (real responses), `voice-agent-integration.md` (workflows) |
| `docs/integration/` | External agent integration guide, handoff checklist, runnable examples |
| `docs/deployment.md` | Running as a systemd service: layout, first-time setup, redeploy, rollback, operations |
| `docs/architecture.md` | Design, data flow, single source of truth, concurrency, security |
| `docs/testing.md` | How to test and the latest results |
| `docs/implementation-report.md` | Implemented / tested / simulated / not available, limitations, next steps |

Regenerate generated docs after changing data or routes: `npm run docs:build` (knowledge base + OpenAPI/API reference/error codes) and, with a test database, `npx tsx scripts/generate-api-examples.ts`.

## Known limitations

See [`docs/implementation-report.md`](docs/implementation-report.md#known-limitations). In short: no online payments (by design), rate limiting and verification lockouts are in-memory per process, no e-mail/SMS notifications, map is illustrative, Islamic-calendar dates are provisional until confirmed in the admin, photos are stand-ins, and admin editing of ingredients/sauces is not provided in the UI (seed data only).
