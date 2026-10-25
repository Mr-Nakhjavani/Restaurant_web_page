# External agent integration guide

This guide is for the engineer or agent who will connect the **existing voice assistant** (which runs on a separate server) to the **Bayt Al Ghaf restaurant system**. The restaurant system is standalone: the website, database and API run without the voice assistant, and the assistant only needs HTTPS access to the documented REST API. Nothing here assumes anything about the assistant's internal architecture, tools or prompts.

> **Fictional test restaurant.** Bayt Al Ghaf, its address, phone numbers, prices and availability are simulated. Never send real payment details.

Related documents:

| Document | Purpose |
| --- | --- |
| [`docs/api/openapi.json`](../api/openapi.json) | OpenAPI 3.1 contract (also live at `/api/v1/openapi.json`, Swagger UI at `/api/v1/docs`) |
| [`docs/api/api-reference.md`](../api/api-reference.md) | Endpoint index with access levels |
| [`docs/api/examples.md`](../api/examples.md) | Real request/response examples captured from the API |
| [`docs/api/error-codes.md`](../api/error-codes.md) | Every error code, HTTP status, retry flag and recommended handling |
| [`docs/api/voice-agent-integration.md`](../api/voice-agent-integration.md) | Step-by-step multi-call workflows for common conversations |
| [`docs/restaurant-knowledge/`](../restaurant-knowledge/) | Knowledge base for retrieval or ingestion (start with `knowledge-index.md` and `voice-agent-reference.md`) |
| [`docs/integration/examples/`](./examples/) | Runnable curl, Node.js and Python client examples |
| [`docs/integration/handoff-checklist.md`](./handoff-checklist.md) | What the integrator needs to obtain before going live |

---

## 1. Connecting

| Environment | Base URL | Notes |
| --- | --- | --- |
| Local development | `http://localhost:3000/api/v1` | `npm run dev` or `npm start` (see README) |
| Docker Compose | `http://localhost:3000/api/v1` | `docker compose --profile app up --build` |
| Staging | `https://<STAGING_HOST>/api/v1` | **Placeholder** — to be provided by whoever deploys it |
| Production | `https://<PRODUCTION_HOST>/api/v1` | **Placeholder** — not deployed by this project |

- **Health check:** `GET /api/health` or `GET /api/v1/health` → `{"status":"ok","database":"ok",…}` (HTTP 503 when the database is down).
- **Transport:** HTTPS in any shared environment (terminate TLS at your reverse proxy). Requests and responses are JSON (`Content-Type: application/json`), max request body 64 KB.
- **Network:** the API is a normal HTTP service. Whether it is reachable over the internet, through a VPN or only on a private network depends on the deployment — see the handoff checklist. No IP allowlisting is built in; add it at the proxy/firewall if required.
- **CORS** applies only to browsers. Server-to-server calls from the voice platform do not need to be in `CORS_ALLOWED_ORIGINS`.
- **Time:** every local date/time is **Dubai time (Asia/Dubai, UTC+04:00, no daylight saving)**. Send `date` as `YYYY-MM-DD` and `time` as `HH:mm` on 15-minute slots. Responses also include ISO-8601 timestamps with `+04:00`.

## 2. Authentication and authorisation

| Caller | How | Can do |
| --- | --- | --- |
| Anyone (website, anonymous clients) | no credentials | Read restaurant info, menu, availability, knowledge, FAQ; create quotes, orders, reservations, catering requests |
| **Voice agent** | `Authorization: Bearer <key>` with scope **`agent`** | Same as above, plus: requests are recorded on the `phone` channel and get ~5× higher rate limits |
| Staff automation | key with scope `staff` | All orders/reservations without customer verification; status changes |
| Administrators | key with scope `admin`, or the browser session | Everything including menu prices, settings, calendar, API keys |

**Getting a key.** An administrator signs in at `/admin` → *API keys* → *Create key* (name e.g. "Voice agent – staging", scope `agent`). The key (`bg_live_…`) is shown **once**; only its SHA-256 hash is stored. Keys can be revoked at any time. In local development `npm run db:seed` also creates the key from `SEED_AGENT_API_KEY` (default `bg_dev_agent_key_for_local_testing_only` — never use it outside your machine).

