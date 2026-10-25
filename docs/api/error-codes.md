# Error codes

> Generated from `src/server/errors.ts`. Branch on `error.code`; never on the message text.

```json
{
  "error": {
    "code": "ITEM_UNAVAILABLE",
    "message": "Friday Family Machboos Platter is only available on Fridays; Tuesday 27 October 2026 is a Tuesday.",
    "status": 422,
    "category": "unavailable_item",
    "retryable": false,
    "requestId": "req_2kV3m0x9QeHf",
    "details": {
      "issues": [
        "…"
      ],
      "items": [
        {
          "itemId": "mi_friday_platter",
          "reasons": [
            "NOT_AVAILABLE_ON_DAY"
          ],
          "nextAvailable": {
            "date": "2026-10-30",
            "time": "12:00"
          },
          "alternatives": [
            "…"
          ]
        }
      ]
    }
  }
}
```

How to tell problems apart:

- **Invalid request** (fix the request or ask the customer): `400 VALIDATION_ERROR`, `INVALID_JSON`, `422` validation-category codes such as `INVALID_PHONE`, `INVALID_QUANTITY`.
- **Unavailable item** (offer `nextAvailable` / `alternatives`): `422 ITEM_UNAVAILABLE` (category `unavailable_item`).
- **Business rule** (explain and offer alternatives): `422` with category `business_rule`.
- **Conflict** (someone else took the slot/table, duplicate, wrong state): `409`.
- **Server failure** (nothing happened; retry once, then apologise): `500 INTERNAL_ERROR`, `503 SERVICE_UNAVAILABLE` — `retryable: true`.

