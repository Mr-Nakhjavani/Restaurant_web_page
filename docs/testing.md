# Testing

## How to run

| Command | Scope | Needs |
| --- | --- | --- |
| `npm run test:unit` | Pure business rules and knowledge-base consistency | Nothing (no database) |
| `npm run test:integration` | HTTP API in-process against PostgreSQL `bayt_al_ghaf_test` | `docker compose up -d db` (or set `TEST_DATABASE_URL` to any database whose name ends in `_test`; it is reset) |
| `npm test` | Both | as above |
| `npm run test:e2e` | Playwright, Chromium, desktop (1440×900) and mobile (Pixel 7) against the production server on `bayt_al_ghaf_e2e` | `npm run build` first; `npx playwright install chromium` once (plus `npx playwright install-deps chromium` on a fresh Linux host) |
| `npm run lint` / `npm run typecheck` / `npm run build` | Static checks and production build | — |
| `npm run kb:build -- --check` | Knowledge-base snapshots match the canonical data | — |

Integration tests use the test clock (`X-Test-Now`) so results do not depend on the day they run; the fixed "now" is mostly Monday 26 October 2026, 10:00 Dubai time. E2E tests use the real clock and relative dates.

## Latest results

Run on 25 October 2026 (Dubai), Node.js 22.23.4, PostgreSQL 16 (Docker), Next.js 15.5.28 production build.

| Check | Result |
| --- | --- |
| ESLint (`next/core-web-vitals`, `next/typescript`) | ✅ 0 problems |
| TypeScript `tsc --noEmit` (strict) | ✅ 0 errors |
| Knowledge-base drift check | ✅ 18 files up to date (16 documents, 61,953 words, 76 FAQ, 30 scenarios) |
| Unit tests (Vitest) | ✅ **74 / 74** passed (6 files) |
| Integration tests (Vitest + PostgreSQL) | ✅ **62 / 62** passed (5 files) |
| End-to-end tests (Playwright) | ✅ **23 / 23** passed (12 desktop, 11 mobile) |
| Production build (`next build`) | ✅ 25 routes |
| Docker image (`docker build`, then run against PostgreSQL) | ✅ migrations applied, seed ran, `/api/health` 200, home and menu pages 200 |
| Example clients (`docs/integration/examples/*`) | ✅ curl, Node.js and Python scripts ran end to end against a local server |

## What is covered

### Unit (`tests/unit`)

| File | Covers |
| --- | --- |
| `time-hours.test.ts` | `24:00` closing, 15-minute rounding, Dubai date from UTC instants at midnight, wrap-around seasons, weekly hours, Ramadan override, private-event partial closure (dining closed, takeaway open), Eid opening at 14:00, open-now and next opening |
| `availability.test.ts` | Friday-only platter (Tuesday vs Friday, next Friday), weekday boundary at midnight in Dubai time, delivery not allowed, minimum notice, breakfast window and no breakfast delivery, no breakfast in Ramadan, Iftar only in Ramadan + 14:00 cut-off + minimum 2, National Day pre-order opening + notice, seasonal dessert inclusive dates, sold-out expiry, daily limits, catering-only dishes, paused dishes, past times |
| `catalog-pricing.test.ts` | Canonical data passes all referential/consistency checks; menu size and kinds; derived allergens (lamb machboos, removing raisins removes sulphites, hidden fish in mehyawa regag, Sauce No. 7, the two house sauces), vegan derivation, trace propagation from shared equipment; server pricing with option deltas, negative deltas, invalid items/options/quantities, defaults, slugs |
| `scheduling.test.ts` | Lead time, ASAP, too-soon/off-grid/outside-hours/too-far times, delivery window and drive time, full slot with neighbouring alternatives, ordering paused; reservation durations, validation (party size, past dates, last seating, slots, majlis size/notice, terrace weather/season, private event), smallest-table choice and turnover buffer, walk-in tables never online, wheelchair-accessible tables, slot listing and minimum notice |
| `bulk-misc.test.ts` | Catering notice tiers, item-specific notice, discounts, deposits; 40 office lunches feasible; insufficient notice with alternatives; 200 machboos in 20 minutes blocked; > 250 portions; daily capacity; cooked-to-order dishes refused; UAE/international phone validation; voice-friendly references; delivery-zone matching; AED formatting & VAT; state machines; search normalisation and BM25; feeding optimiser |
| `knowledge.test.ts` | All 14 required documents exist and committed files equal generator output; every dish price appears; allergen matrix equals derived allergens; every sauce defined; settings numbers quoted; no placeholders; FAQ answers the 30 required customer questions; ≥ 15 structured agent scenarios (JSON matches); search finds the right passages |