**Customer records are protected even for the agent key.** To read, change or cancel an order or reservation, send the reference **and** either:

- `X-Customer-Phone: <the phone number used when booking/ordering>` (any format — `050 123 4567`, `+971501234567`), or
- `X-Access-Token: <token returned when the record was created>`.

Without either you get `401 VERIFICATION_REQUIRED`. A wrong phone or unknown reference returns `404 RECORD_NOT_FOUND` (deliberately indistinguishable). After 5 failures for the same reference within 15 minutes the API returns `429 TOO_MANY_VERIFICATION_ATTEMPTS`. In a phone conversation, the caller ID is a good default for `X-Customer-Phone`; if it fails, ask the caller which number they used.

Admin endpoints (`/api/v1/admin/*`) are not needed for customer conversations and the `agent` scope cannot use them (`403 FORBIDDEN`).

## 3. Conventions

- **Envelope:** success `{ "data": …, "meta"?: … }`; error `{ "error": { code, message, status, category, retryable, requestId, details? } }`.
- **Money:** `{ amountFils, amount, currency: "AED", formatted }`. Prices include 5% VAT (`vatIncluded` shows the VAT part). Read `formatted` aloud.
- **References:** `RES-######` (reservation), `ORD-######` (order), `CAT-######` (catering order), `QTE-######` (catering quote). Digits only, easy to read back. Inputs are tolerant: `res 482 913` and `482913` both work.
- **Dish ids:** `mi_…` (e.g. `mi_lamb_machboos`); slugs (`lamb-machboos`) work too. Never guess ids — use `GET /menu/search?q=` or `GET /menu`.
- **Idempotency:** send `Idempotency-Key: <unique per logical action>` on `POST /orders`, `POST /reservations` and `POST /bulk-orders`. If a call times out, **retry with the same key and body**: you get the original result (`Idempotent-Replayed: true`) instead of a duplicate. A different body with the same key → `422 IDEMPOTENCY_KEY_REUSED`. Keys are kept 24 hours.
- **Request IDs:** every response has `X-Request-Id`. You may send your own (`X-Request-Id: call-<id>`, 8–80 chars) to correlate logs.
- **Rate limits** (per process, per key or per IP): reads 240/min (keys 1,200), creates 30/min (keys 300), record look-ups 60/min (keys 600). Responses carry `RateLimit-Limit/Remaining/Reset`; a `429` carries `Retry-After`.
- **Plain-English messages:** create/modify/cancel responses include a `message` field built from the stored record (e.g. *"Your table for 6 on Tuesday 27 October 2026 at 19:30 is confirmed — reference RES-889362…"*). It is safe to read to the customer.

## 4. Restaurant information

| Question | Call |
| --- | --- |
| Identity, address, contacts, facilities, house rules | `GET /restaurant` |
| Are you open now? Hours on a date (Ramadan/Eid aware) | `GET /restaurant/hours?date=YYYY-MM-DD&days=7` (`data.now.isOpen`, `data.days[]`) |
| Address, entrance, landmarks | `GET /restaurant/location` |
| Directions, parking, metro, abra, accessibility | `GET /restaurant/transportation` |
| Every policy with its live numbers | `GET /restaurant/policies` |
| Delivery zones / do you deliver to X? | `GET /delivery/zones`, `GET /delivery/check?area=Al%20Karama` |

## 5. Menu, ingredients, sauces, prices and special days

| Need | Call |
| --- | --- |
| Whole menu with live availability | `GET /menu?date=&time=&mode=pickup` (`mode`: `dine_in` default, `pickup`, `delivery`, `dine_in_preorder`) |
| Filters | `category`, `kind` (`permanent`, `daily_special`, `limited_time`, `catering`), `dietary=vegan,gluten_free_ingredients`, `excludeAllergens=tree_nuts,sesame`, `maxSpice`, `minPriceAed`, `maxPriceAed`, `search`, `availableOnly=true`, `featured` |
| Identify a dish from words ("rice, meat and dried lemon") | `GET /menu/search?q=…` |
| Everything about one dish (ingredients with quantities, sauces, allergens with their sources and how to avoid them, customisation options, rules, Q&A) | `GET /menu/items/{id}` |
| Is a dish available on a date/time for pickup/delivery? | `GET /menu/items/{id}/availability?date=&time=&mode=&quantity=` |
| What's special today / on a date | `GET /menu/specials?date=` |
| A sauce's full composition ("what's in the house sauce?") | `GET /sauces/{id-or-slug}`; list with `GET /sauces` |
| One ingredient and where it is used | `GET /ingredients/{id}` (e.g. `ing_loomi`) |
| Cheapest way to feed N people | `GET /menu/feeding-suggestions?guests=15&date=&mode=pickup` |