| Code | HTTP | Category | Retryable | Meaning | What an agent should do |
| --- | --- | --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | validation | no | The request body, query or path parameters failed validation. `details.issues` lists each field. | Ask the customer for the missing or invalid information, then retry with corrected values. |
| `INVALID_JSON` | 400 | validation | no | The request body is not valid JSON. | Fix the client request; this is not a customer problem. |
| `PAYLOAD_TOO_LARGE` | 413 | validation | no | The request body exceeds the size limit (64 KB). | Send a smaller request. |
| `ROUTE_NOT_FOUND` | 404 | not_found | no | No API route matches the method and path. | Check the URL against the OpenAPI specification. |
| `AUTHENTICATION_REQUIRED` | 401 | authentication | no | This endpoint requires an API key or an admin session. | Send `Authorization: Bearer <api key>`. |
| `INVALID_API_KEY` | 401 | authentication | no | The API key is unknown or revoked. | Stop and alert an operator; do not retry with the same key. |
| `INVALID_CREDENTIALS` | 401 | authentication | no | Email or password is incorrect. | Admin login only. |
| `FORBIDDEN` | 403 | authorization | no | The credentials are valid but lack the required scope or role. | This action is reserved for restaurant staff; offer to escalate to the team. |
| `VERIFICATION_REQUIRED` | 401 | verification | no | Access to a customer record requires the phone number used for the booking/order (`X-Customer-Phone`) or the access token (`X-Access-Token`). | Ask the caller for the phone number used when booking, then retry with `X-Customer-Phone`. |
| `RECORD_NOT_FOUND` | 404 | not_found | no | No order or reservation matches this reference and verification. (For privacy the API does not say which part was wrong.) | Read the reference back to the caller and confirm the phone number; after two failures, offer to transfer to staff. |
| `TOO_MANY_VERIFICATION_ATTEMPTS` | 429 | rate_limit | yes | Too many failed verification attempts for this reference. Locked for 15 minutes. | Do not keep guessing. Offer to have the team call the customer back. |
| `RATE_LIMITED` | 429 | rate_limit | yes | Too many requests. See the `Retry-After` header. | Wait for the number of seconds in `Retry-After` and retry. |
| `NOT_FOUND` | 404 | not_found | no | The requested resource (menu item, ingredient, sauce, document, FAQ, quote…) does not exist. | Use the list or search endpoints to find the correct id; never guess. |
| `IDEMPOTENCY_KEY_REUSED` | 422 | validation | no | The Idempotency-Key was already used with a different request body. | Generate a new Idempotency-Key for each distinct order or booking. |
| `IDEMPOTENCY_REQUEST_IN_PROGRESS` | 409 | conflict | yes | A request with the same Idempotency-Key is still being processed. | Wait a second and retry with the same key; you will receive the original result. |
| `INVALID_STATUS_TRANSITION` | 409 | conflict | no | The requested status change is not allowed from the current status. | Re-read the record's status and allowed transitions. |
| `INTERNAL_ERROR` | 500 | server | yes | Unexpected server error. Nothing should be assumed to have happened. | Do not tell the customer the action succeeded. Retry once (with the same Idempotency-Key for creates); if it fails again, apologise and offer a call-back. |
| `SERVICE_UNAVAILABLE` | 503 | server | yes | A dependency (e.g. the database) is unavailable. | Retry after a short wait; if it persists, take the customer's details for a call-back. Never confirm anything. |
| `ITEM_UNAVAILABLE` | 422 | unavailable_item | no | One or more dishes cannot be served for the requested date, time or order type. `details.items[]` has per-item reasons, the next available date and suggested alternatives. | Explain the reason (e.g. Fridays only), offer `nextAvailable` or one of `alternatives`, and re-quote. |
| `UNKNOWN_MENU_ITEM` | 422 | validation | no | An item id in the order does not exist. | Search the menu (`GET /menu/search`) to resolve the dish the customer means. |
| `INVALID_CUSTOMIZATION` | 422 | validation | no | A selected option does not exist for the item, or the selection breaks the group's rules. `details.availableOptions` lists valid choices. | Offer only the listed options; anything else is not possible. |
| `INVALID_QUANTITY` | 422 | validation | no | Quantity is not a whole number within the allowed range for the item. | Tell the customer the maximum per order; very large quantities go through a catering quote. |
| `BULK_ONLY_ITEM` | 422 | business_rule | no | The item (e.g. Whole Lamb Ouzi, Office Lunch Box) can only be ordered through the catering flow. | Request a quote with `POST /bulk-orders/quotes`. |
| `REQUIRES_BULK_ORDER` | 422 | business_rule | no | The order exceeds the regular-order portion limit and must be placed as a catering (bulk) order with advance notice. | Explain the limit and switch to `POST /bulk-orders/quotes`. |
| `EMPTY_ORDER` | 422 | validation | no | The order has no items. | Ask what the customer would like to order. |
| `INVALID_PHONE` | 422 | validation | no | The phone number is not a valid number. UAE numbers can be local (050 123 4567); international numbers need a country code. | Read the number back digit by digit and ask the customer to confirm it. |
| `DELIVERY_ADDRESS_REQUIRED` | 422 | validation | no | Delivery orders need an address (area, building/villa and street; unit if applicable). | Ask for the missing address fields listed in `details.missing`. |
| `DELIVERY_AREA_NOT_SERVED` | 422 | business_rule | no | We do not deliver to this area. `details.servedAreas` lists covered areas. | Offer pickup instead; do not promise delivery. |
| `DELIVERY_ZONE_CATERING_ONLY` | 422 | business_rule | no | This area is covered for catering orders only, not regular takeaway delivery. | Offer pickup, or a catering quote if the order is large. |
| `BELOW_DELIVERY_MINIMUM` | 422 | business_rule | no | The order subtotal is below the minimum for delivery to this zone. | Tell the customer the minimum (`details.minimumOrder`) and offer to add items or switch to pickup. |
| `DELIVERY_REQUIRES_UAE_MOBILE` | 422 | business_rule | no | Delivery orders need a UAE mobile number so the driver can call. | Ask for a UAE mobile number (05X XXX XXXX). |
| `DELIVERY_UNAVAILABLE` | 422 | business_rule | yes | Delivery is switched off at the moment. | Offer pickup. |
| `RESERVATION_REQUIRED_FOR_PREORDER` | 422 | business_rule | no | Dine-in pre-orders must be linked to a confirmed reservation made with the same phone number. | Book a table first (`POST /reservations`), then place the pre-order with its reference. |
| `RESERVATION_MISMATCH` | 422 | business_rule | no | The linked reservation is not confirmed, belongs to another phone number, or is for a different date. | Check the reservation reference and date with the customer. |
| `TIME_TOO_SOON` | 422 | business_rule | no | The kitchen cannot have the order ready by the requested time. `details.alternatives` has the earliest feasible times. | Offer the earliest time in `details.alternatives`; never promise the original time. |
| `OUTSIDE_ORDERING_HOURS` | 422 | business_rule | no | The requested time is outside pickup/delivery hours for that day. | Offer one of `details.alternatives`. |
| `TOO_FAR_IN_ADVANCE` | 422 | business_rule | no | The date is beyond the advance-booking window (7 days for orders, 60 days for tables, 90 days for catering). | Ask the customer to call back nearer the date, or use catering for large orders. |
| `RESTAURANT_CLOSED` | 422 | business_rule | no | The restaurant is closed (or the relevant service is closed) at the requested date/time. | Give the opening hours from `GET /restaurant/hours` and offer another time. |
| `INVALID_TIME` | 422 | validation | no | Times must fall on 15-minute slots (e.g. 13:00, 13:15). | Round to the nearest slot and confirm with the customer. |
| `SLOT_FULL` | 409 | conflict | no | The kitchen is fully booked for that time slot. `details.alternatives` lists nearby times. | Offer the nearest alternative time. |
| `ORDERING_PAUSED` | 422 | business_rule | yes | The restaurant has temporarily paused new orders. | Apologise and suggest trying later; take a message if needed. |
| `DUPLICATE_ORDER` | 409 | conflict | no | An identical order for the same phone number and time was placed in the last few minutes. `details.existingOrderNumber` gives its reference. | Ask whether the customer wants a second, identical order; if so, change something or wait and retry. |
| `ORDER_NOT_MODIFIABLE` | 409 | conflict | no | The order's status no longer allows changes or cancellation online (e.g. it is being prepared). | Offer to pass the request to the team, who will call back; do not promise the change. |
| `MODIFICATION_WINDOW_CLOSED` | 422 | business_rule | no | Changes must be made before the cut-off (30 minutes before the order time / 2 hours before a reservation). | Explain the cut-off and offer to escalate to staff. |
| `CANCELLATION_WINDOW_CLOSED` | 422 | business_rule | no | The record can no longer be cancelled online (preparation has started, or catering free-cancellation period has passed). | Escalate to staff; do not promise a refund. |
| `RESERVATIONS_PAUSED` | 422 | business_rule | yes | The restaurant has paused new reservations. | Mention that walk-ins are welcome subject to availability. |
| `INVALID_PARTY_SIZE` | 422 | validation | no | Party size must be a positive whole number. | Ask how many guests, including children. |
| `PARTY_TOO_LARGE` | 422 | business_rule | no | The party exceeds the largest bookable table (20 guests). | Offer the events team (events@…) for private hire; do not book. |
| `DATE_IN_PAST` | 422 | validation | no | The requested date/time has already passed. | Confirm the intended date (Dubai time). |
| `INSUFFICIENT_NOTICE` | 422 | business_rule | no | Not enough advance notice for this booking or item. | Offer the next time that satisfies the notice period. |
| `OUTSIDE_SEATING_HOURS` | 422 | business_rule | no | The start time is outside reservation hours for that day (last seating is 90 minutes before closing). | Offer one of `details.alternatives`. |
| `MAJLIS_MIN_PARTY` | 422 | business_rule | no | Private majlis rooms are for groups of 6 or more. | Offer a regular table. |
| `MAJLIS_NOTICE` | 422 | business_rule | no | Majlis rooms need 24 hours' notice. | Offer a regular table or a later date. |
| `TERRACE_CLOSED` | 422 | business_rule | no | The outdoor terrace is closed for the season (May–mid-October) or for weather. | Offer indoor or window seating. |
| `NO_TABLE_AVAILABLE` | 409 | conflict | no | No suitable table is free at that time. `details.alternatives` lists nearby times (and `details.otherDates` if the day is full). | Offer the alternatives; never promise a table that the API did not confirm. |
| `SEATING_PREFERENCE_UNAVAILABLE` | 409 | conflict | no | The requested seating area is fully booked at that time, although other areas may be free (`details.availableAreas`). | Offer another area at the same time or the same area at another time. |
| `DUPLICATE_RESERVATION` | 409 | conflict | no | This phone number already has an active reservation overlapping that time. `details.existingReference` gives it. | Offer to modify the existing booking instead of creating a second one. |
| `RESERVATION_NOT_MODIFIABLE` | 409 | conflict | no | The reservation is cancelled, completed or otherwise no longer changeable. | Offer to make a new reservation. |
| `QUOTE_EXPIRED` | 409 | conflict | no | The catering quote has expired (quotes are valid for 48 hours). | Request a new quote; prices and capacity may have changed. |
| `QUOTE_NOT_FEASIBLE` | 422 | business_rule | no | The quote has blocking issues and cannot be turned into an order. | Explain `details.issues` and offer `details.alternatives` or escalation to the events team. |
| `QUOTE_ALREADY_USED` | 409 | conflict | no | An order has already been placed from this quote. | Look up the existing order with `details.orderNumber`. |
| `BULK_NOT_FEASIBLE` | 422 | business_rule | no | The catering request cannot be fulfilled as specified (notice, capacity or item limits). | Offer the feasible alternatives returned; escalate above-capacity events. |

