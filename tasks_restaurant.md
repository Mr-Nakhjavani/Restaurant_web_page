# Bayt Al Ghaf — task log

Project key **BAG** · Repository `/root/restaurant` · Reporter: coreteam · Assignee: Claude

Every piece of work done on the project, written as Jira issues: type, status, priority, labels, description, acceptance criteria, work log and resolution. Dates are server-local (Asia/Tehran, UTC+03:30). Time spent was not tracked, so work-log entries record what was done and when, not hours.

**Types:** Epic · Story · Task · Bug · Sub-task  **Statuses:** To Do · In Progress · Blocked · Done  **Priorities:** Highest · High · Medium · Low

## Board

| Key | Type | Title | Status | Priority | Updated |
| --- | --- | --- | --- | --- | --- |
| BAG-1 | Epic | Restaurant website, backend and voice-agent integration package | Done | Highest | 2026-10-25 |
| BAG-2 | Story | Canonical restaurant data: profile, settings, menu, ingredients, sauces, tables, calendar | Done | Highest | 2026-10-25 |
| BAG-3 | Story | Business-rules engine (hours, availability, allergens, pricing, timing, reservations, catering) | Done | Highest | 2026-10-25 |
| BAG-4 | Story | PostgreSQL schema, migrations and seed | Done | Highest | 2026-10-25 |
| BAG-5 | Story | Versioned REST API `/api/v1` with OpenAPI | Done | Highest | 2026-10-25 |
| BAG-6 | Story | Public website | Done | High | 2026-10-25 |
| BAG-7 | Story | Back office (`/admin`) | Done | High | 2026-10-25 |
| BAG-8 | Story | Knowledge base (16 documents, FAQ, agent scenarios) | Done | High | 2026-10-25 |
| BAG-9 | Story | Voice-agent integration guide, handoff checklist and example clients | Done | High | 2026-10-25 |
| BAG-10 | Story | Automated tests: unit, integration, end-to-end | Done | Highest | 2026-10-25 |
| BAG-11 | Story | Docker image and Compose stack | Done | Medium | 2026-10-25 |
| BAG-12 | Task | Openly licensed photography and credits page | Done | Medium | 2026-10-24 |
| BAG-13 | Task | README, architecture, testing and implementation report | Done | High | 2026-10-25 |
| BAG-14 | Bug | “No raisins” option did not remove sulphites | Done | High | 2026-10-24 |
| BAG-15 | Bug | Machboos spice option contradicted the recipe | Done | Medium | 2026-10-24 |
| BAG-16 | Bug | Search ranked Camel Machboos first for “rice meat dried lemon” | Done | Medium | 2026-10-24 |
| BAG-17 | Bug | Trace allergens of sauces (Al Ghaf House Green) were not shown on dishes | Done | High | 2026-10-25 |
| BAG-18 | Bug | Duplicate-order check compared real time with the test clock | Done | Medium | 2026-10-25 |
| BAG-19 | Bug | Production build failed on placeholder secret | Done | High | 2026-10-25 |
| BAG-20 | Bug | Horizontal scrolling on mobile pages | Done | Medium | 2026-10-25 |
| BAG-21 | Bug | Integration test files ran in parallel on one database | Done | Medium | 2026-10-25 |
| BAG-22 | Bug | Log `time` field overwritten by request fields | Done | Low | 2026-10-24 |
| BAG-23 | Bug | Generated API examples showed the test API key | Done | High | 2026-10-25 |
| BAG-24 | Task | Silence duplicate-key errors from idempotency inserts | Done | Low | 2026-10-25 |
| BAG-25 | Task | Initialise git and commit the project | Done | High | 2026-10-25 |
| BAG-26 | Bug | `npm run dev` fails with `EADDRINUSE` on port 3000 | Done | High | 2026-10-25 |
| BAG-27 | Task | Deliver the API documents | Done | High | 2026-10-25 |
| BAG-28 | Story | Deploy as a systemd service | Done | Highest | 2026-10-25 |
| BAG-29 | Bug | Deploy script copied a symlink instead of the Node.js runtime | Done | High | 2026-10-25 |
| BAG-30 | Bug | Copied Node.js runtime owned by an unknown user (uid 1001) | Done | Medium | 2026-10-25 |
| BAG-31 | Task | Single folder and zip of all documents, with a copy command | Done | Medium | 2026-10-25 |
| BAG-32 | Task | Command to copy the documents to the desktop | Done | Low | 2026-10-25 |
| BAG-33 | Story | RAG / GraphRAG knowledge corpus with evaluation questions | Done | Highest | 2026-10-25 |
| BAG-34 | Task | Jira-style task log (this file) | Done | Medium | 2026-10-25 |
| BAG-35 | Task | HTTPS in front of the public site | To Do | High | 2026-10-25 |
| BAG-36 | Task | Shared store for rate limits and look-up lockouts | To Do | Low | 2026-10-25 |
| BAG-37 | Story | SMS / WhatsApp notifications for bookings and orders | To Do | Low | 2026-10-25 |
| BAG-38 | Story | Back-office editing of ingredients, sauces and new dishes | To Do | Low | 2026-10-25 |
| BAG-39 | Task | Slimmer Docker image | To Do | Low | 2026-10-25 |
| BAG-40 | Task | Replace stand-in photography | To Do | Low | 2026-10-25 |
| BAG-41 | Task | Reset the development database | Done | Low | 2026-10-25 |
| BAG-42 | Bug | Awkward generated wording in corpus documents | Done | Medium | 2026-10-25 |
| BAG-43 | Bug | Allergen matrix produced a 1,131-word chunk | Done | Medium | 2026-10-25 |
| BAG-44 | Bug | Two evaluation questions had identical wording | Done | Low | 2026-10-25 |
| BAG-45 | Bug | Must-not-say phrases too broad for automatic scoring | Done | Medium | 2026-10-25 |
| BAG-46 | Task | Separate RAG export folder, zip and copy command | Done | High | 2026-10-25 |