Availability is evaluated by the backend in Dubai time and considers weekday, time window, date range, special periods (Ramadan, National Day…), order type, minimum notice, same-day cut-offs, pre-order opening dates, minimum quantities, sold-out flags and daily limits. `availability.orderable=false` is **not an error** — read `reasons[].message` and offer `nextAvailable` and `alternatives`.

## 6. Knowledge base and FAQ

- `GET /knowledge/documents` — list of 16 documents (`id`, `title`, `description`, `dataVersion`).
- `GET /knowledge/documents/{id}` — JSON with `markdown` and pre-split `sections[]`; `?format=markdown` returns raw Markdown.
- `GET /knowledge/search?q=…&limit=8&documentId=` — ranked passages (`documentId`, `heading`, `snippet`, `score`).
- `GET /faq`, `GET /faq/search?q=…`, `GET /faq/{id}` — structured FAQ (76 entries).
- `GET /knowledge/scenarios` — adversarial test scenarios with expected handling (also in `docs/restaurant-knowledge/agent-test-scenarios.json`).

The documents are rendered **live from the database**, so they always match the API (prices, hours, rules). For ingestion into the assistant's own retrieval system, either fetch them through the API or use the Markdown snapshots in `docs/restaurant-knowledge/` (generated from the seed data by `npm run kb:build`). Re-ingest when `dataVersion` changes. Live facts (availability, open now, table slots, prices after admin edits) must still be checked through the API at call time.

## 7. Reservations

1. `GET /reservations/availability?date=&partySize=&time=&seatingPreference=&wheelchair=` → `slots[]` (each with available `areas`), `requested` (is the preferred time free?), `alternatives` (nearest free times), `otherDates` (when the day is full), `violations` (e.g. party too large), `requiresConfirmation`.
2. `POST /reservations` with `{ date, time, partySize, seatingPreference, customer: { name, phone, email? }, specialRequests?, occasion?, childrenCount?, highChairs?, wheelchairAccess? }` and an `Idempotency-Key`.
   - `201` → `data.reservation.status` is `confirmed` (tell the customer it is booked) or `pending_confirmation` (groups > 12: a table is held but the team must confirm — say so).
   - Seating preference is a requirement: if that area is full you get `409 SEATING_PREFERENCE_UNAVAILABLE` with `availableAreas` and `alternatives`; the guest is never moved silently. Use `no_preference` for "any table".
   - Other refusals: `409 NO_TABLE_AVAILABLE`, `409 DUPLICATE_RESERVATION`, `422 PARTY_TOO_LARGE` (> 20), `OUTSIDE_SEATING_HOURS`, `INSUFFICIENT_NOTICE`, `MAJLIS_MIN_PARTY`, `MAJLIS_NOTICE`, `TERRACE_CLOSED`, `DATE_IN_PAST`, `TOO_FAR_IN_ADVANCE`, `INVALID_PHONE`.
3. `GET /reservations/{ref}` (verification headers) → current state, `allowedActions`, policies.
4. `PATCH /reservations/{ref}` with any of `date`, `time`, `partySize`, `seatingPreference`, `specialRequests`, … → re-validated and re-allocated atomically; on failure the booking is unchanged. Closed 2 hours before the booking (`MODIFICATION_WINDOW_CLOSED`).
5. `POST /reservations/{ref}/cancel` with optional `{ reason }` → `cancelled`, `lateCancellation` flag. Linked dine-in pre-orders are cancelled too.

