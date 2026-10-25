# Bulk & Catering Orders

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Family platters, office lunches, catering, large quantities, notice periods, serving sizes, maximum quantities and escalation.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/bulk-and-catering-orders`; live availability must always be checked through the API.

## When is an order a catering order?

Regular orders are limited to 20 kitchen portions. Anything larger — or any catering-only dish — goes through the catering flow:

1. `POST /api/v1/bulk-orders/quotes` — the backend checks quantities, notice, capacity and price and returns a quote id, status (`feasible`, `needs_changes`, `not_possible`), issues and alternatives.
2. `POST /api/v1/bulk-orders` with the quote id and customer details — creates a catering order with status **`pending_confirmation`**.
3. The catering team calls to confirm within 4 hours (and arranges any deposit). Never tell the customer a catering order is confirmed before its status is `confirmed`.

## Notice required

| Order size (kitchen portions) | Minimum notice |
| --- | --- |
| 21–60 | 24 hours |
| 61–150 | 48 hours |
| 151–250 | 72 hours |

Some dishes need more notice than the tier (see the table below); the longest requirement applies.

## Capacity and limits

- Maximum per catering order: **250 portions**. Above that, or for events beyond our daily capacity, escalate to the events team (events@baytalghaf.example).
- Daily catering capacity: **300 portions** across all catering orders.
- Collection or delivery between **10:00 and 21:00**, up to 90 days ahead.
- Catering delivery covers zones A–D (see delivery-areas.md). Zone D is catering-only.

## Pricing

| Order size | Discount on food |
| --- | --- |
| up to 50 portions | none |
| 51+ portions | 5% |
| 101+ portions | 8% |

- Quotes are valid for 48 hours and lock the price.
- Orders of AED 2,500 or more need a 50% deposit, arranged by the catering team by bank transfer after confirmation (simulated in this environment — no payment is taken online).
- Free cancellation until 24 hours before collection/delivery; later cancellations are handled by the catering team.

## Dishes available for catering

| Dish | Unit price | Serves | Max per day | Extra notice | Notes |
| --- | --- | --- | --- | --- | --- |
| Shorbat Adas | AED 26 | 1 | 80 | — |  |
| Sambousa Trio | AED 34 | 2 | 150 | — | Sold by the tray of 6 for catering. |
| Nakhi | AED 22 | 1 | 80 | — |  |
| Hummus with Spiced Lamb & Pine Nuts | AED 38 | 2 | 60 | — |  |
| Salatat Al Bait (House Salad) | AED 30 | 1 | 100 | — |  |
| Harees | AED 48 | 1 | 40 | 48 h | Bulk harees is cooked in a dedicated overnight batch and needs at least 48 hours' notice. |
| Lamb Thareed | AED 62 | 1 | 60 | — |  |
| Saloonat Dajaj | AED 52 | 1 | 120 | — |  |
| Lamb Machboos | AED 72 | 1 | 150 | — |  |
| Chicken Machboos | AED 58 | 1 | 200 | — |  |
| Camel Machboos (Thursday) | AED 92 | 1 | 40 | 72 h | Camel meat is ordered specially for catering and needs 72 hours' notice. |
| Saffron Shish Tawook | AED 68 | 1 | 80 | — |  |
| Camel Kofta | AED 76 | 1 | 60 | 48 h | Camel mince for catering needs 48 hours' notice. |
| Vegetable Machboos | AED 48 | 1 | 100 | — |  |
| Bamia Saloona | AED 44 | 1 | 60 | — |  |
| Pumpkin & Chickpea Saloona | AED 44 | 1 | 60 | — |  |
| Luqaimat | AED 32 | 2 | 120 | — | Catering luqaimat are packed with dibs on the side; quantity is counted in portions of 10 pieces. |
| Khanfaroosh | AED 30 | 2 | 60 | — |  |
| Gahwa Emirati (Dallah for the Table) | AED 30 | 3 | 30 | — | Catering gahwa is supplied in insulated flasks (1 flask = 1 dallah). |
| Karak Chai | AED 12 | 1 | 100 | — | Catering karak is supplied in flasks of 8 cups; each unit counts as one cup. |
| Chilled Laban with Mint | AED 14 | 1 | 150 | — |  |
| Limon Na'na | AED 22 | 1 | 100 | — |  |
| Majlis Sharing Platter | AED 329 | 4 | 15 | — | Each platter counts as 4 portions towards catering capacity. |
| Whole Lamb Ouzi | AED 1,450 | 10 | 3 | 48 h | Catering only. Min 1. Each ouzi counts as 12 portions. Maximum 3 per day. |
| Office Machboos Lunch Box | AED 45 | 1 | 150 | — | Catering only. Min 10. Minimum 10 boxes per order; mix of mains allowed by ordering separate lines. |
| Ramadan Iftar Set Menu (per person) | AED 125 | 1 | 120 | 24 h | Iftar catering for groups needs 24 hours' notice. |

Not available in catering quantities (cooked to order): Balaleet, Chebab with Date Syrup & Cream Cheese, Regag with Egg & Cheese, Bayd w Tamat, Weekend Fuala Breakfast Spread, Mehyawa Regag Bites, Saloonat Samak (Monday), Margooga Laham (Tuesday), Madrooba Dajaj (Wednesday), Muhammar with Fried Safi, Hammour Mashwi, Rubyan Mashwi, Rish Ghanam (Lamb Chops), Camel Burger with Loomi Aioli, Date & Camel Milk Ice Cream, Aseedat Bobar (Winter Pumpkin Asida), Friday Family Machboos Platter, Eid Al Etihad Feast (National Day).

## Worked examples

- **40 office lunches:** 40 × Office Machboos Lunch Box = AED 1,800 (no volume discount below 51 portions). Needs at least 24 hours' notice; delivery fee by zone. Mixing mains is fine (e.g. 30 chicken + 10 vegetable; minimum 10 boxes per line).
- **100 portions for an event:** e.g. 100 × Lamb Machboos = AED 7,200 before the 5% discount (51–100 portions). Needs 48 hours' notice and capacity on the day; status stays pending until the catering team confirms.
- **200 machboos in 20 minutes:** impossible. 200 portions need 72 hours' notice, Lamb Machboos is limited to 150 per day, and no kitchen can produce that in 20 minutes. Offer the earliest feasible date (returned by the quote) or a split across dishes, and escalate if needed. Never guarantee.
- **More than 250 portions:** above the per-order maximum — escalate to the events team.
- **Whole Lamb Ouzi:** catering only, 48 hours' notice, maximum 3 per day, serves 10–12.

## Family platters (regular orders)

- Majlis Sharing Platter — AED 329, serves 4, every day from 12:00.
- Friday Family Machboos Platter — AED 349, serves 5, Fridays only, pickup or dine-in, order at least 2 hours ahead.
- Weekend Fuala Breakfast — AED 149, serves 2, Saturdays & Sundays until 12:00.

For “what is the cheapest way to feed N people?”, call `GET /api/v1/menu/feeding-suggestions?guests=N&date=…` — it computes the cheapest combinations of available main dishes. Do not calculate prices from memory.

## Escalation

Escalate (take name, phone and event details; promise a call-back, not a booking) when: the quote status is `not_possible`; the event is above 250 portions; the customer needs services we do not list (staffing, equipment, live cooking, buffets on site); the date is more than 90 days away; or the customer disputes a catering price.

Example allergen note for catering: Office Lunch Box (chicken) contains gluten, milk, sesame, sulphites — each box is labelled.
