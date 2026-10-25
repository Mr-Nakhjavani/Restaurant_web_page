# Implementation report

Status of the Bayt Al Ghaf restaurant system as delivered. "Tested" means covered by the automated suites in [`testing.md`](./testing.md) (all passing); "simulated" means deliberately fake for this test environment.

## 1. Implemented and tested

| Capability | Where | Tests |
| --- | --- | --- |
| Restaurant identity, address, contacts, hours (weekly + Ramadan/Eid overrides + closures), location, transportation, policies | `src/data/restaurant.ts`, `GET /restaurant*`, Home/Visit pages | unit + integration + e2e |
| 46-dish menu with Arabic names, aliases, descriptions, portions, ingredients with quantities, sauces, derived allergens & diets, spice & adjustments, prep times, customisations, fulfilment & catering flags, daily limits, rules, pairings, Q&A | `src/data/menu`, `GET /menu*`, Menu & dish pages | unit + integration + e2e |
| 19 sauces/marinades/spice blends/toppings/syrups with full batch composition (incl. three named house preparations and nested bezar); 113 ingredients | `src/data/sauces.ts`, `ingredients.ts`, `GET /sauces`, `/ingredients` | unit + integration |
| Special-day rules enforced server-side in Dubai time (weekday specials, Friday platter, weekend breakfast, Ramadan iftar with cut-off & minimum, National Day pre-order window & notice, winter dessert date range, no breakfast in Ramadan) | `src/domain/availability.ts` | unit + integration |
| Search tolerant of transliterations and descriptions; FAQ and knowledge search | `src/domain/search.ts` | unit + integration + e2e |
| Reservations: availability, create, read (verified), modify, cancel; durations, areas, terrace season, majlis rules, walk-in tables, wheelchair tables, large-group confirmation, duplicates, closures, alternatives, other dates | `reservation-service.ts`, Reservations pages | unit + integration + e2e |
| Race-safe table allocation (advisory lock + exclusion constraint) | `locks.ts`, migration | integration (concurrency) |
| Orders: pickup, delivery (zones A–C, fees, minimums, UAE mobile), dine-in pre-order linked to reservations; server pricing; lead time; slot capacity; daily limits; ASAP; quote endpoint; manual review; duplicate protection; idempotency; modify; cancel; statuses; staff transitions; removing unavailable lines | `order-service.ts`, Order/Checkout/Confirmation/Track pages | unit + integration + e2e |
| Catering: quotes with notice tiers, item limits, daily capacity, discounts, deposit, delivery zones (incl. catering-only zone D), alternatives, escalation; orders from quotes (always pending), price lock, expiry | `bulk-service.ts`, Catering page | unit + integration |
| Feeding suggestions ("cheapest way to feed N") | `feeding.ts`, `GET /menu/feeding-suggestions` | unit + integration |
| Knowledge base: 16 generated documents + FAQ/scenario JSON, live API rendering, drift check | `src/knowledge`, `docs/restaurant-knowledge` | unit + integration |
| Back office: login, roles, dashboard, orders, reservations, menu prices/availability, calendar & closures, settings, API keys, audit log | `src/app/admin`, `/api/v1/admin/*` | integration + e2e |
| API: versioned REST, OpenAPI 3.1 + Swagger UI, error catalogue, request IDs, CORS allowlist, rate limits, body limit, structured logs, health, idempotency, customer-record verification with lockout | `src/server/api` | integration |
| Documentation: README, architecture, testing, API reference, error codes, real examples, voice-agent workflows, integration guide, handoff checklist, runnable client examples | `docs/` | examples executed manually; generated docs drift-checked |
| Docker image and Compose stack | `Dockerfile`, `docker-compose.yml` | built and smoke-tested manually |

## 2. Simulated (by design)

