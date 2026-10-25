# Data Dictionary

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Definitions of fields, status values, identifiers and business terms used by the API and documents.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/data-dictionary`; live availability must always be checked through the API.

## Identifiers

| Identifier | Format | Example | Notes |
| --- | --- | --- | --- |
| Menu item id | `mi_<name>` | `mi_lamb_machboos` | Stable. The slug (`lamb-machboos`) is accepted wherever an id is. |
| Ingredient id | `ing_<name>` | `ing_loomi` |  |
| Sauce id / slug | `sau_<name>` / kebab-case | `sau_no7` / `sauce-no-7` |  |
| Category id / slug | `cat_<name>` / kebab-case | `cat_rice` / `rice-and-machboos` |  |
| Reservation reference | `RES-` + 6 digits | `RES-482913` | Case/space tolerant: “res 482 913” works. |
| Order number | `ORD-` + 6 digits | `ORD-604215` | Regular orders. |
| Catering order number | `CAT-` + 6 digits | `CAT-118230` | Bulk/catering orders. |
| Catering quote id | `QTE-` + 6 digits | `QTE-310552` | Valid 48 hours. |
| Access token | random URL-safe string | — | Returned once on creation; alternative to phone verification. |
| Option id | string | `hashu_no_raisins` | From a dish's `customizations[].options[].id`. |
| Request id | `X-Request-Id` header | — | Quote it when reporting problems. |

## Money, time and units

- **Money:** `{ amountFils, amount, currency: "AED", formatted }`. 1 AED = 100 fils. Prices include 5% VAT; `vatIncluded` shows the VAT portion.
- **Local date/time:** `date` = YYYY-MM-DD, `time` = HH:mm in Dubai (Asia/Dubai, UTC+04:00). Timestamps are ISO-8601 with `+04:00`.
- **Slot:** 15-minute scheduling unit for orders and reservations.
- **Kitchen portion:** unit of kitchen capacity consumed by a dish (drinks 0, mains 1, platters = people served).
- **Lead time:** minimum minutes from now until food can be ready = max(min lead, longest prep + buffer).

## Menu item fields

| Field | Meaning |
| --- | --- |
| kind | `permanent` = Permanent menu; `daily_special` = Daily / weekly special; `limited_time` = Limited-time offer; `catering` = Catering & large orders only |
| allergens | Allergens present as ingredients in the default recipe (derived). |
| mayContain | Possible traces from shared equipment or suppliers. |
| dietaryTags | `vegan` = Vegan; `vegetarian` = Vegetarian; `pescatarian` = Pescatarian (fish/seafood, no meat); `gluten_free_ingredients` = No gluten-containing ingredients (not certified gluten-free); `dairy_free` = No dairy ingredients; `egg_free` = No egg ingredients; `nut_free_ingredients` = No nut ingredients (not a nut-free kitchen); `sesame_free_ingredients` = No sesame ingredients; `shellfish_free` = No crustaceans or molluscs; `halal` = Halal |
| spiceLevel | 0 not spicy, 1 mild, 2 medium, 3 hot. |
| portion.servesPeople | Number of adults a unit serves. |
| prepTimeMinutes | Kitchen preparation time for one order of the dish. |
| fulfilment | Whether the dish can be dined in, picked up, delivered or pre-ordered for dine-in. |
| bulk | Catering eligibility: bulkOnly, minQuantity, maxQuantityPerDay, minNoticeHours. |
| dailyLimit | Maximum portions per day for regular orders (e.g. harees). |
| availabilityRules | Machine-readable rules (days_of_week, time_window, date_range, during_period, not_during_period, order_types, min_notice_hours, same_day_cutoff, orders_open_from, min_quantity). |
| availability | Evaluation for a specific date/time/mode: orderable, status, reasons[], nextAvailable. |
| customizations | Option groups (single/multiple, required, min/max) with price deltas and the ingredients/sauces each option removes or adds. |

## Availability reason codes

`ITEM_PAUSED`, `ITEM_SOLD_OUT`, `DAILY_LIMIT_REACHED`, `NOT_AVAILABLE_ON_DAY`, `OUTSIDE_ITEM_HOURS`, `OUTSIDE_DATE_RANGE`, `OUTSIDE_SPECIAL_PERIOD`, `NOT_DURING_SPECIAL_PERIOD`, `FULFILMENT_NOT_SUPPORTED`, `INSUFFICIENT_NOTICE`, `SAME_DAY_CUTOFF_PASSED`, `PREORDERS_NOT_OPEN`, `BELOW_MINIMUM_QUANTITY`, `CHANNEL_NOT_ALLOWED`, `BULK_ONLY_ITEM`, `RESTAURANT_CLOSED`, `IN_THE_PAST`

## Allergens

| Code | Label |
| --- | --- |
| `gluten` | Cereals containing gluten (wheat) |
| `crustaceans` | Crustaceans (prawns/shrimp) |
| `molluscs` | Molluscs |
| `eggs` | Eggs |
| `fish` | Fish |
| `peanuts` | Peanuts |
| `soy` | Soy |
| `milk` | Milk / dairy |
| `tree_nuts` | Tree nuts |
| `celery` | Celery |
| `mustard` | Mustard |
| `sesame` | Sesame |
| `sulphites` | Sulphites |
| `lupin` | Lupin |

## Seating areas

| Code | Label |
| --- | --- |
| `no_preference` | Any regular table |
| `indoor` | Main dining hall (indoor) |
| `window` | Creek-view window tables (indoor) |
| `terrace` | Creek terrace (outdoor, seasonal) |
| `majlis` | Private majlis room (floor seating) |

## Reservation statuses

| Status | Label | Holds a table | Meaning |
| --- | --- | --- | --- |
| `pending_confirmation` | Requested — awaiting confirmation | yes | A table is held while the team reviews the request (large groups). Not yet confirmed. |
| `confirmed` | Confirmed | yes | The table is booked. |
| `seated` | Seated | yes | The guests have arrived and are seated. |
| `completed` | Completed | no | The visit is finished. |
| `cancelled` | Cancelled | no | Cancelled by the guest or the restaurant. |
| `no_show` | No-show | no | The guests did not arrive within the grace period. |
| `rejected` | Declined | no | The restaurant could not accommodate the request. |

## Order statuses

| Status | Label | Final | Meaning |
| --- | --- | --- | --- |
| `pending_confirmation` | Received — awaiting confirmation | no | The order is recorded but the restaurant has not yet accepted it. Do not tell the customer it is confirmed. |
| `confirmed` | Confirmed | no | The restaurant has accepted the order and scheduled it for the promised time. |
| `preparing` | Being prepared | no | The kitchen has started cooking. The order can no longer be changed or cancelled online. |
| `ready_for_pickup` | Ready for collection | no | The order is packed and waiting at the collection counter. |
| `out_for_delivery` | Out for delivery | no | A driver has collected the order. |
| `ready_to_serve` | Ready to serve | no | The pre-ordered food is ready to be served at the table. |
| `completed` | Completed | yes | Collected, delivered or served. |
| `cancelled` | Cancelled | yes | Cancelled by the customer or the restaurant. |
| `rejected` | Declined by the restaurant | yes | The restaurant could not accept the order. |
| `not_collected` | Not collected | yes | The order was not collected within the holding time. |
| `delivery_failed` | Delivery failed | yes | The driver could not complete the delivery. |

## Order types and channels

- `pickup`, `delivery`, `dine_in_preorder` (requires a confirmed reservation).
- Channel: `website` (anonymous web/API clients), `phone` (API key with `agent` scope — the voice assistant), `staff` (admin session or staff key).

## Catering quote statuses

- `feasible` — can be ordered as quoted. `needs_changes` — possible with a different date/time or adjustment (see alternatives). `not_possible` — beyond limits; escalate.

## Error codes

| Code | HTTP | Category | Retry? | Meaning |
| --- | --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | validation | no | The request body, query or path parameters failed validation. `details.issues` lists each field. |
| `INVALID_JSON` | 400 | validation | no | The request body is not valid JSON. |
| `PAYLOAD_TOO_LARGE` | 413 | validation | no | The request body exceeds the size limit (64 KB). |
| `ROUTE_NOT_FOUND` | 404 | not_found | no | No API route matches the method and path. |
| `AUTHENTICATION_REQUIRED` | 401 | authentication | no | This endpoint requires an API key or an admin session. |
| `INVALID_API_KEY` | 401 | authentication | no | The API key is unknown or revoked. |
| `INVALID_CREDENTIALS` | 401 | authentication | no | Email or password is incorrect. |
| `FORBIDDEN` | 403 | authorization | no | The credentials are valid but lack the required scope or role. |
| `VERIFICATION_REQUIRED` | 401 | verification | no | Access to a customer record requires the phone number used for the booking/order (`X-Customer-Phone`) or the access token (`X-Access-Token`). |
| `RECORD_NOT_FOUND` | 404 | not_found | no | No order or reservation matches this reference and verification. (For privacy the API does not say which part was wrong.) |
| `TOO_MANY_VERIFICATION_ATTEMPTS` | 429 | rate_limit | yes | Too many failed verification attempts for this reference. Locked for 15 minutes. |
| `RATE_LIMITED` | 429 | rate_limit | yes | Too many requests. See the `Retry-After` header. |
| `NOT_FOUND` | 404 | not_found | no | The requested resource (menu item, ingredient, sauce, document, FAQ, quote…) does not exist. |
| `IDEMPOTENCY_KEY_REUSED` | 422 | validation | no | The Idempotency-Key was already used with a different request body. |
| `IDEMPOTENCY_REQUEST_IN_PROGRESS` | 409 | conflict | yes | A request with the same Idempotency-Key is still being processed. |
| `INVALID_STATUS_TRANSITION` | 409 | conflict | no | The requested status change is not allowed from the current status. |
| `INTERNAL_ERROR` | 500 | server | yes | Unexpected server error. Nothing should be assumed to have happened. |
| `SERVICE_UNAVAILABLE` | 503 | server | yes | A dependency (e.g. the database) is unavailable. |
| `ITEM_UNAVAILABLE` | 422 | unavailable_item | no | One or more dishes cannot be served for the requested date, time or order type. `details.items[]` has per-item reasons, the next available date and suggested alternatives. |
| `UNKNOWN_MENU_ITEM` | 422 | validation | no | An item id in the order does not exist. |
| `INVALID_CUSTOMIZATION` | 422 | validation | no | A selected option does not exist for the item, or the selection breaks the group's rules. `details.availableOptions` lists valid choices. |
| `INVALID_QUANTITY` | 422 | validation | no | Quantity is not a whole number within the allowed range for the item. |
| `BULK_ONLY_ITEM` | 422 | business_rule | no | The item (e.g. Whole Lamb Ouzi, Office Lunch Box) can only be ordered through the catering flow. |
| `REQUIRES_BULK_ORDER` | 422 | business_rule | no | The order exceeds the regular-order portion limit and must be placed as a catering (bulk) order with advance notice. |
| `EMPTY_ORDER` | 422 | validation | no | The order has no items. |
| `INVALID_PHONE` | 422 | validation | no | The phone number is not a valid number. UAE numbers can be local (050 123 4567); international numbers need a country code. |
| `DELIVERY_ADDRESS_REQUIRED` | 422 | validation | no | Delivery orders need an address (area, building/villa and street; unit if applicable). |
| `DELIVERY_AREA_NOT_SERVED` | 422 | business_rule | no | We do not deliver to this area. `details.servedAreas` lists covered areas. |
| `DELIVERY_ZONE_CATERING_ONLY` | 422 | business_rule | no | This area is covered for catering orders only, not regular takeaway delivery. |
| `BELOW_DELIVERY_MINIMUM` | 422 | business_rule | no | The order subtotal is below the minimum for delivery to this zone. |
| `DELIVERY_REQUIRES_UAE_MOBILE` | 422 | business_rule | no | Delivery orders need a UAE mobile number so the driver can call. |
| `DELIVERY_UNAVAILABLE` | 422 | business_rule | yes | Delivery is switched off at the moment. |
| `RESERVATION_REQUIRED_FOR_PREORDER` | 422 | business_rule | no | Dine-in pre-orders must be linked to a confirmed reservation made with the same phone number. |
| `RESERVATION_MISMATCH` | 422 | business_rule | no | The linked reservation is not confirmed, belongs to another phone number, or is for a different date. |
| `TIME_TOO_SOON` | 422 | business_rule | no | The kitchen cannot have the order ready by the requested time. `details.alternatives` has the earliest feasible times. |
| `OUTSIDE_ORDERING_HOURS` | 422 | business_rule | no | The requested time is outside pickup/delivery hours for that day. |
| `TOO_FAR_IN_ADVANCE` | 422 | business_rule | no | The date is beyond the advance-booking window (7 days for orders, 60 days for tables, 90 days for catering). |
| `RESTAURANT_CLOSED` | 422 | business_rule | no | The restaurant is closed (or the relevant service is closed) at the requested date/time. |
| `INVALID_TIME` | 422 | validation | no | Times must fall on 15-minute slots (e.g. 13:00, 13:15). |
| `SLOT_FULL` | 409 | conflict | no | The kitchen is fully booked for that time slot. `details.alternatives` lists nearby times. |
| `ORDERING_PAUSED` | 422 | business_rule | yes | The restaurant has temporarily paused new orders. |
| `DUPLICATE_ORDER` | 409 | conflict | no | An identical order for the same phone number and time was placed in the last few minutes. `details.existingOrderNumber` gives its reference. |
| `ORDER_NOT_MODIFIABLE` | 409 | conflict | no | The order's status no longer allows changes or cancellation online (e.g. it is being prepared). |
| `MODIFICATION_WINDOW_CLOSED` | 422 | business_rule | no | Changes must be made before the cut-off (30 minutes before the order time / 2 hours before a reservation). |
| `CANCELLATION_WINDOW_CLOSED` | 422 | business_rule | no | The record can no longer be cancelled online (preparation has started, or catering free-cancellation period has passed). |
| `RESERVATIONS_PAUSED` | 422 | business_rule | yes | The restaurant has paused new reservations. |
| `INVALID_PARTY_SIZE` | 422 | validation | no | Party size must be a positive whole number. |
| `PARTY_TOO_LARGE` | 422 | business_rule | no | The party exceeds the largest bookable table (20 guests). |
| `DATE_IN_PAST` | 422 | validation | no | The requested date/time has already passed. |
| `INSUFFICIENT_NOTICE` | 422 | business_rule | no | Not enough advance notice for this booking or item. |
| `OUTSIDE_SEATING_HOURS` | 422 | business_rule | no | The start time is outside reservation hours for that day (last seating is 90 minutes before closing). |
| `MAJLIS_MIN_PARTY` | 422 | business_rule | no | Private majlis rooms are for groups of 6 or more. |
| `MAJLIS_NOTICE` | 422 | business_rule | no | Majlis rooms need 24 hours' notice. |
| `TERRACE_CLOSED` | 422 | business_rule | no | The outdoor terrace is closed for the season (May–mid-October) or for weather. |
| `NO_TABLE_AVAILABLE` | 409 | conflict | no | No suitable table is free at that time. `details.alternatives` lists nearby times (and `details.otherDates` if the day is full). |
| `SEATING_PREFERENCE_UNAVAILABLE` | 409 | conflict | no | The requested seating area is fully booked at that time, although other areas may be free (`details.availableAreas`). |
| `DUPLICATE_RESERVATION` | 409 | conflict | no | This phone number already has an active reservation overlapping that time. `details.existingReference` gives it. |
| `RESERVATION_NOT_MODIFIABLE` | 409 | conflict | no | The reservation is cancelled, completed or otherwise no longer changeable. |
| `QUOTE_EXPIRED` | 409 | conflict | no | The catering quote has expired (quotes are valid for 48 hours). |
| `QUOTE_NOT_FEASIBLE` | 422 | business_rule | no | The quote has blocking issues and cannot be turned into an order. |
| `QUOTE_ALREADY_USED` | 409 | conflict | no | An order has already been placed from this quote. |
| `BULK_NOT_FEASIBLE` | 422 | business_rule | no | The catering request cannot be fulfilled as specified (notice, capacity or item limits). |

## Business terms

| Term | Meaning |
| --- | --- |
| Machboos (مجبوس) | Emirati spiced rice cooked with meat, fish or vegetables. |
| Bezar (بزار) | House Emirati spice blend. |
| Loomi (لومي) | Dried black lime (“dried lemon”). |
| Hashu (حشو) | Caramelised onion and raisin topping with ghee. |
| Dakkus (دقوس) | Tomato-chilli sauce served with rice dishes. |
| Majlis (مجلس) | Traditional sitting room; our private floor-seating rooms. |
| Fuala (فوالة) | Hospitality spread offered to guests; our weekend breakfast. |
| Gahwa (قهوة) | Emirati coffee with cardamom and saffron, poured from a dallah. |
| Dallah (دلة) | Traditional brass coffee pot. |
| Iftar (إفطار) | The meal at sunset that breaks the Ramadan fast. |
| Eid Al Etihad | UAE National Day (2 December). |
| Duty manager | Senior staff member on shift who handles allergies, complaints and exceptions. |
| Verification | Reference + phone (or access token). Locked for 15 minutes after 5 failures. |