---

## BAG-1 · Restaurant website, backend and voice-agent integration package

| Field | Value |
| --- | --- |
| Type | Epic |
| Status | Done |
| Priority | Highest |
| Labels | website, backend, api, integration |
| Created / Resolved | 2026-10-24 / 2026-10-25 |
| Children | BAG-2 … BAG-24 |
| Commit | `4cd4c49` |

**Summary:** Build a complete, production-quality website and backend for a Dubai restaurant, to be used as a realistic test environment for an existing external AI voice assistant.

**Description:** One Next.js 15 application (TypeScript) serving the public website, the back office and a versioned REST API, on PostgreSQL 16. Original premium Gulf design; English with Arabic names; AED prices. The voice assistant itself, telephony and any change to the assistant's server were explicitly out of scope; the project provides the API, knowledge base and integration documents it needs.

**Acceptance criteria:**
- [x] All required pages, menu with 30–45+ dishes, reservations, online ordering with pickup/delivery/dine-in pre-order, catering, admin with authentication
- [x] Special-day rules enforced on the server in Dubai time
- [x] Versioned API with OpenAPI, consistent errors, validation, auth, rate limits, idempotency, CORS allowlist, logs, health
- [x] Knowledge base and integration handoff documents
- [x] Lint, typecheck, build and all test suites pass

**Work log:**
- 2026-10-24 — Set up the toolchain (Node.js 22 installed locally, PostgreSQL 16 in Docker on port 5433), project skeleton, data model.
- 2026-10-24 — Canonical data, business rules, database, API, website, admin (BAG-2 … BAG-7).
- 2026-10-25 — Knowledge base, integration documents, tests, Docker, documentation (BAG-8 … BAG-13); final verification.
- 2026-10-25 14:02 — Committed as `4cd4c49`.

**Resolution:** Done. 74 unit, 62 integration and 23 end-to-end tests pass; lint 0 problems; typecheck 0 errors; production build OK; Docker image smoke-tested.

---

## BAG-2 · Canonical restaurant data

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Parent | BAG-1 |
| Labels | data, menu |
| Components | `src/data` |

**Summary:** Define the restaurant as code so every page, API response and document comes from one source.

**Description:** Profile (Bayt Al Ghaf, Al Seef, Bur Dubai; contacts on the 555 pattern and `.example` addresses), operating settings (hours, ordering, delivery zones A–D, reservations, catering), 31 tables in four seating areas, calendar (winter season, National Day, Ramadan 2027 provisional, Eid Al Fitr, closures), 46 dishes in 11 sections, 113 ingredients, 19 sauces/marinades/spice blends including the named house preparations, and policy facts. A validator checks every reference.

**Acceptance criteria:**
- [x] Every dish has ID/slug, Arabic name, ingredients with quantities, sauces, allergens (derived), diet, spice, prep time, fulfilment, catering and availability rules
- [x] Every sauce fully defined, including nested preparations
- [x] `validateCanonicalData()` reports zero problems

**Work log:**
- 2026-10-24 — Wrote profile, settings, floor plan, calendar, ingredients, sauces, menu files.
- 2026-10-24 — Added validation; fixed hashu/raisins and machboos spice inconsistencies (BAG-14, BAG-15).
- 2026-10-25 — Added `mayContain` to sauces (BAG-17).

**Resolution:** Done.

---

## BAG-3 · Business-rules engine

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Parent | BAG-1 |
| Labels | domain, rules |
| Components | `src/domain` |

**Summary:** Pure, unit-tested functions for every rule the restaurant enforces.

