# Special Days & Seasonal Menu

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Weekly specials, Ramadan arrangements, seasonal dishes, public holidays and advance-order restrictions.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/special-days-and-seasonal-menu`; live availability must always be checked through the API.

## How special-day rules work

Special dishes carry machine-readable rules (days of week, time windows, date ranges, special periods, order types, minimum notice, pre-order opening dates). The backend enforces them for every order and reservation pre-order, in Dubai time. When a dish is not available on a requested date the API returns `ITEM_UNAVAILABLE` with the reason and `nextAvailable`.

Three kinds of dishes:

- **Permanent** — on the menu every day (within breakfast or lunch/dinner hours).
- **Daily / weekly specials** — recur on particular weekdays (the same every week).
- **Limited-time** — only within specific dates or special periods (Ramadan, National Day, winter).

## Weekly specials

| Day | Specials |
| --- | --- |
| Monday | Saloonat Samak (Monday) (AED 64) |
| Tuesday | Margooga Laham (Tuesday) (AED 58) |
| Wednesday | Madrooba Dajaj (Wednesday) (AED 54) |
| Thursday | Camel Machboos (Thursday) (AED 92) |
| Friday | Friday Family Machboos Platter (AED 349) |
| Saturday | Weekend Fuala Breakfast Spread (AED 149) |
| Sunday | Weekend Fuala Breakfast Spread (AED 149) |

- **Weekend Fuala Breakfast Spread** — Saturdays and Sundays only, 08:00–12:00 (not during Ramadan). Dine-in, pickup or dine-in pre-order; not delivered. Limited to 25 spreads per day.
- **Saloonat Samak (Monday)** — Mondays only, from 12:00 until sold out (20 portions). Can be pre-ordered up to 7 days ahead for a Monday.
- **Margooga Laham (Tuesday)** — Tuesdays only, from 12:00 until sold out (20 portions).
- **Madrooba Dajaj (Wednesday)** — Wednesdays only, from 12:00 until sold out (20 portions).
- **Camel Machboos (Thursday)** — Thursdays only, from 12:00 until sold out (20 portions). Catering orders on other days need 72 hours' notice.
- **Friday Family Machboos Platter** — Fridays only, for collection or dine-in between 12:00 and 22:00. Order at least 2 hours ahead (pre-orders up to 7 days ahead). Not delivered. Limited to 12 platters per Friday.

Pre-ordering: a weekday special can be pre-ordered on any day for collection on its own day (up to 7 days ahead). It cannot be collected on a different day, at any price.

## Limited-time dishes

| Dish | Price | When | Notes |
| --- | --- | --- | --- |
| Aseedat Bobar (Winter Pumpkin Asida) | AED 34 | Limited time: served from 1 November 2026 to 28 February 2027 only | Limited time: served from 1 November 2026 to 28 February 2027 only. |
| Ramadan Iftar Set Menu (per person) | AED 125 | Ramadan only (Ramadan 2027 is provisionally 8 February – 9 March 2027) | Ramadan only (Ramadan 2027 is provisionally 8 February – 9 March 2027). Served or collected between 17:30 and 20:30. Same-day orders must be placed by 14:00. Minimum 2 sets. Dine-in (with a reservation) or pickup; not delivered. |
| Eid Al Etihad Feast (National Day) | AED 355 | Available 1–3 December 2026 only | Available 1–3 December 2026 only. Pre-orders open on 15 November 2026 and must be placed at least 24 hours ahead. Pickup, delivery or dine-in. Limited to 20 per day. |

## Calendar of special periods

| Period | Type | From | To | Provisional? | Hours | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Winter season 2026–27 | seasonal | Sunday 1 November 2026 | Sunday 28 February 2027 | no | normal | Winter dessert menu (Aseedat Bobar) is served during this period. |
| Eid Al Etihad (UAE National Day) 2026 | national_day | Tuesday 1 December 2026 | Thursday 3 December 2026 | no | normal | Eid Al Etihad Feast available. Normal opening hours. Pre-orders for the feast open on 15 November 2026. |
| Ramadan 2027 (provisional) | ramadan | Monday 8 February 2027 | Tuesday 9 March 2027 | yes (moon sighting) | 12:00–24:00 | Provisional dates subject to moon sighting. During Ramadan we open from 12:00 to 24:00 daily, breakfast is not served, and the Iftar Set Menu is available from sunset. |
| Eid Al Fitr 2027 (provisional) | eid_al_fitr | Wednesday 10 March 2027 | Friday 12 March 2027 | yes (moon sighting) | normal | Provisional dates. The restaurant opens at 14:00 on the first day of Eid and keeps normal hours on the following days. |

## Closures

| Date | From | To | Applies to | Reason | Public note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | 18:00 | close | reservations | Private event (full dining-room buyout) | The dining room is closed to the public from 18:00 on Saturday 14 November 2026 for a private event. Takeaway and delivery continue as normal. |
| 2027-03-10 | 00:00 | 14:00 | all | Eid Al Fitr — first day (provisional date) | On the first day of Eid Al Fitr (provisionally 10 March 2027) we open at 14:00. |

## Ramadan

- Ramadan 2027 is provisionally **Monday 8 February 2027 – Tuesday 9 March 2027** (subject to moon sighting; the team updates the dates when announced).
- Hours: 12:00–24:00 every day. Breakfast dishes are not served (Balaleet, Chebab with Date Syrup & Cream Cheese, Regag with Egg & Cheese, Bayd w Tamat, Weekend Fuala Breakfast Spread).
- **Ramadan Iftar Set Menu** (AED 125 per person, minimum 2): served/collected 17:30–20:30; same-day orders by 14:00; dine-in (with a reservation) or pickup; not delivered. It is **not available outside Ramadan** — no exceptions; the individual dishes (lentil shorba, sambousa, machboos, harees, luqaimat) are on the regular menu all year.
- Iftar seating starts at 17:30; dates and laban are served at the sunset call to prayer. Book iftar tables early.
- Eating and drinking in public during fasting hours is permitted in Dubai; the dining room is open from 12:00.

## UAE National Day (Eid Al Etihad)

- **Eid Al Etihad Feast** (AED 355, serves 4) is available 1–3 December 2026 only. Pre-orders open on **15 November 2026** and need at least 24 hours' notice. Limited to 20 per day.
- Normal opening hours apply on National Day.

## Eid Al Fitr and Eid Al Adha

- Eid Al Fitr 2027 (provisional): we open at 14:00 on the first day and keep normal hours afterwards.
- On other public holidays we keep normal hours unless a closure is listed above.

## Seasonal dishes

- **Aseedat Bobar** (winter pumpkin asida) — 1 November 2026 to 28 February 2027.
- The outdoor terrace is seasonal (mid-October to end of April).

## Advance-order restrictions

- Regular orders: up to 7 days ahead. “Tomorrow's special for collection next month” is not possible — the special must be collected on its own day within the 7-day window; order nearer the date.
- Dishes with a minimum notice (Friday platter 2 h, Eid Al Etihad Feast 24 h) are rejected with `INSUFFICIENT_NOTICE` if ordered too late.
- Dishes with a pre-order opening date reject earlier orders with `PREORDERS_NOT_OPEN`.
- Catering orders follow their own notice tiers (bulk-and-catering-orders.md).

## Opening hours on any date

`GET /api/v1/restaurant/hours?date=YYYY-MM-DD` returns the exact hours for a date including Ramadan overrides and closures. Regular week:

| Day | Open | Kitchen last orders | Last reservation start |
| --- | --- | --- | --- |
| Monday | 08:00–23:00 | 22:30 | 21:30 |
| Tuesday | 08:00–23:00 | 22:30 | 21:30 |
| Wednesday | 08:00–23:00 | 22:30 | 21:30 |
| Thursday | 08:00–23:00 | 22:30 | 21:30 |
| Friday | 08:00–00:00 (midnight) | 23:30 | 22:30 |
| Saturday | 08:00–00:00 (midnight) | 23:30 | 22:30 |
| Sunday | 08:00–23:00 | 22:30 | 21:30 |