Availability reason codes (inside `availability.reasons[]` and `details.items[].reasons`): `ITEM_PAUSED`, `ITEM_SOLD_OUT`, `DAILY_LIMIT_REACHED`, `NOT_AVAILABLE_ON_DAY`, `OUTSIDE_ITEM_HOURS`, `OUTSIDE_DATE_RANGE`, `OUTSIDE_SPECIAL_PERIOD`, `NOT_DURING_SPECIAL_PERIOD`, `FULFILMENT_NOT_SUPPORTED`, `INSUFFICIENT_NOTICE`, `SAME_DAY_CUTOFF_PASSED`, `PREORDERS_NOT_OPEN`, `BELOW_MINIMUM_QUANTITY`, `CHANNEL_NOT_ALLOWED`, `BULK_ONLY_ITEM`, `RESTAURANT_CLOSED`, `IN_THE_PAST`.

Catering quote issue codes (inside `issues[]`, each with `blocking`): `BULK_ORDERS_PAUSED`, `ITEM_NOT_BULK_ELIGIBLE`, `BELOW_ITEM_MINIMUM`, `ITEM_DAILY_MAXIMUM_EXCEEDED`, `EXCEEDS_MAX_BULK_PORTIONS`, `INSUFFICIENT_NOTICE`, `DAILY_CAPACITY_EXCEEDED`, `OUTSIDE_FULFILMENT_HOURS`, `RESTAURANT_CLOSED`, `TOO_FAR_IN_ADVANCE`, `DATE_IN_PAST`, `ITEM_UNAVAILABLE_ON_DATE`, `DELIVERY_ADDRESS_REQUIRED`, `DELIVERY_AREA_NOT_SERVED`, `BELOW_DELIVERY_MINIMUM`, plus line validation codes.