**Description:** Dubai-time handling and opening hours with special periods and partial closures; item availability rules (days of week, time windows, date ranges, special periods, order types, notice, cut-offs, pre-order opening dates, minimum quantity, channels, sold out, paused, daily limits); allergen and diet derivation through nested sauces; server-side pricing; order lead time and 15-minute slot capacity; reservation durations, seating areas, terrace season, majlis rules, table choice; catering notice tiers, discounts, deposits, capacity; delivery zones; order and reservation state machines; BM25 search with transliterations; “cheapest way to feed N”.

**Acceptance criteria:**
- [x] The same functions guard the website, API and documents
- [x] Unit tests cover boundary cases (midnight in Dubai, Ramadan, Friday-only, notice, capacity)

**Work log:**
- 2026-10-24 — Implemented all modules; fixed search ranking (BAG-16).

**Resolution:** Done.

---

## BAG-4 · PostgreSQL schema, migrations and seed

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Parent | BAG-1 |
| Labels | database |
| Components | `prisma/` |

**Summary:** Persistent store for menu, settings, calendar, reservations, orders, catering quotes, idempotency, admin users, API keys and audit log.

**Description:** Prisma 6 schema; migration `20261024192807_init` plus a PostgreSQL exclusion constraint (`btree_gist`) that makes double-booking a table impossible; migration `20261024203732_sauce_may_contain`. Seed script for reference data, accounts and optional sample bookings.

**Acceptance criteria:**
- [x] Concurrent bookings for the last table: exactly one succeeds (tested)
- [x] Seed is repeatable and skips sample data when records exist

**Work log:**
- 2026-10-24 22:58 — Initial migration with exclusion constraint.
- 2026-10-25 00:07 — Sauce trace-allergen migration.

**Resolution:** Done.

---

## BAG-5 · Versioned REST API `/api/v1`

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Parent | BAG-1 |
| Labels | api, security |
| Components | `src/server` |

**Summary:** The API the external voice assistant uses: 57 paths with OpenAPI 3.1 and Swagger UI.

**Description:** Restaurant info, hours, location, policies, delivery checks, menu, search, specials, availability, ingredients, sauces, feeding suggestions, reservations, orders, catering quotes and orders, FAQ, knowledge search/documents/scenarios, admin. Error catalogue with agent guidance; request IDs; CORS allowlist; 64 KB body limit; rate limits; idempotency keys; API keys with scopes; admin sessions; customer-record verification (reference + phone or token, lockout after 5 failures); structured JSON logs; health endpoint; optional test clock (`X-Test-Now`).

**Acceptance criteria:**
- [x] Every request and response validated by zod and described in OpenAPI
- [x] No customer data on public endpoints
- [x] An order or booking is only reported confirmed after the backend accepts it

**Work log:**
- 2026-10-24 — Routes, middleware, auth.
- 2026-10-25 — Fixed noisy idempotency logs (BAG-24), duplicate detection with the test clock (BAG-18), lazy app creation for the build (BAG-19).

**Resolution:** Done.

---

## BAG-6 · Public website

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | High |
| Parent | BAG-1 |
| Labels | frontend, design |
| Components | `src/app/(site)`, `src/components` |

**Summary:** Home, menu (search, filters, dish pages), order (cart, checkout, confirmation, tracking), reservations (book, confirm, manage), catering, about, visit, FAQ, credits.

**Description:** Tailwind CSS 4 design tokens (sand, cream, date-brown, charcoal, brass), Cormorant Garamond / Jost / Amiri, Gulf-arch frames and an Al Sadu band. Responsive down to 360 px, keyboard accessible.

**Acceptance criteria:**
- [x] No horizontal scrolling on phones (fixed in BAG-20)
- [x] Menu prices equal API prices (end-to-end test)

**Work log:**
- 2026-10-24 — Pages and components.
- 2026-10-25 — Mobile fixes (BAG-20).

**Resolution:** Done.

---

## BAG-7 · Back office (`/admin`)

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | High |
| Parent | BAG-1 |
| Labels | admin |

**Summary:** Staff and admin screens: dashboard, orders, reservations, menu prices and availability, calendar and closures, settings, API keys, audit log.

**Acceptance criteria:**
- [x] Roles `admin` and `staff`; staff cannot change prices or settings
- [x] Marking a dish sold out is reflected in the public API (end-to-end test)

**Work log:**
- 2026-10-24 — Implemented.

**Resolution:** Done.

---

## BAG-8 · Knowledge base

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | High |
| Parent | BAG-1 |
| Labels | docs, knowledge |
| Components | `src/knowledge`, `docs/restaurant-knowledge` |

**Summary:** 16 generated documents (all 14 required), 76 FAQ entries and 30 adversarial agent scenarios, served live by the API and committed as snapshots with a drift check.

**Work log:**
- 2026-10-25 — Generators, FAQ, scenarios, search; drift check in unit tests.

