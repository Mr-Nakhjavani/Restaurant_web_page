# Integration handoff checklist

Everything another agent or engineer needs to connect the existing voice assistant to the Bayt Al Ghaf restaurant system. Values marked **⟨placeholder⟩** depend on a deployment that does not exist yet; this project does not invent production URLs, credentials, IP addresses or network settings.

## 1. Access and endpoints

| Item | Value | Status / how to obtain |
| --- | --- | --- |
| Restaurant API base URL (local) | `http://localhost:3000/api/v1` | Available after the README quick start |
| Restaurant API base URL (staging) | `https://⟨staging-host⟩/api/v1` | ⟨placeholder⟩ — to be assigned by whoever deploys staging |
| Restaurant API base URL (production) | `https://⟨production-host⟩/api/v1` | ⟨placeholder⟩ — not deployed by this project |
| OpenAPI specification | `GET /api/v1/openapi.json` (live) · `docs/api/openapi.json` (repository snapshot) | Available |
| Interactive API docs | `GET /api/v1/docs` (Swagger UI; loads assets from the jsDelivr CDN) | Available |
| Health check | `GET /api/health` and `GET /api/v1/health` → 200 `{"status":"ok","database":"ok"}`, 503 when the database is down | Available |
| Knowledge base (files) | `docs/restaurant-knowledge/*.md` (+ `agent-test-scenarios.json`, `faq.json`) | Available |
| Knowledge base (live) | `GET /api/v1/knowledge/documents`, `/knowledge/search`, `/faq` | Available |

## 2. Authentication

| Item | Value | Status / how to obtain |
| --- | --- | --- |
| Method | `Authorization: Bearer <API key>` (or `X-API-Key: <key>`) | Implemented |
| Scope for the voice assistant | `agent` | Implemented |
| How to obtain a key | Admin signs in at `/admin` → **API keys** → create (name + scope `agent`); copy the key, shown once | Implemented |
| Development key | `bg_dev_agent_key_for_local_testing_only` (created by `npm run db:seed` from `SEED_AGENT_API_KEY`) | Local only — never deploy |
| Staging / production key | ⟨placeholder⟩ — generate in that environment's admin UI and deliver through a secrets channel | Pending deployment |
| Key rotation / revocation | Create a new key, switch the assistant over, revoke the old one in **API keys** (takes effect immediately) | Implemented |
| Customer-record verification | `X-Customer-Phone` (number used for the booking/order) or `X-Access-Token` (returned at creation) | Implemented — required even with an `agent` key |
| Admin test logins (local) | `admin@baytalghaf.example` / `ChangeMe-Admin-2026`, `staff@baytalghaf.example` / `ChangeMe-Staff-2026` (from `.env`) | Local only — change after first login |

## 3. Network

| Item | Value | Status |
| --- | --- | --- |
| Reachability | Local: localhost only (Docker publishes on `127.0.0.1`). Staging/production: ⟨placeholder⟩ — internet-facing behind TLS, or private network/VPN, to be decided by the deployer | Decision needed |
| TLS | Terminate at the reverse proxy/load balancer | Deployment task |
| IP allowlisting | Not built in. If required, enforce at the proxy/firewall for the voice platform's egress IPs ⟨placeholder⟩ | Decision needed |
| Allowed browser origins (CORS) | `CORS_ALLOWED_ORIGINS` (comma-separated). Not needed for server-to-server calls | Configure per environment |
| Client IP detection | Set `TRUST_PROXY=true` only behind a trusted proxy that sets `X-Forwarded-For` | Configure per environment |
| Rate limits | In-memory, per process: reads 240/min, creates 30/min, look-ups 60/min per IP; ~5× for API keys | For multiple instances, move to a shared store (see limitations) |

## 4. Configuration (environment variables)

