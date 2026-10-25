# Knowledge Index

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Where each category of information lives and how an external system can retrieve it.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/knowledge-index`; live availability must always be checked through the API.

## Documents

| Document | File | Contains | Typical questions |
| --- | --- | --- | --- |
| Restaurant Profile | `restaurant-profile.md` | Identity, address, contact details, cuisine, facilities, opening hours, seating and house rules. | Where is the restaurant?; What are the opening hours?; Phone and e-mail; Facilities, dress code, alcohol, smoking, pets |
| Menu Catalog | `menu-catalog.md` | Every dish with price, ingredients and quantities, portions, allergens, diet, preparation time, customisations and ordering eligibility. | What is in a dish?; How much does it cost?; How long does it take?; Can an ingredient be removed? |
| Ingredients & Sauces | `ingredients-and-sauces.md` | Full composition of every sauce, marinade, spice blend, topping and syrup, and the ingredient catalogue. | What exactly is in each sauce?; What is the house sauce?; What is loomi / bezar / hashu? |
| Allergens & Dietary Guide | `allergens-and-dietary-guide.md` | Allergen matrix, dietary lists, ingredient caveats and the cross-contact policy. | Does this contain nuts/dairy/gluten/sesame/shellfish?; Is it vegan or vegetarian?; Can you guarantee no cross-contamination? |
| Reservations & Seating | `reservations-and-seating.md` | Party sizes, table types, seating preferences, durations, cancellations, late arrivals, walk-ins and groups. | Can I book for 6 tomorrow?; Outdoor / window seating?; Change or cancel a booking; Late arrival |
| Ordering, Pickup & Takeaway | `ordering-and-takeaway.md` | Order types, lead times, pickup process, payment, statuses, modification and cancellation. | Order now and collect on arrival?; How early to order?; Change after confirmation?; Late for pickup? |
| Delivery Areas & Fees | `delivery-areas.md` | Delivery zones, fees, minimum orders and delivery rules. | Do you deliver to my area?; Delivery fee and minimum; Abu Dhabi? |
| Bulk & Catering Orders | `bulk-and-catering-orders.md` | Catering thresholds, notice periods, capacity, pricing, eligible dishes and escalation. | 40 meals for an office?; 100 portions for an event?; Family platter contents; Cheapest way to feed a group |
| Directions & Transportation | `directions-and-transportation.md` | Getting here by car, taxi, metro, bus, abra or on foot; parking and accessibility. | Easiest way from a landmark?; Is parking available?; Nearest metro? |
| Special Days & Seasonal Menu | `special-days-and-seasonal-menu.md` | Weekly specials, Ramadan, National Day, Eid, seasonal dishes, closures and advance-order rules. | Which items are available on Fridays?; Is the Ramadan menu available outside Ramadan?; National Day special |
| Frequently Asked Questions | `faq.md` | Customer-friendly answers grouped by topic. | Common customer questions |
| Policies & Edge Cases | `policies-and-edge-cases.md` | Complaints, refunds, substitutions, late orders, unavailable items, declined requests and ambiguity. | Missing item?; Refund?; Item unavailable after ordering?; Requests we decline |
| Voice-Agent Test Scenarios | `agent-test-scenarios.md` | Unusual and adversarial test cases with the expected handling. | How should the agent handle tricky requests? |
| Voice-Agent Quick Reference | `voice-agent-reference.md` | Golden rules, key facts, intent-to-API mapping and escalation rules for the external voice assistant. | Which API call answers which question?; When to escalate |
| Data Dictionary | `data-dictionary.md` | Identifiers, fields, statuses, codes and business terms. | What does a status mean?; Reference formats; Error codes |
| Knowledge Index | `knowledge-index.md` | Where each category of information lives and how to retrieve it. | Where do I find X? |

## Retrieval

- `GET /api/v1/knowledge/documents` — list of documents (id, title, description, category, data version).
- `GET /api/v1/knowledge/documents/{id}` — one document as JSON with `markdown` and pre-split `sections`; add `?format=markdown` for raw Markdown.
- `GET /api/v1/knowledge/search?q=…` — ranked passages (document, section heading, snippet, score) from all documents and the FAQ.
- `GET /api/v1/faq`, `GET /api/v1/faq/search?q=…` — structured FAQ entries.
- `GET /api/v1/knowledge/scenarios` — agent test scenarios as JSON.
- The Markdown files in `docs/restaurant-knowledge/` are snapshots generated from the canonical seed data with `npm run kb:build`. The API versions are rendered live from the database, so they reflect admin changes (prices, hours, sold-out dishes) immediately.

## Where to find…

| Information | Document | Live structured API |
| --- | --- | --- |
| Address, contact, facilities | restaurant-profile | GET /api/v1/restaurant |
| Opening hours (any date) | restaurant-profile, special-days-and-seasonal-menu | GET /api/v1/restaurant/hours?date= |
| Directions, parking | directions-and-transportation | GET /api/v1/restaurant/location, /restaurant/transportation |
| Policies with numbers | reservations-and-seating, ordering-and-takeaway, bulk-and-catering-orders | GET /api/v1/restaurant/policies |
| Menu, prices, ingredients | menu-catalog | GET /api/v1/menu, /menu/items/{id} |
| Sauces and ingredients | ingredients-and-sauces | GET /api/v1/sauces/{id}, /ingredients/{id} |
| Allergens and diets | allergens-and-dietary-guide | GET /api/v1/menu?excludeAllergens=&dietary= |
| Availability on a date | special-days-and-seasonal-menu | GET /api/v1/menu/items/{id}/availability, /menu/specials |
| Tables | reservations-and-seating | GET /api/v1/reservations/availability |
| Delivery zones | delivery-areas | GET /api/v1/delivery/zones, /delivery/check?area= |
| Catering | bulk-and-catering-orders | POST /api/v1/bulk-orders/quotes |
| Statuses, codes, terms | data-dictionary | OpenAPI: /api/v1/openapi.json |

## How search works

Search is a dependency-free BM25 ranking over document sections (split at `##`/`###` headings) and FAQ entries, with light stemming, Arabic-transliteration variants (majboos → machboos, lugaimat → luqaimat, harris → harees…) and domain synonyms (dried lemon → loomi, booking → reservation, takeaway → pickup). There is no vector database; results are deterministic.
