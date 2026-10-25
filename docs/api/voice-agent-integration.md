# Voice-agent integration: workflows

How an external voice assistant can serve common phone conversations with the Bayt Al Ghaf API. This describes **API usage only** — it does not prescribe how the assistant is built. Connection, authentication and conventions are in [`docs/integration/external-agent-integration.md`](../integration/external-agent-integration.md); real request/response bodies are in [`examples.md`](./examples.md).

Throughout: base URL `…/api/v1`, header `Authorization: Bearer <agent key>`, Dubai local dates/times.

## Rules that apply to every workflow

1. **Check, then act, then confirm from the response.** Never state availability, prices or confirmation from memory.
2. **Only `confirmed` is confirmed.** `pending_confirmation` = "received; the team will confirm".
3. **Branch on `error.code`.** `4xx` with `retryable:false` → explain and offer `details.alternatives`. `5xx`/timeouts → nothing happened; retry once with the same `Idempotency-Key`; then apologise and offer a call-back.
4. **Verify before discussing a booking or order:** reference + `X-Customer-Phone` (try the caller ID first).
5. **Allergies:** report ingredients and trace warnings; never guarantee.

---

## 1. Answering a question about menu ingredients

*"What's in the lamb machboos? Does it have nuts?"*

1. Resolve the dish: `GET /menu/search?q=lamb machboos&limit=3` → take `data[0].item.id` (`mi_lamb_machboos`). If the top results are close (e.g. "machboos" alone), ask which one (lamb, chicken, vegetable; camel on Thursdays).
2. `GET /menu/items/mi_lamb_machboos`
   - `ingredients[]` → name + quantity (e.g. *Lamb shoulder 280 g bone-in (raw weight)*, *Basmati rice 150 g*, *Loomi 1 whole*…)
   - `sauces[]` → named preparations (Bezar Spice Blend, Hashu Topping, Dakkus) — for their contents call `GET /sauces/{slug}`.
   - `allergenDetails[]` → `[{ allergen: "milk", sources: ["Ghee (clarified butter)", "Hashu Topping (Ghee…)"], avoidableWith: null }, { allergen: "sulphites", sources: ["Hashu Topping (Golden raisins)"], avoidableWith: ["Hashu without raisins"] }]`
   - `mayContain` → `["celery", "mustard"]` (supplier traces in ground spices)
   - `dietaryTags` includes `nut_free_ingredients` → **no nut ingredients**, but the kitchen handles nuts.
3. Answer: *"Lamb machboos is bone-in lamb shoulder and basmati rice cooked with loomi, onion, tomato and our bezar spices, topped with hashu. It has no nut ingredients, but our kitchen does handle nuts, so I can't promise it's free of traces. It contains dairy from the ghee, and sulphites from the raisins — we can leave the raisins out."*
4. Follow-ups: `customerQA[]` already answers common questions for that dish ("Is the lamb on the bone?", "Is it spicy?").

## 2. Checking a special-day item for a specific date

*"Can I get the Friday family platter this Tuesday?"*

1. Resolve the date in Dubai time (e.g. 2026-10-27).
2. `GET /menu/items/mi_friday_platter/availability?date=2026-10-27&mode=pickup`
   ```json
   { "availability": { "orderable": false,
       "reasons": [{ "code": "NOT_AVAILABLE_ON_DAY", "message": "Friday Family Machboos Platter is only available on Fridays; Tuesday 27 October 2026 is a Tuesday." }],
       "nextAvailable": { "date": "2026-10-30", "time": "12:00", "description": "Friday only, 12:00–22:00" } },
     "alternatives": [{ "id": "mi_majlis_platter", "name": "Majlis Sharing Platter", "price": { "formatted": "AED 329" } }] }
   ```
3. Answer with the reason, then offer: pre-order for Friday 30 October (pickup/dine-in, up to 7 days ahead) **or** the Majlis Sharing Platter on Tuesday. Paying more does not change the rule.
4. Other date-bound dishes behave the same: Iftar set (`OUTSIDE_SPECIAL_PERIOD` outside Ramadan), National Day feast (`PREORDERS_NOT_OPEN` before 15 Nov 2026, `INSUFFICIENT_NOTICE` < 24 h), winter asida (`OUTSIDE_DATE_RANGE`), breakfast dishes (`OUTSIDE_ITEM_HOURS` after 11:30, `NOT_DURING_SPECIAL_PERIOD` in Ramadan).
5. "What's special on Friday?" → `GET /menu/specials?date=2026-10-30` (`today[]` lists dishes served that day).