See `.env.example` for defaults and comments.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `APP_ENV` | yes in deployments | `development`, `staging` or `production` (production refuses placeholder secrets and the test clock) |
| `ADMIN_SESSION_SECRET` | yes | ≥ 32 random characters (`openssl rand -base64 48`) |
| `APP_BASE_URL` | yes | Public URL of the deployment (links in responses, cookie `Secure` flag when https) |
| `CORS_ALLOWED_ORIGINS` | yes | Browser origins allowed to call the API |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_STAFF_*` | first run | Initial back-office accounts created by the seed |
| `SEED_AGENT_API_KEY` | optional | Development convenience only; leave empty in staging/production |
| `RATE_LIMIT_ENABLED` | optional | Default `true` |
| `TRUST_PROXY` | optional | Default `false` |
| `LOG_LEVEL` | optional | `debug`/`info`/`warn`/`error` (JSON logs to stdout) |
| `SIMULATE_KITCHEN_PROGRESS` | optional | `true` in test environments without kitchen staff |
| `ENABLE_TEST_CLOCK` | optional | `true` lets requests send `X-Test-Now` (never in production) |

## 5. Database setup

| Step | Command |
| --- | --- |
| Start PostgreSQL 16 (local) | `docker compose up -d db` (port 5433) |
| Apply migrations | `npm run db:migrate` (`prisma migrate deploy`) |
| Seed reference data, accounts, sample bookings | `npm run db:seed` (`-- --no-sample` to skip sample bookings) |
| Reset a disposable test database | `DATABASE_URL=…_test npx tsx scripts/reset-test-db.ts` |
| Production image | Runs migrations on start; seeds when `RUN_SEED_ON_START=true` |

## 6. Test resources

| Item | Where |
| --- | --- |
| Example clients (curl / Node / Python) | `docs/integration/examples/` |
| Real request/response examples | `docs/api/examples.md` |
| Evaluation scenarios (30) with expected handling and error codes | `GET /api/v1/knowledge/scenarios`, `docs/restaurant-knowledge/agent-test-scenarios.json` |
| Simulating dates (Fridays, Ramadan…) | `X-Test-Now: 2026-10-30T12:00:00+04:00` with `ENABLE_TEST_CLOCK=true` |
| Order status progression without staff | `SIMULATE_KITCHEN_PROGRESS=true`, or move statuses in `/admin/orders` |
| Repository test suites | `npm test` (unit + API integration against PostgreSQL), `npm run test:e2e` (browser) |

## 7. Sample test cases and expected results

Run against a freshly seeded environment (dates relative to "today" in Dubai):

| # | Request | Expected |
| --- | --- | --- |
| 1 | `GET /api/v1/health` | `200`, `status: ok` |
| 2 | `GET /menu/search?q=rice meat dried lemon` | First result `mi_lamb_machboos` |
| 3 | `GET /menu/items/mi_friday_platter/availability?date=<next Tuesday>&mode=pickup` | `orderable: false`, reason `NOT_AVAILABLE_ON_DAY`, `nextAvailable` = following Friday |
| 4 | `GET /sauces/sauce-no-7` | `allergens: ["gluten","soy","sesame"]` |
| 5 | `GET /reservations/availability?date=<tomorrow>&partySize=6&time=19:30` | `requested.available: true` (unless already booked) |
| 6 | `POST /reservations` for 6, tomorrow 19:30, valid name/phone | `201`, `status: confirmed`, `RES-######` |
| 7 | Same request again with the **same** `Idempotency-Key` | `201`, same reference, header `Idempotent-Replayed: true` |
| 8 | `GET /reservations/{ref}` without headers | `401 VERIFICATION_REQUIRED` |
| 9 | `POST /reservations` with `partySize: 25` | `422 PARTY_TOO_LARGE` |
| 10 | `POST /orders/quote` 2 × lamb machboos, pickup, asap | `valid: true`, total AED 144, `fulfilment.accepted` from 12:00 |
| 11 | `POST /orders` with `mi_friday_platter` on a Tuesday | `422 ITEM_UNAVAILABLE` with `details.items[0].nextAvailable` |
| 12 | `POST /orders` delivery to area `Abu Dhabi` | `422 DELIVERY_AREA_NOT_SERVED` |
| 13 | `POST /orders` with 24 × chicken machboos | `422 REQUIRES_BULK_ORDER` |
| 14 | `POST /bulk-orders/quotes` 200 × lamb machboos in 20 minutes | `status: not_possible`, issues include `ITEM_DAILY_MAXIMUM_EXCEEDED`, `INSUFFICIENT_NOTICE` |
| 15 | `POST /bulk-orders/quotes` 40 × office lunch box, 3 days ahead | `status: feasible` |
| 16 | `GET /admin/orders` with the `agent` key | `403 FORBIDDEN` |

## 8. Out of scope for this project (owned by the integrator)

- Telephony, speech-to-text, text-to-speech, call handling and the conversational agent itself.
- Connecting to, deploying or modifying the voice assistant server.
- Hosting, DNS, TLS certificates, VPN/allowlisting, secrets distribution and monitoring of a shared environment.
- Real payments (the system deliberately has no online payment).