### Integration (`tests/integration`)

| File | Covers |
| --- | --- |
| `info-menu.test.ts` | Health & request IDs, restaurant/hours (Ramadan date)/location/transport/policies, delivery checks; full menu with prices equal to canonical data; filters (category, vegan, excluded allergens, price, transliterated search); invalid filter → 400; dish detail by slug; unknown id → 404; special-day availability via API; specials by date; dish identification from a description; ingredient & sauce composition; feeding suggestions; admin price & sold-out changes reflected in the API **and** the live knowledge document |
| `reservations.test.ts` | Booking with agent key, verification (none → 401, wrong phone → 404, phone/token/staff → 200); invalid dates/party sizes/times/phone/missing phone; private-event closure; duplicate booking for same phone; full seating area → 409 with alternatives (no silent move); **8 concurrent callers for the last 8-seat terrace table → exactly 1 success**; database exclusion constraint rejects an overlapping row; large group pending → staff confirm; invalid transition 409; atomic modification, cut-off, failed change leaves booking unchanged; cancellation with late flag and table freed; idempotent replay & key reuse; availability with violations |
| `orders.test.ts` | Pickup order with server-side pricing (client price fields ignored); quote with lead time and allergens; missing customer, invalid phone; delivery address required/not served/catering-only zone/below minimum/UAE mobile required/success with fee and window; pickup without address; invalid quantity/customisation/unknown item/catering-only/requires-bulk; special-day refusal with next date & alternatives, breakfast at lunch; too-soon, outside hours, off-grid, too far; slot capacity full with neighbouring slots; harees daily limit; idempotent replay and duplicate-order detection; manual review for high totals; modification re-priced, 50-meal change refused with order unchanged, cut-off; cancellation before/after preparation; staff status transitions and invalid transition; removing an unavailable line re-totals; dine-in pre-order linked to reservation (missing/mismatch/success, cancelled with the reservation); allergy-note flag |
| `bulk.test.ts` | 40 office lunches feasible → pending catering order (`CAT-`), quote reuse refused; 100 portions with 30 h notice → needs changes + alternatives, order refused; 200 machboos in 20 minutes → not possible + escalation; > 250 portions; daily capacity across orders; ouzi notice & daily maximum; quote expiry after 48 h; cooked-to-order dish refused |
| `knowledge-auth.test.ts` | Knowledge documents (JSON/Markdown), search, FAQ by category & search, scenarios; admin endpoints 401/403 by scope, staff cannot change prices or settings, invalid key; session login, HttpOnly cookie, bad credentials, CSRF origin check; settings validation + audit log + live effect (terrace closed); API key create/revoke (never listed); verification lockout after 5 failures; consistent errors (unknown route, invalid JSON, 413 payload, query validation); rate limiting with `Retry-After`; CORS allowlist; OpenAPI 3.1 contains every required path |

### End-to-end (`tests/e2e`, desktop + mobile)

Home page content and CTAs; navigation to every main page (desktop nav and mobile menu); no horizontal scrolling on 10 pages; menu search ("majboos") and vegan filter; **menu prices equal API prices**; dish page with allergens, ingredients and Friday-only availability; FAQ search; empty-cart state; full pickup order (customisation dialog → cart → server-priced checkout → confirmation "Confirmed"); delivery to Abu Dhabi explained and blocked; reservation (availability → slot → details → confirmation → cancel); back office login → mark sold out → public API shows sold out → restore (desktop).

During development the E2E run also caught the duplicate-order guard working: two identical orders from the same phone a few seconds apart (desktop and mobile runs) — the second was refused with `DUPLICATE_ORDER` and the explanation shown at checkout. The tests now use a distinct phone per viewport.

## Not covered by automated tests

- Visual regression (screenshots were reviewed manually at 1440 px and 390/360 px).
- Screen-reader output beyond semantic roles and labels used by the E2E selectors.
- Load/performance testing; multi-instance rate limiting.
- The Swagger UI page (it loads assets from a CDN).