## 3. Finding available tables and booking one

*"A table for six tomorrow evening, outside if possible."*

1. Collect: date, party size, approximate time, preference (is outside required or just preferred?).
2. `GET /reservations/availability?date=2026-10-27&partySize=6&time=19:30&seatingPreference=terrace`
   - `requested.available` → 19:30 on the terrace is free → go to step 3.
   - Otherwise offer `alternatives[].time` (terrace at other times) or, if outside was only a wish, check `slots[]` where `areas` includes `indoor`/`window` at 19:30.
   - `violations[]` explains impossibilities (`PARTY_TOO_LARGE` > 20, `TERRACE_CLOSED` in summer…). `otherDates[]` suggests the next days when the date is full.
3. Ask for name and phone (mandatory) and any requests (high chairs, wheelchair, occasion).
4. `POST /reservations` with `Idempotency-Key: <call id>-res-1`
   ```json
   { "date": "2026-10-27", "time": "19:30", "partySize": 6, "seatingPreference": "terrace",
     "customer": { "name": "Mariam Al Suwaidi", "phone": "050 123 4567" }, "occasion": "birthday" }
   ```
   → `201`, `data.reservation.status: "confirmed"`, `reference: "RES-889362"`, `data.message` ready to read.
5. If `409 SEATING_PREFERENCE_UNAVAILABLE` (someone just took the last terrace table): read `details.availableAreas` / `details.alternatives` and ask. If `409 DUPLICATE_RESERVATION`: offer to change the existing booking (`details.existingReference`).
6. Groups of 13–20 return `pending_confirmation`: say the table is held and the team will call to confirm.
7. Changes: `PATCH /reservations/{ref}` (with `X-Customer-Phone`) until 2 h before; cancellations: `POST /reservations/{ref}/cancel`.

## 4. Creating a pickup order for a requested arrival time

*"Two lamb machboos without raisins and two karak — I'll be there at 1 pm."*

1. Map dishes and options from `GET /menu/items/{id}` → `customizations[]` (`hashu_no_raisins`). Only offer listed options.
2. `POST /orders/quote`
   ```json
   { "items": [ { "itemId": "mi_lamb_machboos", "quantity": 2, "options": ["hashu_no_raisins"] },
                { "itemId": "mi_karak", "quantity": 2 } ],
     "fulfilment": { "type": "pickup", "date": "2026-10-26", "time": "13:00" } }
   ```
   - `valid: true`, `totals.total.formatted: "AED 168"`, `fulfilment.accepted.time: "13:00"` → read the total and time back.
   - If the time is too soon: `issues[0].code: "TIME_TOO_SOON"` with `details.alternatives[0].time` (the earliest real time). Offer it; never promise the original time.
   - If the customer says "as soon as possible", use `{ "type": "pickup", "asap": true }` and read `fulfilment.accepted`.
3. Get the name and phone, then `POST /orders` (same items/fulfilment + `customer`, `Idempotency-Key`).
4. Confirm from the response: `order.number`, `order.status` (`confirmed` → "ready at 13:00 at the Gate 3 counter, pay on collection"), or `pending_confirmation` (large totals) → "received, the team will confirm".
5. Late? Orders are held 60 minutes after `promisedAt` (`fulfilment.holdUntil`).

## 5. Checking whether a large catering order is feasible

*"Can you do 100 portions for an event on Wednesday at noon?"*

1. Clarify dishes (or propose: lamb/chicken/vegetable machboos, sambousa trays, luqaimat), pickup vs delivery area, date/time, guest count.
2. `POST /bulk-orders/quotes`
   ```json
   { "items": [ { "itemId": "mi_chicken_machboos", "quantity": 60 }, { "itemId": "mi_vegetable_machboos", "quantity": 40 } ],
     "fulfilment": { "type": "delivery", "date": "2026-10-28", "time": "12:00" }, "deliveryArea": "Business Bay", "guestCount": 100 }
   ```