Concurrency: table allocation is serialised per date with a PostgreSQL advisory lock and protected by a database exclusion constraint, so two simultaneous callers can never receive the same table.

## 8. Pickup, delivery and dine-in pre-orders

1. **Quote first:** `POST /orders/quote` with `{ items: [{ itemId, quantity, options?, notes? }], fulfilment: { type, asap? | date+time, reservationReference? }, deliveryAddress?, customerPhone? }`. Returns server prices, `issues[]`, per-line availability and alternatives, `fulfilment.accepted` (the time the kitchen can commit to), `availableSlots`, delivery fee/minimum, payment methods and `requiresManualReview`. `valid: true` means the same body will be accepted by `POST /orders` right now.
2. **Create:** `POST /orders` with the same fields plus `customer: { name, phone, email? }`, optional `recipient`, `specialInstructions`, `paymentMethod`, and an `Idempotency-Key`. The server recomputes every price; client prices are ignored.
   - `201` → `data.order.status` is `confirmed` (ready at `fulfilment.promisedAt`) or `pending_confirmation` (manual review: totals above AED 1,500 or a history of uncollected orders) — then say *received, not yet confirmed*.
   - The API never accepts a time the kitchen cannot meet: `422 TIME_TOO_SOON`, `OUTSIDE_ORDERING_HOURS`, `INVALID_TIME`, `TOO_FAR_IN_ADVANCE`, or `409 SLOT_FULL`, each with `details.alternatives`.
   - Item problems: `422 ITEM_UNAVAILABLE` (`details.items[]` with reasons, `nextAvailable`, `alternatives`), `UNKNOWN_MENU_ITEM`, `INVALID_CUSTOMIZATION` (`details.availableOptions`), `INVALID_QUANTITY`, `BULK_ONLY_ITEM`, `REQUIRES_BULK_ORDER` (> 20 kitchen portions).
   - Delivery: needs `deliveryAddress { area, building, street, unit?, floor?, landmark?, makaniNumber?, instructions? }` (Dubai only) and a UAE mobile → `DELIVERY_ADDRESS_REQUIRED`, `DELIVERY_AREA_NOT_SERVED`, `DELIVERY_ZONE_CATERING_ONLY`, `BELOW_DELIVERY_MINIMUM`, `DELIVERY_REQUIRES_UAE_MOBILE`. Pickup never needs an address.
   - Dine-in pre-order: `fulfilment: { type: "dine_in_preorder", reservationReference }` — the reservation must be confirmed and booked with the same phone (`RESERVATION_REQUIRED_FOR_PREORDER`, `RESERVATION_MISMATCH`).
   - `409 DUPLICATE_ORDER` if an identical order for the same phone and time was placed in the last 5 minutes (protects against double submissions without an idempotency key).
3. **Status:** `GET /orders/{number}/status` (compact) or `GET /orders/{number}` (full). Flow: `pending_confirmation` → `confirmed` → `preparing` → `ready_for_pickup` | `out_for_delivery` | `ready_to_serve` → `completed`; failures `rejected`, `cancelled`, `not_collected`, `delivery_failed`.
4. **Modify:** `PATCH /orders/{number}` with `items`, `fulfilment { date, time | asap }`, `deliveryAddress`, `recipient`, `specialInstructions`. Allowed until 30 minutes before the time or the start of preparation; fully re-validated and re-priced; on failure `details.unchanged: true`.
5. **Cancel:** `POST /orders/{number}/cancel` — free until preparation starts (`CANCELLATION_WINDOW_CLOSED` afterwards → offer staff call-back).

Payment is always in person (cash, card, Apple/Google Pay on collection or delivery, or at the table). The API has no card fields; never collect card details.

## 9. Catering and large orders

1. `POST /bulk-orders/quotes` with `{ items, fulfilment: { type: "pickup" | "delivery", date, time }, deliveryArea?, guestCount?, eventType? }` → `status`: `feasible`, `needs_changes` (fixable by another date/time — see `alternatives`) or `not_possible` (blocking issue — see `escalation`). Includes notice required vs available, daily capacity, volume discount, delivery fee, deposit and `validUntil` (48 h).
2. `POST /bulk-orders` with `{ quoteId, customer, companyName?, deliveryAddress? (delivery), notes? }` → a `CAT-` order that is **always `pending_confirmation`**; the catering team confirms by phone within 4 hours. Price is locked to the quote; capacity is re-checked (`QUOTE_NOT_FEASIBLE`, `QUOTE_EXPIRED`, `QUOTE_ALREADY_USED`).