**Resolution:** Done. Superseded for RAG use by the corpus in BAG-33.

---

## BAG-9 · Voice-agent integration guide, handoff checklist and example clients

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | High |
| Parent | BAG-1 |
| Labels | docs, integration |

**Summary:** `docs/integration/external-agent-integration.md`, `docs/integration/handoff-checklist.md`, `docs/api/voice-agent-integration.md`, real request/response examples, and curl, Node.js and Python clients.

**Acceptance criteria:**
- [x] Unknown deployment details are placeholders, not invented
- [x] All three example clients run end to end against a local server

**Work log:**
- 2026-10-25 — Written and executed; key hidden in examples (BAG-23).

**Resolution:** Done.

---

## BAG-10 · Automated tests

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Parent | BAG-1 |
| Labels | qa |
| Components | `tests/` |

**Summary:** Vitest unit and integration suites (real PostgreSQL) and Playwright end-to-end tests on desktop and mobile.

**Acceptance criteria:**
- [x] Unit 74/74, integration 62/62, end-to-end 23/23 (12 desktop, 11 mobile)
- [x] 2026-10-25: unit suite grew to 86/86 with the RAG corpus tests (BAG-33)

**Work log:**
- 2026-10-25 — Suites written; fixed parallel test files (BAG-21) and selector/phone collisions.

**Resolution:** Done. Details in `docs/testing.md`.

---

## BAG-11 · Docker image and Compose stack

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Medium |
| Parent | BAG-1 |
| Labels | devops |

**Summary:** `Dockerfile`, `docker-compose.yml` (database, optional app profile), entrypoint running migrations and seed.

**Work log:**
- 2026-10-25 — Built `bayt-al-ghaf:local` (about 2 GB) and smoke-tested: health 200, pages 200.

**Resolution:** Done. Slimming tracked in BAG-39.

---

## BAG-12 · Openly licensed photography and credits page

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Parent | BAG-1 |
| Labels | content, design |

**Summary:** 58 stand-in photos from Wikimedia Commons and Openverse (CC0 / CC BY / CC BY-SA), resized and colour-graded, credited at `/credits` and in `public/images/credits.json`.

**Work log:**
- 2026-10-24 23:25 — Images and credits added (the Unsplash API needed a key, so open sources were used).

**Resolution:** Done. Replacement tracked in BAG-40.

---

## BAG-13 · README, architecture, testing and implementation report

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | High |
| Parent | BAG-1 |
| Labels | docs |

**Summary:** `README.md`, `docs/architecture.md`, `docs/testing.md`, `docs/implementation-report.md`.

**Work log:**
- 2026-10-25 00:44 — Written with implemented / simulated / not-available sections.

**Resolution:** Done.

---

## BAG-14 · “No raisins” option did not remove sulphites

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | High |
| Parent | BAG-2 |
| Labels | allergens |

**Summary:** Choosing “Hashu without raisins” on machboos still listed sulphites.

**Description:** The raisins live inside the hashu topping (a nested preparation), and option removals only applied to the dish's own ingredient list.

**Work log:**
- 2026-10-24 — `composeItem` now applies removals to ingredients inside sauces; the validator checks sauce contents too; unit test added.

**Resolution:** Fixed.

---

## BAG-15 · Machboos spice option contradicted the recipe

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-2 |

**Summary:** Machboos offered a “less chilli” option although the rice is cooked in bezar-seasoned stock and cannot be made milder.

**Work log:**
- 2026-10-24 — Removed the chilli group, set `canReduce: false` and explained that heat comes from the dakkus on the side.

**Resolution:** Fixed.

---

## BAG-16 · Search ranked Camel Machboos first for “rice meat dried lemon”

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-3 |
| Labels | search |

**Work log:**
- 2026-10-24 — Added a diet-words field, removed a misleading alias, boosted permanent and signature dishes; test added.

**Resolution:** Fixed — Lamb Machboos ranks first.

---

## BAG-17 · Trace allergens of sauces were not shown on dishes

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | High |
| Parent | BAG-2 |
| Labels | allergens |

**Summary:** Al Ghaf House Green is made on the same blender as the walnut House Red, but dishes served with it showed no tree-nut trace warning.

**Work log:**
- 2026-10-25 — Added `mayContain` to sauces (data, database column, migration `20261024203732_sauce_may_contain`) and propagated it through nested preparations.

**Resolution:** Fixed.

---

## BAG-18 · Duplicate-order check compared real time with the test clock

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-5 |

**Work log:**
- 2026-10-25 — Orders, catering orders and reservations now store `createdAt` from the request's logical “now”.

**Resolution:** Fixed.

---

## BAG-19 · Production build failed on placeholder secret

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | High |
| Parent | BAG-5 |
| Labels | build |

