# Knowledge graph schema

564 nodes and 2783 edges, built from the same data as the documents. Node ids are stable and prefixed with their type (for example `dish:lamb-machboos`, `allergen:milk`); every node's `document` field points at the document in `documents/` that describes it, and every document's front matter lists the node ids it covers in `entities`.

## Node types

| Type | Count |
| --- | --- |
| Allergen | 14 |
| Area | 47 |
| Closure | 2 |
| ContactChannel | 7 |
| DeliveryZone | 4 |
| Diet | 10 |
| Dish | 46 |
| Facility | 10 |
| Ingredient | 113 |
| Landmark | 6 |
| MealPeriod | 1 |
| MenuCategory | 11 |
| MenuOption | 156 |
| OrderStatus | 11 |
| OrderType | 5 |
| PaymentMethod | 6 |
| Person | 1 |
| Policy | 20 |
| Preparation | 19 |
| ReservationStatus | 7 |
| Restaurant | 1 |
| SeatingArea | 4 |
| SpecialPeriod | 4 |
| SpiceLevel | 4 |
| Table | 31 |
| Term | 11 |
| TransportMode | 6 |
| Weekday | 7 |

## Edge types

| Type | Count | Example |
| --- | --- | --- |
| ACCEPTS_PAYMENT | 6 | Bayt Al Ghaf accepts: Cash on collection (AED). |
| ADDS_ALLERGEN | 8 | Choosing “Add mehyawa (fermented fish sauce)” adds fish to Regag with Egg & Cheese. |
| ADDS_INGREDIENT | 35 | “Sidr honey instead of dibs” adds Sidr honey to Chebab with Date Syrup & Cream Cheese. |
| ADDS_PREPARATION | 19 | “Add mehyawa (fermented fish sauce)” adds Mehyawa to Regag with Egg & Cheese. |
| AVAILABLE_FOR | 188 | Balaleet can be eaten at the restaurant. |
| CONTACT_VIA | 7 | Bayt Al Ghaf can be contacted by phone at +971 4 555 0142. |
| CONTAINS_ALLERGEN | 114 | Hashu Topping contains milk (dairy). |
| CONTAINS_INGREDIENT | 590 | Bezar Spice Blend contains Coriander seed (25 g per batch). |
| CONTAINS_VIA_PREPARATION | 385 | Chebab with Date Syrup & Cream Cheese contains Date syrup (dibs) through Dibs (Date Syrup). |
| DELIVERS_TO | 4 | Bayt Al Ghaf delivers to Zone A — Old Dubai: fee AED 7, minimum AED 50. |
| HAS_ALLERGEN | 46 | Wheat flour contains gluten (wheat). |
| HAS_CLOSURE | 2 | The dining room is closed to the public from 18:00 on Saturday 14 November 2026 for a private event. Takeaway and delivery continue as normal. |
| HAS_FACILITY | 10 | Bayt Al Ghaf has free wi-fi: Free guest Wi-Fi (network “BaytAlGhaf-Guest”, password printed on the menu). |
| HAS_MENU_SECTION | 11 | Bayt Al Ghaf's menu has a Emirati Breakfast section. |
| HAS_OPTION | 156 | Balaleet can be ordered with “With omelette (2 eggs)” (Omelette). |
| HAS_POLICY | 20 | Bayt Al Ghaf policy — Alcohol: Bayt Al Ghaf is an alcohol-free restaurant. Alcohol is not served and may not be brought in. |
| HAS_SEATING_AREA | 4 | Bayt Al Ghaf has a main dining hall (indoor). |
| HAS_SPECIAL_PERIOD | 4 | Winter season 2026–27 runs from 2026-11-01 to 2027-02-28. |
| HAS_SPICE_LEVEL | 65 | Bezar Spice Blend is spice level 1. |
| HEAD_CHEF_OF | 1 | Chef Hessa is the head chef of Bayt Al Ghaf. |
| INCLUDES_PREPARATION | 4 | Hashu Topping includes Bezar Spice Blend (3 g). |
| IN_CATEGORY | 46 | Balaleet is in the Emirati Breakfast section of the menu. |
| IN_DELIVERY_ZONE | 47 | Al Seef is in Zone A — Old Dubai. |
| IN_SEATING_AREA | 31 | Table W1 is in the creek-view window tables (indoor). |
| MADE_WITH_PREPARATION | 75 | Dibs (Date Syrup) is served on the side with Chebab with Date Syrup & Cream Cheese. |
| MAY_CONTAIN_ALLERGEN | 112 | Brioche bun may contain traces of soy (supplier statement). |
| NEAR | 6 | Bayt Al Ghaf is about 400 m from Al Fahidi Historical Neighbourhood (Al Bastakiya), 5 minutes on foot. |
| NOT_AVAILABLE_FOR | 10 | Balaleet is not delivered. |
| NOT_SERVED_DURING | 5 | Balaleet is not served during Ramadan (Ramadan 2027 (provisional)). |
| ONLY_DURING | 3 | Aseedat Bobar (Winter Pumpkin Asida) is served only from 2026-11-01 to 2027-02-28. |
| OPEN_ON | 7 | Bayt Al Ghaf is open on Monday from 08:00 to 23:00. |
| PAIRS_WITH | 84 | Balaleet pairs well with Karak Chai. |
| REACHABLE_BY | 6 | Bayt Al Ghaf can be reached by car: From Sheikh Zayed Road, take Exit 50 towards Al Mankhool / Bur Dubai, follow Khalid Bin Al Waleed Road (Bank Street) towards Al Ghubaiba, then turn right onto Al Seef Street. |
| REMOVES_ALLERGEN | 28 | Choosing “No omelette” removes eggs from the recipe of Balaleet (traces may remain). |
| REMOVES_INGREDIENT | 53 | “No omelette” removes Eggs from Balaleet. |
| REMOVES_PREPARATION | 18 | “Sidr honey instead of dibs” removes Dibs (Date Syrup) from Chebab with Date Syrup & Cream Cheese. |
| SERVED_AT | 5 | Balaleet is served at breakfast (08:00–11:30). |
| SERVED_ON | 287 | Balaleet is served on Mondays. |
| SUITABLE_FOR_DIET | 281 | Balaleet is suitable for: vegetarian. |

## Files

- `nodes.jsonl`, `edges.jsonl`: one JSON object per line (`id`, `type`, `name`, `description`, `document`, `properties` / `source`, `target`, `type`, `description`, `properties`).
- `nodes.csv`, `edges.csv`: the same data as CSV; `properties` is a JSON string.
- `import.cypher`: loads the CSV files into Neo4j 5 (each node gets the label `Entity` plus its type).

`CONTAINS_VIA_PREPARATION` edges are shortcuts: they connect a dish directly to ingredients it contains only through a sauce, marinade or spice blend, so “which dishes contain walnuts?” is a single hop.
