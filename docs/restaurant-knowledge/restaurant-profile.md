# Restaurant Profile — Bayt Al Ghaf

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Business identity, location, contact details, cuisine, facilities, opening hours and general house rules.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/restaurant-profile`; live availability must always be checked through the API.

## Identity

| Field | Value |
| --- | --- |
| Name | Bayt Al Ghaf (بيت الغاف) |
| Meaning | “House of the Ghaf” — the ghaf (Prosopis cineraria) is the UAE's national tree, a symbol of shade, endurance and hospitality in the desert. |
| Tagline | Emirati kitchen & majlis on Dubai Creek |
| Cuisine | Emirati, Gulf (Khaleeji), Contemporary Emirati |
| Established | 2019 |
| Concept | Contemporary Emirati restaurant and majlis; alcohol-free; all meat halal |
| Languages | Service in English and Arabic (some team members also speak Hindi/Urdu and Tagalog) |
| Currency | AED; menu prices include 5% VAT |
| Timezone | Asia/Dubai (UTC+04:00, no daylight saving) |

Bayt Al Ghaf is a contemporary Emirati restaurant and majlis in the Al Seef heritage quarter on the Bur Dubai side of Dubai Creek. The kitchen cooks the dishes Emirati families eat at home — machboos, harees, thareed, saloona and luqaimat — with careful sourcing, house-ground bezar and slow, unhurried cooking, and serves them in a dining room of coral-stone walls, palm-frond ceilings and creek views.

## Location

| Field | Value |
| --- | --- |
| Full address | Bayt Al Ghaf, Unit 14, Heritage Quarter, Al Seef Street, Al Seef, Bur Dubai, Dubai, United Arab Emirates |
| Unit | Unit 14, Heritage Quarter |
| Building | Al Seef Heritage Quarter (creek-side, ground floor) |
| Street | Al Seef Street |
| Area | Al Seef, Bur Dubai (Al Hamriya) |
| City / Emirate | Dubai, Dubai, United Arab Emirates |
| Coordinates | 25.2637, 55.3027 — Approximate coordinates of the Al Seef creek-side promenade, used for test purposes only. |
| Entrance | Heritage Quarter Gate 3 on Al Seef Street (takeaway counter and drop-off bay at the same entrance) |

Nearby landmarks:

| Landmark | Distance | On foot |
| --- | --- | --- |
| Al Fahidi Historical Neighbourhood (Al Bastakiya) | about 400 m | 5 minutes on foot |
| Al Fahidi Metro Station (Green Line) | about 750 m | 10 minutes on foot |
| Bur Dubai Abra Station (Dubai Old Souq) | about 900 m | 12 minutes on foot along the creek |
| Dubai Museum / Al Fahidi Fort | about 600 m | 8 minutes on foot |
| BurJuman Metro Station (Red & Green lines) | about 1.8 km | 20–25 minutes on foot, or a 5-minute taxi |
| Dubai Frame (Zabeel Park) | about 4 km | 10–15 minutes by taxi |

Full directions: see `directions-and-transportation.md`.

## Contact

| Channel | Details | Use for |
| --- | --- | --- |
| Phone | +971 4 555 0142 | Main line for reservations, takeaway and enquiries. Calls are answered by the restaurant's assistant. |
| WhatsApp | +971 50 555 0142 | Text messages only (no calls). Use it for order issues, photos of incorrect items and directions. |
| E-mail | hello@baytalghaf.example | General enquiries |
| Reservations e-mail | reservations@baytalghaf.example | Written booking requests |
| Events & catering | events@baytalghaf.example | Catering, private majlis events, groups above 20, buy-outs |
| Website | https://baytalghaf.example | Menu, reservations, online ordering |
| Instagram | @baytalghaf.example | Photos and announcements |

All contact details are simulated (555 numbers and the reserved `.example` domain).

## Opening hours (regular week)

| Day | Open | Kitchen last orders | Last reservation start |
| --- | --- | --- | --- |
| Monday | 08:00–23:00 | 22:30 | 21:30 |
| Tuesday | 08:00–23:00 | 22:30 | 21:30 |
| Wednesday | 08:00–23:00 | 22:30 | 21:30 |
| Thursday | 08:00–23:00 | 22:30 | 21:30 |
| Friday | 08:00–00:00 (midnight) | 23:30 | 22:30 |
| Saturday | 08:00–00:00 (midnight) | 23:30 | 22:30 |
| Sunday | 08:00–23:00 | 22:30 | 21:30 |

- Emirati breakfast menu: daily 08:00–11:30 (not served during Ramadan). The Weekend Fuala breakfast spread is served on Saturdays and Sundays until 12:00.
- Takeaway collection: from 08:30 until 15 minutes before closing.
- Delivery: daily 12:00–22:30 (arrival times).
- Public holidays: normal hours unless a closure or special period is listed in `special-days-and-seasonal-menu.md`.
- Ramadan, Eid and private-event hours are listed in `special-days-and-seasonal-menu.md` and returned by `GET /api/v1/restaurant/hours?date=YYYY-MM-DD`.

## Seating and capacity

| Area | Tables | Seats | Party sizes per table |
| --- | --- | --- | --- |
| Main dining hall (indoor) | 14 | 66 | 1–2, 2–4, 4–6, 6–8, 9–14 |
| Creek-view window tables (indoor) | 6 | 22 | 1–2, 2–4, 4–6 |
| Creek terrace (outdoor, seasonal) | 9 | 36 | 1–2, 2–4, 4–6, 6–8 |
| Private majlis room (floor seating) | 2 | 30 | 6–10, 10–20 |

Total seats: 154. Some main-hall tables are never offered online and are kept for walk-in guests.

## Facilities

- Indoor dining hall with creek-view window tables
- Outdoor creek terrace (seasonal, mid-October to end of April)
- Two private majlis rooms with traditional floor seating
- Step-free entrance from the Al Seef promenade and an accessible restroom
- Six high chairs and a baby-changing table in the accessible restroom
- Free Wi-Fi (network “BaytAlGhaf-Guest”, password printed on the menu)
- Prayer room for men and women on the first floor of the Heritage Quarter building (shared facility)
- Takeaway collection counter at the Al Seef Street entrance
- Live oud music on Friday evenings, 20:00–22:00

## House rules

- **Alcohol:** Bayt Al Ghaf is an alcohol-free restaurant. Alcohol is not served and may not be brought in.
- **Halal:** All meat and poultry are halal. No pork or pork products are used anywhere in the kitchen.
- **Smoking:** No smoking, vaping or shisha anywhere in the restaurant or on the terrace.
- **Dress Code:** Smart casual. Modest dress is appreciated, in keeping with the heritage quarter.
- **Children:** Children are very welcome. High chairs are available (6 in total) and can be requested with a reservation. There is no separate children's menu; half-portion requests are handled by the team on the day for selected rice dishes.
- **Pets:** Pets are not permitted inside or on the terrace. Assistance dogs are welcome.
- **Outside Food:** Outside food and drink are not permitted, except a celebration cake with prior notice (a plating fee of AED 30 applies).
- **Photography:** Personal photography is welcome. Professional shoots require written permission from the management.

## Payment

Accepted at the restaurant, on collection and on delivery:

- Cash (AED only)
- Visa, Mastercard and American Express (chip & PIN or contactless)
- Apple Pay and Google Pay (contactless at the counter or table)

Not accepted:

- Online card payment (not available in this test environment — orders are paid on collection, on delivery or at the table)
- Foreign currency cash
- Cheques
- Cryptocurrency

Prices are in UAE dirhams (AED) and include 5% VAT. There is no service charge; tipping is optional. Majlis rooms carry a minimum spend of AED 150 per person.

## Our story

Bayt Al Ghaf began with a family majlis: Chef Hessa grew up in a house in Al Bastakiya where the ghaf tree in the courtyard was where neighbours gathered for gahwa and dates. The restaurant recreates that welcome on the creek, a few minutes' walk from where she grew up — serving the slow-cooked dishes of Emirati homes, the seafood of the old pearling coast, and contemporary plates that use local camel, dates and loomi.

Hospitality follows the majlis tradition: guests are welcomed with gahwa poured from the dallah, served from right to left, and offered dates before the meal.