**Description:** `next build` imported the API module, which validated configuration at import time and refused the placeholder session secret.

**Work log:**
- 2026-10-25 — The API app is created lazily on first request; strict secret checks keyed to `APP_ENV=production`; Compose requires a real secret.

**Resolution:** Fixed.

---

## BAG-20 · Horizontal scrolling on mobile pages

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-6 |
| Labels | mobile |

**Work log:**
- 2026-10-25 — Fixed the header button, logo width, FAQ and catering grids (`min-w-0`) and the credits table (`overflow-x-auto`); end-to-end test checks 10 pages at phone width.

**Resolution:** Fixed.

---

## BAG-21 · Integration test files ran in parallel on one database

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-10 |

**Work log:**
- 2026-10-25 — Integration project runs with `--no-file-parallelism`; global setup seeds its own `_test` database.

**Resolution:** Fixed.

---

## BAG-22 · Log `time` field overwritten by request fields

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Low |
| Parent | BAG-5 |

**Work log:**
- 2026-10-24 — Base fields are written after request fields; the request's own field renamed `startTime`.

**Resolution:** Fixed.

---

## BAG-23 · Generated API examples showed the test API key

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | High |
| Parent | BAG-9 |
| Labels | security, docs |

**Work log:**
- 2026-10-25 — Examples render `Authorization: Bearer $KEY`.

**Resolution:** Fixed.

---

## BAG-24 · Silence duplicate-key errors from idempotency inserts

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | Low |
| Parent | BAG-5 |

**Work log:**
- 2026-10-25 — Idempotency records use `createMany({ skipDuplicates: true })`.

**Resolution:** Done.

---

## BAG-25 · Initialise git and commit the project

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | High |
| Labels | git |
| Commit | `4cd4c49` |

**Summary:** Put the project under version control.

**Description:** `git init -b main`; repository-local author `coreteam <coreteam@intelcad.ai>`; `.env`, `node_modules`, build output and test reports excluded; secret scan before committing.

**Work log:**
- 2026-10-25 14:02 — 282 files committed as `4cd4c49`; working tree clean. No remote, nothing pushed.

**Resolution:** Done.

---

## BAG-26 · `npm run dev` fails with `EADDRINUSE` on port 3000

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | High |
| Labels | dev-experience |
| Commit | `4cd4c49` |

**Summary:** Running the README quick start failed because port 3000 was already in use.

**Description:** Root cause: the production server started during final verification was still running on port 3000. Requirement from the reporter: everything already running on the server must keep running. A plain dev server on another port would also have overwritten the `.next` build the running server serves.

**Acceptance criteria:**
- [x] Running services untouched
- [x] Dev server can run alongside a production server without breaking it

**Work log:**
- 2026-10-25 — `npm run dev` / `npm start` honour `PORT`; new `NEXT_DIST_DIR` setting gives the dev server its own build folder; README updated.
- 2026-10-25 — Verified: dev on 3001 and production on 3000 side by side; production build files byte-for-byte unchanged; test dev server stopped by PID.
- 2026-10-25 — Lint, typecheck, 74 unit and 62 integration tests re-run: pass.

**Resolution:** Fixed. Since BAG-28 the port belongs to the service; use `PORT=3001 npm run dev`.

---

## BAG-27 · Deliver the API documents

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | High |
| Labels | docs, api |

**Summary:** Send the API documentation to the reporter.

**Work log:**
- 2026-10-25 — Sent `external-agent-integration.md`, `voice-agent-integration.md`, `api-reference.md`, `error-codes.md`, `examples.md`, `openapi.json`, `handoff-checklist.md` and a zip of `docs/`. Confirmed the live OpenAPI (57 paths) matches the file.

**Resolution:** Done.

---

## BAG-28 · Deploy as a systemd service

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Labels | devops, deployment |
| Components | `deploy/`, `docs/deployment.md` |
| Commits | `bc20bdd`, `8be0f27`, `3c3d840` |
| Sub-tasks / bugs | BAG-29, BAG-30 |

**Summary:** Run the site as a service that starts at boot, restarts after crashes and can be redeployed safely.

**Description:** Service `bayt-al-ghaf` running as unprivileged user `baytalghaf` with a private Node.js 22 runtime in `/opt/bayt-al-ghaf/node` (system Node 18 untouched) and systemd hardening. Releases built from git commits into `/opt/bayt-al-ghaf/releases/<date>-<commit>` with a `current` symlink; `deploy/deploy.sh` builds while the old release serves, migrates, seeds only an empty database, restarts, health-checks and switches back if unhealthy; `--rollback`, `--no-start`. Dedicated database `bayt_al_ghaf_live` and role `bayt_live`; new random session secret, admin/staff passwords and voice-agent API key in root-only files in `/etc/bayt-al-ghaf/`. `APP_ENV=staging` with the test clock and kitchen simulation on.