Limits: regular orders ≤ 20 kitchen portions; catering 21–60 portions 24 h notice, 61–150 48 h, 151–250 72 h; ≤ 250 portions per order and 300 per day; per-dish daily maxima and extra notice (e.g. whole lamb ouzi 48 h, max 3/day).

## 10. Handling failures

| Situation | How to recognise | What to do |
| --- | --- | --- |
| Invalid request | `400 VALIDATION_ERROR` (`details.issues[].path`), `422` validation codes | Ask the customer for the missing/invalid field, or fix the client |
| Item unavailable | `422 ITEM_UNAVAILABLE`, or `availability.orderable=false` | Explain the reason; offer `nextAvailable` or `alternatives`; re-quote |
| Business rule | `422`, `category: business_rule` | Explain in one sentence; offer `details.alternatives` |
| Conflict | `409` (slot/table taken, duplicate, wrong state) | Offer alternatives; re-check availability |
| Needs verification | `401 VERIFICATION_REQUIRED`, `404 RECORD_NOT_FOUND` | Ask for the phone number used; do not reveal anything first |
| Rate limited | `429` + `Retry-After` | Wait and retry |
| Server failure | `500 INTERNAL_ERROR`, `503 SERVICE_UNAVAILABLE`, network timeout | **Assume nothing happened.** Retry once with the same `Idempotency-Key`; if it still fails, apologise and offer a call-back |

**Never tell a customer something is booked, ordered, cancelled or changed unless the API returned 2xx for that action.** For new records, only `confirmed: true` means confirmed.

## 11. Confirming successful actions

Read back from the response, not from what was requested:

- Reservation: `reference`, `date`, `time`, `partySize`, `seatingAreaLabel`, `status` (and `policies.lateArrivalGraceMinutes`).
- Order: `number`, `fulfilment.date/time` (delivery: `estimatedWindow`), `totals.total.formatted`, `payment.methodLabel`, `status`.
- Catering: `number`, `status` (pending), the team call-back promise, `totals.depositRequired` if any.

Spell references digit by digit ("R-E-S, four-eight-two-nine-one-three").

## 12. Multi-step workflows

Worked call sequences for the common conversations are in [`docs/api/voice-agent-integration.md`](../api/voice-agent-integration.md): ingredient questions, special-day checks, booking a table, pickup for an arrival time, catering feasibility, refusing allergen guarantees and handling unavailable items.

## 13. Testing an integration

1. Start the system locally (README → *Quick start*) — the dev seed creates the `agent` key `bg_dev_agent_key_for_local_testing_only`, staff/admin logins and sample bookings.
2. Run the examples: `docs/integration/examples/curl-examples.sh`, `node-client.mjs`, `python_client.py` (set `BASE_URL` and `API_KEY`).
3. **Test clock** (development/staging only): with `ENABLE_TEST_CLOCK=true`, send `X-Test-Now: 2026-10-30T12:00:00+04:00` to make the API behave as if it were that moment (e.g. test Friday-only dishes on a Tuesday, Ramadan rules in October). It is refused when `APP_ENV=production`.
4. **Kitchen simulation:** with `SIMULATE_KITCHEN_PROGRESS=true`, confirmed orders advance to `preparing` and `ready_for_pickup`/`out_for_delivery` as their times pass, so status questions can be tested without staff. Staff can also move statuses in `/admin/orders`.
5. Use the 30 scenarios in `GET /knowledge/scenarios` as an evaluation set; each lists the API calls a correct agent makes, what it must not promise and the expected error codes.
6. Reset a test database with `DATABASE_URL=…_test npx tsx scripts/reset-test-db.ts` (refuses non-test databases).
7. The repository's own suites (`npm test`, `npm run test:e2e`) cover the API contract end to end and can be pointed at a staging database.