3. Read `status`:
   - `feasible` → total, 5% volume discount, delivery fee, deposit (if ≥ AED 2,500); offer to place it.
   - `needs_changes` → read `issues[].message` (e.g. *"needs at least 48 hours' notice"*) and offer `alternatives[]` (earliest feasible dates).
   - `not_possible` → e.g. *"We can prepare at most 150 × Lamb Machboos per day"* or > 250 portions; offer `escalation.contact` (events team). Never guarantee.
4. Place: `POST /bulk-orders` `{ quoteId, customer, companyName?, deliveryAddress }` → `CAT-######`, **always `pending_confirmation`**: "Your catering request is received; our catering team will call within 4 hours to confirm."

## 6. Rejecting an unsafe allergen guarantee

*"I'm allergic to sesame. Is your house sauce definitely safe?"*

1. Ambiguity: two sauces are called "house sauce", plus Sauce No. 7. Ask which dish/sauce — or check all three: `GET /sauces/al-ghaf-house-red`, `/sauces/al-ghaf-house-green`, `/sauces/sauce-no-7`.
   - House Red: contains tree nuts + gluten; no sesame ingredient.
   - House Green: no major-allergen ingredients; `mayContain: ["gluten","tree_nuts","celery","mustard"]`.
   - Sauce No. 7: **contains sesame** (sesame oil), soy and gluten.
2. Answer with ingredient facts plus the kitchen statement (`GET /restaurant/policies` → `allergens.kitchenStatement`, also on every dish as `kitchenAllergenStatement`): *"…neither house sauce has sesame as an ingredient, but Sauce No. 7 does, and sesame is used in our kitchen, so I can't say any dish is definitely safe. For a severe allergy, our duty manager can talk you through it."*
3. If ordering, add the allergy to `specialInstructions` — the order is flagged (`allergyNoteFlagged: true`) and the duty manager calls the customer.
4. Never say "safe", "allergen-free", "no risk" or "guaranteed". "Can you make the whole menu nut-free?" → no (see FAQ / scenario 03).

## 7. Handling an unavailable item and suggesting alternatives

*"Four harees for tonight please."*

1. `GET /menu/items/mi_harees/availability?date=<today>&time=19:00&mode=pickup&quantity=4`
   - `status: "sold_out"` with `ITEM_SOLD_OUT` (staff marked it) or `DAILY_LIMIT_REACHED` (`remainingOnDate: 1`) → offer the remaining quantity, `nextAvailable` (tomorrow from 12:00) or an alternative.
2. Alternatives come with the response (`alternatives[]` on the availability endpoint; `details.items[].alternatives` on a refused order) — e.g. Lamb Thareed. Each alternative is already checked as orderable at the same time.
3. If the order is sent anyway: `422 ITEM_UNAVAILABLE` → nothing was created; re-quote with the customer's choice.
4. If a dish runs out **after** an order was confirmed, staff remove the line (`order.items[].status: "removed"`, `removedReason`) and the total is reduced; when asked, explain that the team will call to offer a substitute and nothing is charged for it.

---

## Intent → endpoint cheat sheet

| Intent | Endpoint(s) |
| --- | --- |
| Opening hours / open now / Ramadan hours | `GET /restaurant/hours?date=` |
| Where are you / parking / metro | `GET /restaurant/location`, `GET /restaurant/transportation` |
| Policies (cancellation, children, payment…) | `GET /restaurant/policies`, `GET /faq/search?q=` |
| Menu, prices, diets | `GET /menu?…`, `GET /menu/search?q=` |
| Ingredients / allergens / sauces | `GET /menu/items/{id}`, `GET /sauces/{id}`, `GET /ingredients/{id}` |
| Special days | `GET /menu/items/{id}/availability?date=`, `GET /menu/specials?date=` |
| Feed N people | `GET /menu/feeding-suggestions?guests=` |
| Book / change / cancel table | `GET /reservations/availability`, `POST /reservations`, `PATCH|POST …/{ref}(/cancel)` |
| Order / change / cancel / status | `POST /orders/quote`, `POST /orders`, `PATCH /orders/{n}`, `POST /orders/{n}/cancel`, `GET /orders/{n}/status` |
| Deliver to X? | `GET /delivery/check?area=` |
| Catering | `POST /bulk-orders/quotes`, `POST /bulk-orders` |
| Anything else | `GET /knowledge/search?q=` — if nothing relevant, say you are not sure and offer a call-back |