**Acceptance criteria:**
- [x] Enabled at boot; restarts automatically after a crash (tested: back in 7 s)
- [x] Switch-over with minimal downtime (2.2 s)
- [x] Other services on the server (Asterisk, hamsokhan, nginx, uvicorn apps, other containers) untouched
- [x] Public dev API key rejected on the live site; new agent key works; admin endpoints refuse the agent key
- [x] No secrets printed or committed

**Work log:**
- 2026-10-25 — Surveyed the server (running services, ports, firewall, disk); confirmed nothing external used the old server or database.
- 2026-10-25 14:30 — Unit, deploy script, docs export script, config template and `docs/deployment.md` committed (`bc20bdd`).
- 2026-10-25 14:30 — Created `/etc/bayt-al-ghaf/` config, database role and database; first release built with `--no-start` while the old server kept serving.
- 2026-10-25 14:32 — Fixed BAG-29 and rebuilt (`8be0f27`); fixed BAG-30 (`3c3d840`).
- 2026-10-25 14:34 — Preflight of the new release under the same sandbox on port 3002: pages, API, images and database OK.
- 2026-10-25 14:34 — Stopped the old hand-started server by PID and started the service: healthy after 2.2 s.
- 2026-10-25 14:35 — Created the voice-agent API key through the admin API and stored it in `/etc/bayt-al-ghaf/credentials.txt`.
- 2026-10-25 — End-to-end checks (auth, menu search, availability, quotes, public address); crash-recovery test; confirmed other services still running.

**Resolution:** Done. Live at `http://193.151.150.222:3000` (plain HTTP — see BAG-35).

---

## BAG-29 · Deploy script copied a symlink instead of the Node.js runtime

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | High |
| Parent | BAG-28 |
| Commit | `8be0f27` |

**Description:** `/root/.local/node22` is a symlink; `cp -a` copied the link, which the sandboxed service (no access to `/root`) could not follow.

**Work log:**
- 2026-10-25 14:32 — Copy `readlink -f` of the source; reinstall when the target is a symlink.

**Resolution:** Fixed.

---

## BAG-30 · Copied Node.js runtime owned by an unknown user (uid 1001)

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-28 |
| Commit | `3c3d840` |

**Work log:**
- 2026-10-25 14:34 — Runtime made root-owned; the script now does this after copying.

**Resolution:** Fixed.

---

## BAG-31 · Single folder and zip of all documents, with a copy command

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Labels | docs |

**Summary:** One place to copy every document to a PC.

**Work log:**
- 2026-10-25 — `deploy/export-docs.sh` writes `/root/bayt-al-ghaf-docs/` (README + `docs/`, 34 files) and `/root/bayt-al-ghaf-docs.zip`; refreshed by every deploy; verified no secrets inside. Gave `scp` commands.

**Resolution:** Done.

---

## BAG-32 · Command to copy the documents to the desktop

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | Low |

**Work log:**
- 2026-10-25 — Gave `scp` commands for Windows PowerShell (resolves the real Desktop folder, including OneDrive) and macOS/Linux, for the folder and for the zip.

**Resolution:** Done.

---

## BAG-33 · RAG / GraphRAG knowledge corpus with evaluation questions

| Field | Value |
| --- | --- |
| Type | Story |
| Status | Done |
| Priority | Highest |
| Labels | rag, graphrag, knowledge, evaluation |
| Components | `src/knowledge/rag`, `scripts/build-rag-corpus.ts`, `rag-corpus/`, `tests/unit/rag-corpus.test.ts` |
| Sub-tasks / bugs | BAG-42, BAG-43, BAG-44, BAG-45, BAG-46 |

**Summary:** Rewrite the knowledge for a RAG / GraphRAG pipeline: in-world (no “this restaurant does not exist” notes), much larger and more detailed, chunk- and graph-friendly, with exact evaluation questions, in a separate folder with a copy command.

**Description:** A generator builds, from the same data as the website: one document per dish (46), sauce or preparation (19), ingredient (113), allergen (14), diet (10), menu section (11), weekday (7), special period (4), delivery zone (4) and seating area (4), plus restaurant, location, directions, parking, contact, hours, facilities, accessibility, families, house rules, payments, hospitality, glossary, ordering, pickup, timing, pre-orders, changes, statuses, complaints, delivery areas A–Z, reservations, table times, tables, groups, catering, catering menu, calendar, closures, policy and FAQ documents. Every file has metadata front matter (id, title, type, summary, entities, tags, data version); every `##` section names its subject in the first sentence so it stands alone as a chunk. Also: pre-split chunks with context headers and entity links, a knowledge graph (JSONL, CSV, Neo4j Cypher, schema), evaluation questions with expected answers, key facts, must-not-say phrases and sources, a manifest and a README on how to ingest. Test-environment, fictional and API wording is rejected by the build.

