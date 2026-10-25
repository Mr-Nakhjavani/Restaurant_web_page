# Ordering, Pickup & Takeaway

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Pickup procedures, pre-orders, delivery, customer details, modifications, cancellations, payment methods and order statuses.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/ordering-and-takeaway`; live availability must always be checked through the API.

## Order types

| Type | API value | What it means |
| --- | --- | --- |
| Pickup / takeaway | `pickup` | Order ahead and collect at the takeaway counter (Heritage Quarter Gate 3) at the confirmed time. |
| Delivery | `delivery` | Our own drivers deliver within central Dubai, 12:00–22:30. See delivery-areas.md. |
| Dine-in pre-order | `dine_in_preorder` | Order before arriving so food is ready when you sit down. Requires a confirmed reservation made with the same phone number; food is served between the reservation time and one hour after. |

Guests can always order at the table without a pre-order, and can place takeaway orders without any reservation.

## What the restaurant needs

- Customer name and a valid phone number (UAE local format like 050 123 4567, or international with country code). Delivery needs a **UAE mobile** number.
- Items, quantities and any customisations (option ids from the menu).
- Pickup time, delivery time, or ASAP.
- Delivery only: area, building/villa, street, and unit/floor if applicable; landmark and instructions are optional. No address is needed for pickup.
- Optional: e-mail, the name (and phone) of someone else collecting, special instructions (max 300 characters).

## Timing rules

- Times are booked in 15-minute slots.
- Minimum lead time = the longest preparation time in the order + 10 minutes buffer, and never less than 20 minutes. For example, an order with Hammour Mashwi (20 min) needs at least 30 minutes.
- Food can be ready from 30 minutes after opening until 15 minutes before closing (e.g. 08:30–22:45 Monday–Thursday).
- Orders can be scheduled up to 7 days ahead. Further ahead: call back nearer the date, or use catering for large orders.
- Kitchen capacity: 30 kitchen portions and 8 orders per 15-minute slot. If a slot is full the API offers the nearest free slots — it never accepts a time it cannot meet.
- With ASAP, the API picks the earliest slot at which every dish in the basket is available.
- How early to order: at least the lead time above; for Friday lunch and Ramadan iftar, ordering a day ahead is recommended.

Preparation times:

| Dish | Preparation |
| --- | --- |
| Balaleet | 12 min |
| Chebab with Date Syrup & Cream Cheese | 15 min |
| Regag with Egg & Cheese | 10 min |
| Bayd w Tamat | 12 min |
| Weekend Fuala Breakfast Spread | 20 min |
| Shorbat Adas | 8 min |
| Sambousa Trio | 10 min |
| Nakhi | 6 min |
| Hummus with Spiced Lamb & Pine Nuts | 8 min |
| Salatat Al Bait (House Salad) | 6 min |
| Mehyawa Regag Bites | 8 min |
| Harees | 8 min |
| Lamb Thareed | 15 min |
| Saloonat Dajaj | 15 min |
| Saloonat Samak (Monday) | 18 min |
| Margooga Laham (Tuesday) | 20 min |
| Madrooba Dajaj (Wednesday) | 15 min |
| Lamb Machboos | 15 min |
| Chicken Machboos | 15 min |
| Muhammar with Fried Safi | 18 min |
| Camel Machboos (Thursday) | 15 min |
| Hammour Mashwi | 20 min |
| Rubyan Mashwi | 18 min |
| Rish Ghanam (Lamb Chops) | 20 min |
| Saffron Shish Tawook | 18 min |
| Camel Kofta | 18 min |
| Camel Burger with Loomi Aioli | 15 min |
| Vegetable Machboos | 15 min |
| Bamia Saloona | 12 min |
| Pumpkin & Chickpea Saloona | 12 min |
| Luqaimat | 10 min |
| Khanfaroosh | 12 min |
| Date & Camel Milk Ice Cream | 4 min |
| Aseedat Bobar (Winter Pumpkin Asida) | 6 min |
| Majlis Sharing Platter | 25 min |
| Friday Family Machboos Platter | 30 min |
| Ramadan Iftar Set Menu (per person) | 20 min |
| Eid Al Etihad Feast (National Day) | 30 min |

## Size limits

- Maximum 10 of any one dish per regular order (some dishes have lower limits).
- Maximum 20 kitchen portions per regular order (drinks do not count). Larger orders are **catering orders** (see bulk-and-catering-orders.md).
- Orders above AED 1,500 are accepted as `pending_confirmation` and confirmed by the team by phone.
- Phone numbers with 2 or more uncollected orders in the last 90 days are also confirmed manually.

## Collecting a pickup order

1. Come to the takeaway counter at Heritage Quarter Gate 3 on Al Seef Street (10-minute drop-off bay outside).
2. Give the order number (e.g. ORD-604215) and the name on the order. Someone else may collect if their name was given or they quote the order number and phone number.
3. Pay by cash, card, Apple Pay or Google Pay.
4. Orders are held for **60 minutes** after the pickup time. Hot food is kept warm for about 30 minutes; after 60 minutes the order may be marked `not_collected` and is not kept for food-safety reasons. Late? Call so we can re-time it if the kitchen has not started.

## Payment

| Order type | Methods |
| --- | --- |
| pickup | Cash on collection (AED); Card or Apple Pay / Google Pay on collection |
| delivery | Cash on delivery (AED); Card on delivery (driver's card machine) |
| dine_in_preorder | Pay at the table after the meal |

There is **no online card payment** in this environment and card numbers are never collected by phone or online. Prices include 5% VAT; delivery fees are shown separately.

## Changing or cancelling an order

- Changes (items, time, address, instructions) are possible until **30 minutes before** the pickup/delivery time or until preparation starts, whichever is earlier, and only while the status is `pending_confirmation` or `confirmed`. Every change is re-checked for availability, capacity and price.
- Cancellation is free until the kitchen starts preparing the order (shown as `allowedActions.cancellableUntil`). After that, the team decides case by case.
- Changing an order into a large one (e.g. from 6 to 50 meals) turns it into a catering order and needs catering notice — it cannot keep the original time.
- Catering (bulk) orders are changed through the catering team.

## Statuses

| Status | Meaning |
| --- | --- |
| `pending_confirmation` | Received — awaiting confirmation — The order is recorded but the restaurant has not yet accepted it. Do not tell the customer it is confirmed. |
| `confirmed` | Confirmed — The restaurant has accepted the order and scheduled it for the promised time. |
| `preparing` | Being prepared — The kitchen has started cooking. The order can no longer be changed or cancelled online. |
| `ready_for_pickup` | Ready for collection — The order is packed and waiting at the collection counter. |
| `out_for_delivery` | Out for delivery — A driver has collected the order. |
| `ready_to_serve` | Ready to serve — The pre-ordered food is ready to be served at the table. |
| `completed` | Completed — Collected, delivered or served. |
| `cancelled` | Cancelled — Cancelled by the customer or the restaurant. |
| `rejected` | Declined by the restaurant — The restaurant could not accept the order. |
| `not_collected` | Not collected — The order was not collected within the holding time. |
| `delivery_failed` | Delivery failed — The driver could not complete the delivery. |

Typical flow: `pending_confirmation` (only when manual review applies) → `confirmed` → `preparing` → `ready_for_pickup` / `out_for_delivery` / `ready_to_serve` → `completed`. Failure paths: `rejected`, `cancelled`, `not_collected`, `delivery_failed`.

## Dishes with ordering restrictions

- Not available for delivery: Balaleet, Chebab with Date Syrup & Cream Cheese, Regag with Egg & Cheese, Bayd w Tamat, Weekend Fuala Breakfast Spread, Mehyawa Regag Bites, Date & Camel Milk Ice Cream, Gahwa Emirati (Dallah for the Table), Friday Family Machboos Platter, Ramadan Iftar Set Menu (per person).
- Not available for pickup: none.
- Catering only (not in regular orders): Whole Lamb Ouzi, Office Machboos Lunch Box.
- Day- and season-specific dishes: see special-days-and-seasonal-menu.md. The backend rejects them on other days with `ITEM_UNAVAILABLE` and returns `nextAvailable`.

## When something goes wrong

- **An item becomes unavailable after ordering:** the team removes it, re-totals the order and calls the customer to offer a substitute of similar value or a cancellation. Nothing is charged for removed items.
- **Missing or incorrect item:** report within 24 hours by phone or WhatsApp with the order number (a photo helps). We replace the item or refund/credit it. Refunds for items paid by card go back to the original card through the restaurant's card terminal; cash payments are refunded in cash or as a credit note. No card details are ever taken over the phone.
- **The restaurant is late:** we will tell the customer the new time; customers may cancel without charge if the order is more than 20 minutes late.

## Verification

Order lookups need the order number plus the phone number used (`X-Customer-Phone`) or the access token. Staff can see all orders.

## Allergy notes

If the special instructions mention an allergy, the order is flagged and the duty manager calls the customer. The kitchen still cannot guarantee the absence of any allergen.