| Item | Behaviour |
| --- | --- |
| The restaurant itself | Fictional; address, phone numbers (555 pattern), e-mails (`.example`), prices and policies are invented and consistent. Clearly labelled on the site, in the API (`fictional: true`) and in every document. |
| Payments | No online payment. Orders are "pay on collection / on delivery / at the table"; catering deposits are described as arranged by the team. No card fields exist anywhere. |
| Kitchen progress | With `SIMULATE_KITCHEN_PROGRESS=true`, confirmed orders advance to preparing → ready/out for delivery → (delivery) completed as their times pass, so status can be tested without staff. |
| Test clock | With `ENABLE_TEST_CLOCK=true` (refused when `APP_ENV=production`), requests may send `X-Test-Now` to simulate another moment. |
| Islamic calendar | Ramadan 2027 and Eid Al Fitr 2027 dates are provisional (moon sighting) and flagged as such; editable in the admin. |
| Map and coordinates | Illustrative SVG map; coordinates are approximate Al Seef promenade values for testing. |
| Photography | Openly licensed (CC0/CC BY/CC BY-SA) stand-in photos from Wikimedia Commons and Flickr, resized/cropped; many depict similar rather than identical dishes. Credits at `/credits` and `public/images/credits.json`. |
| Sample bookings | `npm run db:seed` adds a few fictional reservations/orders around the seed date (skipped when data exists or with `--no-sample`). |

## 3. Not implemented / unavailable

- The voice assistant, telephony, speech, and any connection to the existing assistant server (explicitly out of scope).
- Online card payments, refunds processing, invoices.
- E-mail/SMS/WhatsApp notifications (confirmations are shown on screen and returned by the API).
- Customer accounts and cross-device order history (recent orders are remembered per browser via local storage; lookup works anywhere with reference + phone).
- Admin UI for editing ingredients, sauces, categories, tables and creating new dishes (seed data; prices/availability/texts/limits are editable via UI or API).
- Table-plan/floor-map UI and table merging; reservations use single tables (a long table and majlis rooms cover large groups).
- Waitlists and walk-in queue management.
- Multi-language UI (English with Arabic names/phrases; no full Arabic translation or RTL layout).

## 4. Known limitations

- **Rate limiting and verification lockouts are in-memory per process.** With several instances, move them to a shared store (Redis) — the middleware is isolated in `src/server/api/middleware/rate-limit.ts` and `src/server/auth/verification.ts`.
- **Single-restaurant model.** One settings row, one kitchen capacity model.
- **Capacity model is portion-based per 15-minute slot**, not station-level; catering capacity is a daily portion pool.
- **Reservations end before midnight**: the model has no service day crossing midnight (Ramadan hours were set to close at 24:00 accordingly).
- **Knowledge search is lexical (BM25 with synonyms/variants)**, not semantic; it is deterministic and adequate for the curated documents, but very free-form paraphrases may need the FAQ or document lists.
- **Docker image size (~2 GB)**: it keeps the full toolchain so migrations and the TypeScript seed can run in the container. A slimmer image (Next.js standalone output + compiled seed) is a straightforward follow-up.
- **Swagger UI loads its assets from the jsDelivr CDN**; the OpenAPI JSON itself is served locally.
- Admin date filters and some admin tables are functional rather than polished; the public site received the design effort.
- The test clock affects business rules and new record timestamps, not database-generated timestamps on later updates.

## 5. Suggested next steps

1. Deploy a staging environment (TLS, `APP_ENV=staging`, real secrets) and issue the voice assistant's `agent` key — see [`integration/handoff-checklist.md`](./integration/handoff-checklist.md).
2. Run the 30 agent scenarios (`GET /api/v1/knowledge/scenarios`) as an evaluation set against the assistant.
3. Add Redis-backed rate limiting/lockouts if more than one instance is deployed.
4. Add notifications (SMS/WhatsApp) for confirmations and status changes, behind a feature flag.
5. Admin editing for ingredients/sauces/new dishes with the same validation used by the seed.
6. Commission real photography to replace the stand-ins.