**Acceptance criteria:**
- [x] No mention of the restaurant being fictional, of APIs or of a test environment in any document (build and test fail otherwise)
- [x] Far more detail than the original knowledge base: 286 documents, 163,016 words (was 16 documents, 61,953 words)
- [x] 2,082 chunks, median 47 words, maximum 379; each with a context header and graph entity ids
- [x] Knowledge graph: 564 nodes, 2,783 edges, each with a natural-language description
- [x] 593 evaluation questions with exact answers (169 core); 485 grounded, with 919 key facts checked verbatim against their source documents
- [x] Unit tests (12): committed files equal generator output, determinism, coverage of every entity, wording rules, ids and links resolve, chunk bounds, question grounding and must-not-say consistency
- [x] Separate export folder and zip, refreshed on deploy; copy command given (BAG-46)

**Work log:**
- 2026-10-25 — Analysed the existing generators and data; only 6 of 76 FAQ answers needed rewording (one, “Is this a real restaurant?”, removed).
- 2026-10-25 — Wrote `src/knowledge/rag/` (text helpers, document model, stable ids, shared derived facts, menu, allergen, restaurant, service, calendar and FAQ documents, graph, questions, assembly) and `npm run rag:build`.
- 2026-10-25 — First build: 286 documents, 160,139 words, 2,082 chunks, 564 nodes, 2,783 edges, 594 questions.
- 2026-10-25 — Fact checks against the recipes and rule functions (allergen sources, option effects, catering maths, hours on specific dates); verified caveats against the ingredient data instead of memory.
- 2026-10-25 — Review passes fixed BAG-42 … BAG-45; added `tests/unit/rag-corpus.test.ts`.
- 2026-10-25 — Full verification: lint, typecheck, 86 unit tests (74 + 12 new), 62 integration tests, both drift checks — all pass.
- 2026-10-25 15:30 — Exported to `/root/bayt-al-ghaf-rag/` and `/root/bayt-al-ghaf-rag.zip` (BAG-46).

**Resolution:** Done. Regenerate with `npm run rag:build` after any data change; the drift test fails until the committed corpus is up to date.

---

## BAG-34 · Jira-style task log (this file)

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Labels | project-management |

**Summary:** Record every task with type, title, description, status, summary and work log.

**Work log:**
- 2026-10-25 — Created `tasks_restaurant.md` from the project history; kept up to date with new work.

**Resolution:** Done (updated as work continues).

---

## BAG-42 · Awkward generated wording in corpus documents

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-33 |
| Labels | rag, content |

**Summary:** Review of the first build found phrasing that would read badly when a chunk is retrieved on its own.

**Description:** “Bezar is cooked into the dish in Lamb Machboos”; nested brackets in allergen sources (“the Hashu Topping (ghee (clarified butter))”); trace allergens also listed under “does not contain”; “Walnuts is…”; one-word chunks such as “None.” and list items that only made sense under their heading; empty “Spice choices: .” and “Used in: .” sentences.

**Work log:**
- 2026-10-25 — Sauce roles rewritten as “<sauce> is cooked into / spooned on top of / served on the side with <dish>”; allergen sources as “from the ghee and the Hashu Topping, which contains ghee”; “contains no …” excludes trace allergens; plural-aware verbs; list items turned into full sentences; spice and used-in sentences built from the actual options and extras.
- 2026-10-25 — Scanned all documents for artefacts (`undefined`, `NaN`, empty brackets, doubled punctuation) and broken relative links: none left.

**Resolution:** Fixed.

---

## BAG-43 · Allergen matrix produced a 1,131-word chunk

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-33 |

**Work log:**
- 2026-10-25 — Chunker splits long sections at table rows too and repeats the table header in each part: the matrix is now 4 chunks of 225–376 words.

**Resolution:** Fixed; a test caps chunks at 600 words.

---

## BAG-44 · Two evaluation questions had identical wording

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Low |
| Parent | BAG-33 |

**Description:** “Which dishes contain eggs?” was generated both from the eggs ingredient and from the eggs allergen.

**Work log:**
- 2026-10-25 — Kept the allergen version; a test now requires unique question texts.

**Resolution:** Fixed.

---

## BAG-45 · Must-not-say phrases too broad for automatic scoring

| Field | Value |
| --- | --- |
| Type | Bug |
| Status | Done |
| Priority | Medium |
| Parent | BAG-33 |
| Labels | evaluation |

