# Reservations & Seating

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Reservation policies, party sizes, table types, seating preferences, cancellations, late arrivals, walk-ins and group bookings.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/reservations-and-seating`; live availability must always be checked through the API.

## Summary for agents

- Tables can be booked for **1–20 guests**, from 30 minutes ahead up to **60 days** ahead, on 15-minute slots.
- Groups of **13–20** are accepted as a *request* (status `pending_confirmation`, table held) and confirmed by the team. Larger groups or private hire: events team.
- A seating area is a requirement when requested: if it is full the API returns `SEATING_PREFERENCE_UNAVAILABLE` with alternatives. It never silently moves guests.
- A phone number is mandatory for every reservation (UAE or international with country code).
- Always check `GET /api/v1/reservations/availability` first, then book with `POST /api/v1/reservations`. Only call a booking confirmed when the response status is `confirmed`.

## Reservation hours

| Day | Open | Kitchen last orders | Last reservation start |
| --- | --- | --- | --- |
| Monday | 08:00–23:00 | 22:30 | 21:30 |
| Tuesday | 08:00–23:00 | 22:30 | 21:30 |
| Wednesday | 08:00–23:00 | 22:30 | 21:30 |
| Thursday | 08:00–23:00 | 22:30 | 21:30 |
| Friday | 08:00–00:00 (midnight) | 23:30 | 22:30 |
| Saturday | 08:00–00:00 (midnight) | 23:30 | 22:30 |
| Sunday | 08:00–23:00 | 22:30 | 21:30 |

The last reservation starts 90 minutes before closing. Breakfast tables can be booked from opening time.

## How long is a table booked?

| Party size | Table time |
| --- | --- |
| 1–2 | 90 minutes |
| 3–6 | 120 minutes |
| 7–12 | 150 minutes |
| 13–20 | 180 minutes |

Majlis bookings are 180 minutes. There is a 15-minute reset between bookings on the same table.

## Seating areas

| Area | Tables | Party sizes | Notes |
| --- | --- | --- | --- |
| Main dining hall (indoor) | 14 | 1–14 | Main hall, air-conditioned; booths and a long table (L1, 9–14 guests); high-chair space at several tables. |
| Creek-view window tables (indoor) | 6 | 1–6 | Indoor tables along the glass facing the creek; most requested — book early. |
| Creek terrace (outdoor, seasonal) | 9 | 1–8 | Outdoor creek terrace, open 15/10–30/04 (day/month) and weather permitting. Heaters are not available; summer closure. |
| Private majlis room (floor seating) | 2 | 6–20 | Two private rooms with floor seating: Majlis Al Sidr (6–10, low chairs on request) and Majlis Al Ghaf (10–20). Minimum 6 guests, book 24 h ahead, minimum spend AED 150 per person. |

Full table list:

| Table | Area | Seats | Bookable online | Features |
| --- | --- | --- | --- | --- |
| W1 | window | 1–2 | yes | creek_view, wheelchair_accessible |
| W2 | window | 1–2 | yes | creek_view, wheelchair_accessible |
| W3 | window | 2–4 | yes | creek_view, wheelchair_accessible |
| W4 | window | 2–4 | yes | creek_view, wheelchair_accessible |
| W5 | window | 2–4 | yes | creek_view |
| W6 | window | 4–6 | yes | creek_view, wheelchair_accessible |
| M1 | indoor | 1–2 | no (walk-ins) | walk_in_only, wheelchair_accessible |
| M2 | indoor | 1–2 | no (walk-ins) | walk_in_only |
| M3 | indoor | 1–2 | yes | wheelchair_accessible |
| M4 | indoor | 1–2 | yes | — |
| M5 | indoor | 2–4 | no (walk-ins) | walk_in_only, wheelchair_accessible |
| M6 | indoor | 2–4 | yes | wheelchair_accessible, high_chair_space |
| M7 | indoor | 2–4 | yes | high_chair_space |
| M8 | indoor | 2–4 | yes | booth |
| M9 | indoor | 2–4 | yes | booth |
| M10 | indoor | 2–4 | yes | wheelchair_accessible |
| M11 | indoor | 4–6 | yes | wheelchair_accessible, high_chair_space |
| M12 | indoor | 4–6 | yes | high_chair_space |
| M13 | indoor | 6–8 | yes | wheelchair_accessible, high_chair_space |
| L1 | indoor | 9–14 | yes | long_table, wheelchair_accessible, high_chair_space |
| T1 | terrace | 1–2 | yes | outdoor, creek_view |
| T2 | terrace | 1–2 | yes | outdoor, creek_view |
| T3 | terrace | 1–2 | yes | outdoor |
| T4 | terrace | 2–4 | yes | outdoor, creek_view, wheelchair_accessible |
| T5 | terrace | 2–4 | yes | outdoor, creek_view |
| T6 | terrace | 2–4 | yes | outdoor, wheelchair_accessible |
| T7 | terrace | 2–4 | yes | outdoor |
| T8 | terrace | 4–6 | yes | outdoor, creek_view |
| T9 | terrace | 6–8 | yes | outdoor, creek_view |
| MJ-SIDR | majlis | 6–10 | yes | private_room, floor_seating, low_chairs_on_request |
| MJ-GHAF | majlis | 10–20 | yes | private_room, floor_seating |

Walk-in tables (never offered online): M1, M2, M5. Walk-ins are welcome whenever a table is free; there is no walk-in waiting list by phone.

## Seating preferences

- Guests may ask for indoor, window, terrace or majlis seating. With **no preference** we choose the best-fitting table (main hall first, then terrace, then window).
- A preference is guaranteed only if the API booked that area (`seatingArea` in the response). We cannot promise a specific table number.
- If a window table is fully booked we cannot “make one available”: offer another time with window availability or a different area.
- Wheelchair users: set `wheelchairAccess: true` and only step-free, accessible tables are offered (main hall, window, terrace T4/T6). The majlis rooms have floor seating.
- High chairs: up to 4 per booking (6 in the restaurant). Children count towards the party size.

## Large groups

- Up to 12 guests: confirmed instantly if a table is free.
- 13–20 guests: a table is held and the booking is `pending_confirmation` until the team calls back (usually within 4 hours).
- More than 20: not bookable online or by phone — pass to the events team (events@baytalghaf.example).
- The party size must be the number of guests expected. If numbers are uncertain, book for the likely number and update it up to the change cut-off; tables for large groups may be reduced if far fewer guests arrive.

## Changes, cancellations and late arrivals

- Changes (date, time, party size, area, requests) can be made online or by phone until **2 hours** before the booking, subject to availability. After that, the team must be called.
- Cancellation is free at any time before the booking time. Cancelling less than 2 hours before is recorded as a late cancellation.
- Late arrival: tables are held for **15 minutes**. After that the table may be released (status `no_show`). Guests running late should call.
- No deposit or card guarantee is taken for regular tables. Majlis minimum spend is settled at the end of the meal.
- Cancelling a reservation also cancels any linked dine-in pre-order that has not started cooking.

## Verification

To read, change or cancel a reservation the caller must give the reference (e.g. RES-482913) **and** the phone number used to book (sent as `X-Customer-Phone`), or the access token returned at booking. The API answers `RECORD_NOT_FOUND` if either is wrong, and locks the reference for 15 minutes after 5 failed attempts.

## Statuses

| Status | Meaning |
| --- | --- |
| `pending_confirmation` | Requested — awaiting confirmation — A table is held while the team reviews the request (large groups). Not yet confirmed. |
| `confirmed` | Confirmed — The table is booked. |
| `seated` | Seated — The guests have arrived and are seated. |
| `completed` | Completed — The visit is finished. |
| `cancelled` | Cancelled — Cancelled by the guest or the restaurant. |
| `no_show` | No-show — The guests did not arrive within the grace period. |
| `rejected` | Declined — The restaurant could not accommodate the request. |

## Closures affecting reservations

| Date | From | To | Reason | Note |
| --- | --- | --- | --- | --- |
| 2026-11-14 | 18:00 | close | Private event (full dining-room buyout) | The dining room is closed to the public from 18:00 on Saturday 14 November 2026 for a private event. Takeaway and delivery continue as normal. |
| 2027-03-10 | 00:00 | 14:00 | Eid Al Fitr — first day (provisional date) | On the first day of Eid Al Fitr (provisionally 10 March 2027) we open at 14:00. |

## Reservations and special days

- During Ramadan the dining room opens at 12:00; iftar tables (from 17:30) are the busiest of the year and should be booked early. Iftar Set Menus are ordered as a dine-in pre-order linked to the reservation.
- Friday evenings and Saturday lunch are the busiest regular times.
