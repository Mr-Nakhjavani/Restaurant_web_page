# Voice-Agent Quick Reference

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> A concise operating reference for the external voice assistant: key rules, intents, API calls and safe handling of uncertain information.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/voice-agent-reference`; live availability must always be checked through the API.

## Golden rules

1. **Confirm only what the API confirmed.** Say “confirmed” only when the response has `status: confirmed` (reservations) or `confirmed: true` (orders). `pending_confirmation` means *received, not confirmed*.
2. **Read back the backend's values** — reference, date, time, totals — from the response (`message` fields are safe to read aloud).
3. **Check before promising:** availability (`/menu/items/{id}/availability`, `/reservations/availability`, `/orders/quote`) depends on date, time and order type.
4. **Allergies:** read ingredients and trace warnings; never guarantee. Severe allergy → duty manager.
5. **Verify before discussing a record:** reference + phone number (`X-Customer-Phone`).
6. **Use an Idempotency-Key** on every create (orders, reservations, catering) and reuse it when retrying the same request.
7. **On errors, branch on `error.code`**, not on the message. 5xx = nothing happened; retry once, then apologise and offer a call-back.
8. **Dubai time** (UTC+04:00) for all dates and times. Times are on 15-minute slots.

## Key facts

| Topic | Fact |
| --- | --- |
| Restaurant | Bayt Al Ghaf, Bayt Al Ghaf, Unit 14, Heritage Quarter, Al Seef Street, Al Seef, Bur Dubai, Dubai, United Arab Emirates (fictional) |
| Phone / WhatsApp | +971 4 555 0142 / +971 50 555 0142 |
| Hours | Mon–Thu & Sun 08:00–23:00; Fri–Sat 08:00–24:00; last orders 30 min before close |
| Breakfast | 08:00–11:30 daily (not in Ramadan); weekend spread Sat–Sun until 12:00 |
| Reservations | 1–20 guests; >12 pending confirmation; up to 60 days ahead; changes until 2 h before; 15 min grace |
| Orders | pickup, delivery, dine-in pre-order; min lead 20 min; up to 7 days ahead; max 20 portions; changes until 30 min before/prep start |
| Delivery | Dubai zones A–C, 12:00–22:30, UAE mobile required; zone D catering only |
| Catering | >20 portions; 24/48/72 h notice; max 250/order, 300/day; always pending until the team confirms |
| Payment | In person only (cash, card, Apple/Google Pay). No card numbers by phone. |
| Diet | All halal, alcohol-free, no pork. One shared kitchen — no allergen guarantees. |
| Majlis | 6+ guests, 24 h notice, min spend AED 150 pp |

## Intents → API

| Intent | Calls |
| --- | --- |
| Opening hours / are you open now | `GET /api/v1/restaurant/hours?date=` |
| Location, parking, directions | `GET /api/v1/restaurant/location`, `GET /api/v1/restaurant/transportation` |
| Policies | `GET /api/v1/restaurant/policies` |
| What's on the menu / find a dish | `GET /api/v1/menu?category=&dietary=&excludeAllergens=`, `GET /api/v1/menu/search?q=` |
| Dish details, ingredients, allergens | `GET /api/v1/menu/items/{id}` |
| Sauce / ingredient details | `GET /api/v1/sauces/{id}`, `GET /api/v1/ingredients/{id}` |
| Is X available on date/time? | `GET /api/v1/menu/items/{id}/availability?date=&time=&mode=` |
| Today's specials | `GET /api/v1/menu/specials?date=` |
| Feed N people cheaply | `GET /api/v1/menu/feeding-suggestions?guests=&date=&mode=` |
| Check / book a table | `GET /api/v1/reservations/availability` → `POST /api/v1/reservations` |
| Look up / change / cancel a booking | `GET\|PATCH /api/v1/reservations/{ref}`, `POST /api/v1/reservations/{ref}/cancel` (+ `X-Customer-Phone`) |
| Price & time an order | `POST /api/v1/orders/quote` |
| Place an order | `POST /api/v1/orders` |
| Order status / change / cancel | `GET /api/v1/orders/{n}/status`, `PATCH /api/v1/orders/{n}`, `POST /api/v1/orders/{n}/cancel` (+ `X-Customer-Phone`) |
| Delivery area check | `GET /api/v1/delivery/check?area=` |
| Large / catering order | `POST /api/v1/bulk-orders/quotes` → `POST /api/v1/bulk-orders` |
| Anything else / policy question | `GET /api/v1/knowledge/search?q=`, `GET /api/v1/faq/search?q=` |

## Handling uncertainty

- If the knowledge search returns nothing relevant, say you are not sure and offer a call-back from the team — do not improvise policy.
- If an API call fails with a 5xx or times out, do not assume success. For creates, retry once with the same Idempotency-Key.
- If information conflicts (e.g. guest says a dish was available yesterday), trust the live API for the requested date.
- If the guest asks for something not in the menu, say we do not serve it and suggest the closest dish.

## Escalate to staff when

- Severe allergies, complaints, refunds or compensation requests.
- Parties above 20, catering not_possible quotes, private events.
- Changes after online cut-offs, or orders already being prepared.
- Verification failing repeatedly.

Full details: external-agent integration guide (docs/integration/external-agent-integration.md) and the OpenAPI spec (/api/v1/openapi.json).