**Description:** Phrases such as “safe” or “allergen-free” would also fail a correct refusal (“I can't call it safe”), and some appeared inside the expected answers themselves.

**Work log:**
- 2026-10-25 — Changed to affirmative claims (“it is safe”, “is allergen-free”, “we can guarantee”); reworded two expected answers; a test checks that no expected answer contains its own must-not-say phrases.

**Resolution:** Fixed.

---

## BAG-46 · Separate RAG export folder, zip and copy command

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | High |
| Parent | BAG-33 |
| Components | `deploy/export-rag.sh`, `deploy/deploy.sh` |

**Summary:** Put the RAG corpus in its own folder, separate from the project documentation, ready to copy to a PC in one go.

**Work log:**
- 2026-10-25 — `deploy/export-rag.sh` writes `/root/bayt-al-ghaf-rag/` (298 files, 7.4 MB) and `/root/bayt-al-ghaf-rag.zip` (1.1 MB); replaces only a folder it created; `deploy/deploy.sh` runs it after every deployment.
- 2026-10-25 15:30 — Exported; verified no secrets and no “fictional” / test wording in the documents. Gave `scp` commands for Windows and macOS/Linux.

**Resolution:** Done.

---

## BAG-35 · HTTPS in front of the public site

| Field | Value |
| --- | --- |
| Type | Task |
| Status | To Do |
| Priority | High |
| Labels | security, devops |

**Summary:** The live site is served over plain HTTP on port 3000 to the internet, so back-office passwords travel unencrypted.

**Description:** Needs a TLS reverse proxy and a hostname. nginx on this server already serves something else on port 8443, so it was not changed without the reporter's decision. After HTTPS: set `TRUST_PROXY=true` and update `APP_BASE_URL` / `CORS_ALLOWED_ORIGINS` in `/etc/bayt-al-ghaf/app.env`.

**Work log:** —

---

## BAG-36 · Shared store for rate limits and look-up lockouts

| Field | Value |
| --- | --- |
| Type | Task |
| Status | To Do |
| Priority | Low |
| Labels | scalability |

**Summary:** Limits are kept in memory per process; needed only if more than one instance runs (Redis or the database).

---

## BAG-37 · SMS / WhatsApp notifications for bookings and orders

| Field | Value |
| --- | --- |
| Type | Story |
| Status | To Do |
| Priority | Low |

**Summary:** Confirmations are shown on screen and returned by the API only; no messages are sent.

---

## BAG-38 · Back-office editing of ingredients, sauces and new dishes

| Field | Value |
| --- | --- |
| Type | Story |
| Status | To Do |
| Priority | Low |

**Summary:** Prices, availability, texts and settings are editable; ingredients, sauces, categories, tables and new dishes come from the seed data.

---

## BAG-39 · Slimmer Docker image

| Field | Value |
| --- | --- |
| Type | Task |
| Status | To Do |
| Priority | Low |

**Summary:** The image is about 2 GB because it keeps the toolchain for migrations and the TypeScript seed; Next.js standalone output plus a compiled seed would shrink it.

---

## BAG-40 · Replace stand-in photography

| Field | Value |
| --- | --- |
| Type | Task |
| Status | To Do |
| Priority | Low |

**Summary:** Many photos show similar rather than identical dishes.

---

## BAG-41 · Reset the development database

| Field | Value |
| --- | --- |
| Type | Task |
| Status | Done |
| Priority | Low |

**Summary:** The development database `bayt_al_ghaf` holds seed samples plus a few cancelled records from example runs.

**Description:** Prisma refuses an AI-initiated `prisma migrate reset` without the user's explicit consent, so it was not reset. Unblock by confirming that the development database may be wiped. The live database (`bayt_al_ghaf_live`) and the test databases are unaffected.

**Work log:**
- 2026-10-25 17:55 — Reporter asked for the reset. Checked the target: `.env` points at `bayt_al_ghaf` (development), the service uses `bayt_al_ghaf_live`, and nothing else was connected. Dev data: 12 reservations, 8 orders, 6 quotes (seed samples and test runs).
- 2026-10-25 17:55 — Backup: `/root/bayt-al-ghaf-backups/bayt_al_ghaf-dev-before-reset-20261025-175547.sql.gz` (23 tables, root-only).
- 2026-10-25 17:56 — `npx prisma migrate reset --force --skip-seed` stopped by Prisma's AI safety check, which requires a fresh confirmation given after its warning. Waiting for the reporter.
- 2026-10-25 17:59 — Reporter confirmed (“yes”). Ran `prisma migrate reset --force --skip-seed` with the confirmation, then `npm run db:seed`: both migrations re-applied, exclusion constraint present; 46 dishes, 113 ingredients, 19 sauces, 31 tables, 2 back-office users, the development API key and fresh samples (10 reservations, 4 orders, 1 quote).
- 2026-10-25 17:59 — Verified the live database is unchanged (0 reservations, 0 orders, 1 API key, 2 users) and the live site healthy (`/api/health` ok, `/menu` 200).

**Resolution:** Done. The previous contents are in the backup above.
