# Menu Catalog

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Every dish with price, description, ingredients and quantities, portions, allergens, dietary information, preparation time, customisations and ordering eligibility.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/menu-catalog`; live availability must always be checked through the API.

## How to read this catalogue

- **Prices** are in AED and include 5% VAT.
- **Allergens** are derived automatically from the ingredient and sauce records (they are never typed by hand). “May contain” lists traces from shared equipment or supplier statements.
- **Item types:** `permanent` = Permanent menu; `daily_special` = Daily / weekly special; `limited_time` = Limited-time offer; `catering` = Catering & large orders only.
- **Availability** rules are enforced by the backend. Always confirm a specific date/time with `GET /api/v1/menu/items/{id}/availability?date=…&time=…&mode=…`.
- **Kitchen portions** measure kitchen capacity (drinks count as 0). Regular orders are limited to 20 portions; larger orders go through catering.

## Menu overview

| Category | Dishes | Price range |
| --- | --- | --- |
| Emirati Breakfast (الفطور الإماراتي) | 5 | AED 28 – AED 149 |
| Starters & Mezze (المقبلات) | 6 | AED 22 – AED 38 |
| Traditional Emirati (أطباق تقليدية) | 6 | AED 48 – AED 64 |
| Rice & Machboos (المجبوس والأرز) | 4 | AED 58 – AED 92 |
| Grills & Seafood (المشاوي والبحريات) | 6 | AED 68 – AED 118 |
| Vegetarian (أطباق نباتية) | 3 | AED 44 – AED 48 |
| Desserts (الحلويات) | 4 | AED 30 – AED 36 |
| Gahwa & Hot Drinks (القهوة والمشروبات الساخنة) | 3 | AED 10 – AED 30 |
| Cold Drinks (المشروبات الباردة) | 3 | AED 14 – AED 28 |
| Family Platters & Catering (الصواني العائلية والولائم) | 4 | AED 45 – AED 1,450 |
| Seasonal & Occasions (المواسم والمناسبات) | 2 | AED 125 – AED 355 |

Total dishes: 46.

### Quick price list

| Dish | Arabic | Price | Type | Serves | Allergens (ingredients) |
| --- | --- | --- | --- | --- | --- |
| Balaleet | بلاليط | AED 34 | permanent | 1 | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| Chebab with Date Syrup & Cream Cheese | خبز جباب | AED 36 | permanent | 1 | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| Regag with Egg & Cheese | رقاق بالبيض والجبن | AED 28 | permanent | 1 | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| Bayd w Tamat | بيض وطماط | AED 30 | permanent | 1 | Cereals containing gluten (wheat), Eggs |
| Weekend Fuala Breakfast Spread | فوالة الصباح | AED 149 | daily_special | 2 | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| Shorbat Adas | شوربة عدس | AED 26 | permanent | 1 | Cereals containing gluten (wheat), Celery |
| Sambousa Trio | سمبوسة | AED 34 | permanent | 2 | Cereals containing gluten (wheat), Milk / dairy |
| Nakhi | نخي | AED 22 | permanent | 1 | none of the 14 major allergens |
| Hummus with Spiced Lamb & Pine Nuts | حمص باللحم والصنوبر | AED 38 | permanent | 2 | Cereals containing gluten (wheat), Tree nuts, Sesame |
| Salatat Al Bait (House Salad) | سلطة البيت | AED 30 | permanent | 1 | none of the 14 major allergens |
| Mehyawa Regag Bites | رقاق بالمهياوة | AED 26 | permanent | 2 | Cereals containing gluten (wheat), Eggs, Fish, Milk / dairy, Mustard |
| Harees | هريس | AED 48 | permanent | 1 | Cereals containing gluten (wheat), Milk / dairy |
| Lamb Thareed | ثريد لحم | AED 62 | permanent | 1 | Cereals containing gluten (wheat), Milk / dairy |
| Saloonat Dajaj | صالونة دجاج | AED 52 | permanent | 1 | none of the 14 major allergens |
| Saloonat Samak (Monday) | صالونة سمك | AED 64 | daily_special | 1 | Fish |
| Margooga Laham (Tuesday) | مرقوقة لحم | AED 58 | daily_special | 1 | Cereals containing gluten (wheat) |
| Madrooba Dajaj (Wednesday) | مضروبة دجاج | AED 54 | daily_special | 1 | Milk / dairy |
| Lamb Machboos | مجبوس لحم | AED 72 | permanent | 1 | Milk / dairy, Sulphites |
| Chicken Machboos | مجبوس دجاج | AED 58 | permanent | 1 | Milk / dairy, Sulphites |
| Muhammar with Fried Safi | محمر وصافي | AED 69 | permanent | 1 | Fish, Milk / dairy |
| Camel Machboos (Thursday) | مجبوس لحم إبل | AED 92 | daily_special | 1 | Milk / dairy, Sulphites |
| Hammour Mashwi | هامور مشوي | AED 98 | permanent | 1 | Fish |
| Rubyan Mashwi | روبيان مشوي | AED 105 | permanent | 1 | Crustaceans (prawns/shrimp), Milk / dairy |
| Rish Ghanam (Lamb Chops) | ريش غنم | AED 118 | permanent | 1 | Cereals containing gluten (wheat), Soy, Milk / dairy, Sesame |
| Saffron Shish Tawook | شيش طاووق بالزعفران | AED 68 | permanent | 1 | Milk / dairy |
| Camel Kofta | كفتة لحم الإبل | AED 76 | permanent | 1 | Cereals containing gluten (wheat), Tree nuts |
| Camel Burger with Loomi Aioli | برجر لحم الإبل | AED 72 | permanent | 1 | Cereals containing gluten (wheat), Eggs, Soy, Milk / dairy, Mustard, Sesame |
| Vegetable Machboos | مجبوس خضار | AED 48 | permanent | 1 | Celery |
| Bamia Saloona | صالونة بامية | AED 44 | permanent | 1 | none of the 14 major allergens |
| Pumpkin & Chickpea Saloona | صالونة قرع وحمص | AED 44 | permanent | 1 | Celery |
| Luqaimat | لقيمات | AED 32 | permanent | 2 | Cereals containing gluten (wheat), Milk / dairy, Sesame |
| Khanfaroosh | خنفروش | AED 30 | permanent | 2 | Cereals containing gluten (wheat), Eggs |
| Date & Camel Milk Ice Cream | آيس كريم حليب النوق بالتمر | AED 36 | permanent | 1 | Eggs, Milk / dairy, Tree nuts |
| Aseedat Bobar (Winter Pumpkin Asida) | عصيدة بوبر | AED 34 | limited_time | 1 | Cereals containing gluten (wheat), Milk / dairy |
| Gahwa Emirati (Dallah for the Table) | قهوة عربية | AED 30 | permanent | 3 | none of the 14 major allergens |
| Karak Chai | شاي كرك | AED 12 | permanent | 1 | Milk / dairy |
| Sulaimani | شاي سليماني | AED 10 | permanent | 1 | none of the 14 major allergens |
| Chilled Laban with Mint | لبن بارد بالنعناع | AED 14 | permanent | 1 | Milk / dairy |
| Limon Na'na | ليمون بالنعناع | AED 22 | permanent | 1 | none of the 14 major allergens |
| Date & Cardamom Shake | ميلك شيك التمر بالهيل | AED 28 | permanent | 1 | Milk / dairy |
| Majlis Sharing Platter | صينية المجلس | AED 329 | permanent | 4 | Cereals containing gluten (wheat), Milk / dairy, Sesame, Sulphites |
| Friday Family Machboos Platter | صينية مجبوس الجمعة | AED 349 | daily_special | 5 | Cereals containing gluten (wheat), Milk / dairy, Sesame, Sulphites |
| Whole Lamb Ouzi | أوزي | AED 1,450 | catering | 10 | Milk / dairy, Tree nuts, Sulphites |
| Office Machboos Lunch Box | صندوق غداء المجبوس | AED 45 | catering | 1 | Cereals containing gluten (wheat), Milk / dairy, Sesame, Sulphites |
| Ramadan Iftar Set Menu (per person) | سفرة الإفطار | AED 125 | limited_time | 1 | Cereals containing gluten (wheat), Milk / dairy, Celery, Sesame, Sulphites |
| Eid Al Etihad Feast (National Day) | وليمة عيد الاتحاد | AED 355 | limited_time | 4 | Cereals containing gluten (wheat), Eggs, Milk / dairy, Sesame, Sulphites |

## Emirati Breakfast — الفطور الإماراتي

Served daily from 08:00 to 11:30 (not during Ramadan). The weekend breakfast spread is served on Saturdays and Sundays until 12:00.

### Balaleet (بلاليط) — AED 34

| Field | Value |
| --- | --- |
| ID / slug | `mi_balaleet` / `balaleet` |
| Also called | balalit, balaleet, sweet vermicelli, vermicelli with egg, vermicelli omelette |
| Type | Permanent menu |
| Availability | Breakfast menu: daily 08:00–11:30, not served during Ramadan. Not available for delivery (delivery runs 12:00–22:30). |
| Rules (enforced) | Served 08:00–11:30. Not served during ramadan. |
| Portion | About 280 g — 200 g of vermicelli with a two-egg omelette |
| Serves | 1 person |
| Cooking method | Vermicelli toasted in ghee then steamed; omelette cooked on the plancha. |
| Style | Traditional Emirati breakfast, cooked to order. |
| Spice | Not spicy (0/3). Not spicy. Sweetness can be reduced (choose “Less sweet”). |
| Preparation time | 12 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

The classic Emirati breakfast of sweet and savoury: fine wheat vermicelli toasted in ghee, steamed with saffron, cardamom, rosewater and sugar, and topped with a thin, lightly salted omelette.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Wheat vermicelli | 120 g (dry weight) | no | Cereals containing gluten (wheat) |
| Sugar | 25 g | no | — |
| Ghee (clarified butter) | 15 g | no | Milk / dairy |
| Saffron | 0.1 g | no | — |
| Green cardamom | 1 g, ground | no | — |
| Rosewater | 5 ml | no | — |
| Eggs | 2 eggs (omelette) | yes | Eggs |
| Sunflower oil | 5 ml (omelette pan) | no | — |
| Salt | 1 g | no | — |

**Customisations**

- *Omelette* (choose one, required): `omelette_regular` With omelette (2 eggs) — default; `omelette_extra` Extra omelette (4 eggs) (+AED 6); `omelette_none` No omelette
- *Sweetness* (choose one, required): `sweet_regular` Regular — default; `sweet_less` Less sweet

**Removing allergens**

- Eggs can be left out of the recipe by choosing: No omelette (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared breakfast plancha used for regag, eggs and cheese.

**Pairs well with:** Karak Chai, Regag with Egg & Cheese

**Customer questions**

- **Q:** Is balaleet sweet or savoury?  
  **A:** Both: the vermicelli is sweet with saffron, cardamom and rosewater, and the thin omelette on top is lightly salted.
- **Q:** Can I have it without egg?  
  **A:** Yes — choose “No omelette”. The vermicelli itself has no egg, but it is cooked on the same plancha as egg dishes.
- **Q:** Is it vegetarian?  
  **A:** Yes, it is vegetarian. It contains wheat (gluten), milk (ghee) and eggs, so it is not vegan.

### Chebab with Date Syrup & Cream Cheese (خبز جباب) — AED 36

| Field | Value |
| --- | --- |
| ID / slug | `mi_chebab` / `chebab` |
| Also called | chebab, jabab, chabab, emirati pancakes, saffron pancakes |
| Type | Permanent menu |
| Availability | Breakfast menu: daily 08:00–11:30, not served during Ramadan. Not available for delivery (delivery runs 12:00–22:30). |
| Rules (enforced) | Served 08:00–11:30. Not served during ramadan. |
| Portion | 3 pancakes (about 15 cm each) with 30 ml dibs and 40 g cream cheese |
| Serves | 1 person |
| Cooking method | Batter rested for 90 minutes, then griddled with ghee. |
| Style | Traditional Emirati breakfast bread. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Soft, yeasted Emirati pancakes scented with saffron and cardamom, cooked on a flat griddle with a touch of ghee and served with warm date syrup (dibs) and whipped cream cheese.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Wheat flour | 120 g | no | Cereals containing gluten (wheat) |
| Eggs | 1 egg | no | Eggs |
| Full-cream milk | 80 ml | no | Milk / dairy |
| Dried yeast | 2 g | no | — |
| Sugar | 15 g | no | — |
| Saffron | 0.05 g | no | — |
| Green cardamom | 0.5 g | no | — |
| Ghee (clarified butter) | 10 g (griddle) | no | Milk / dairy |
| Cream cheese | 40 g | yes | Milk / dairy |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Dibs (Date Syrup) | side | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |

**Customisations**

- *Served with* (choose one, required): `topping_classic` Dibs and cream cheese — default; `topping_no_cheese` Dibs only (no cream cheese); `topping_honey` Sidr honey instead of dibs (+AED 6)

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Eggs cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared breakfast plancha used for regag, eggs and cheese.

**Pairs well with:** Karak Chai, Gahwa Emirati (Dallah for the Table)

**Customer questions**

- **Q:** What is chebab?  
  **A:** Chebab (also written jabab) are soft, yeasted Emirati pancakes flavoured with saffron and cardamom, traditionally eaten for breakfast with date syrup and cheese.
- **Q:** Is chebab dairy-free if I skip the cheese?  
  **A:** No. The batter contains milk and the pancakes are cooked with ghee, so the dish always contains milk.

### Regag with Egg & Cheese (رقاق بالبيض والجبن) — AED 28

| Field | Value |
| --- | --- |
| ID / slug | `mi_regag_egg_cheese` / `regag-egg-cheese` |
| Also called | regag, rgag, raqaq, regag bread, egg cheese bread |
| Type | Permanent menu |
| Availability | Breakfast menu: daily 08:00–11:30, not served during Ramadan. Not available for delivery (delivery runs 12:00–22:30). Best eaten immediately; it softens within about 15 minutes if taken away. |
| Rules (enforced) | Served 08:00–11:30. Not served during ramadan. |
| Portion | 2 folded regag (about 30 cm each) with 1 egg and 30 g cheese |
| Serves | 1 person |
| Cooking method | Baked to order on a flat iron plate (tawa). |
| Style | Emirati street-breakfast, made in front of guests at the bread station. |
| Spice | Not spicy (0/3). Not spicy. Mehyawa can be added for a savoury tang. |
| Preparation time | 10 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Our bakers spread regag batter on a hot iron plate in front of you, crack an egg over it, add melted cheese and fold it into a crisp, wafer-thin parcel. Add a smear of mehyawa for the true Gulf-coast taste.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Regag bread (house-made) | 2 sheets (about 60 g) | no | Cereals containing gluten (wheat) |
| Eggs | 1 egg | yes | Eggs |
| Processed cheese | 30 g | yes | Milk / dairy |
| Ghee (clarified butter) | 5 g | no | Milk / dairy |

**Customisations**

- *Filling* (choose up to 2): `no_egg` No egg; `no_cheese` No cheese
- *Add-ons* (choose up to 2): `add_mehyawa` Add mehyawa (fermented fish sauce) (+AED 4); `add_dibs` Add date syrup drizzle (+AED 3)

**Removing allergens**

- Eggs can be left out of the recipe by choosing: No egg (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared breakfast plancha used for regag, eggs and cheese.
- The bread station also prepares regag with mehyawa (fish, mustard).

**Pairs well with:** Karak Chai, Balaleet

**Customer questions**

- **Q:** Does regag contain fish?  
  **A:** Not by default. Fish is only present if you add mehyawa (a fermented fish sauce). The bread station also makes mehyawa regag, so traces of fish cannot be ruled out.
- **Q:** Will it stay crispy for takeaway?  
  **A:** Regag is best eaten straight from the plate; for takeaway it softens within about 15 minutes.

### Bayd w Tamat (بيض وطماط) — AED 30

| Field | Value |
| --- | --- |
| ID / slug | `mi_bayd_tamat` / `bayd-w-tamat` |
| Also called | eggs and tomato, bayd tamat, baid tamat, scrambled eggs tomato, shakshuka |
| Type | Permanent menu |
| Availability | Breakfast menu: daily 08:00–11:30, not served during Ramadan. Not available for delivery (delivery runs 12:00–22:30). |
| Rules (enforced) | Served 08:00–11:30. Not served during ramadan. |
| Portion | About 320 g with 1 regag on the side |
| Serves | 1 person |
| Cooking method | Pan-cooked to order. |
| Style | Home-style Emirati breakfast. |
| Spice | Mild (1/3). Green chilli can be left out entirely or increased; the bezar adds warmth but little heat. |
| Preparation time | 12 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs |
| May contain (traces) | Celery, Mustard |
| Diet | vegetarian; Vegetarian; No dairy ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

The Emirati home breakfast: onions and tomatoes cooked down with green chilli and a pinch of bezar, with three eggs stirred through until just set. Served with crisp regag on the side.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Eggs | 3 eggs | no | Eggs |
| Tomato | 150 g | no | — |
| Onion | 50 g | no | — |
| Green chilli | 5 g | yes | — |
| Turmeric | 0.5 g | no | — |
| Sunflower oil | 15 ml | no | — |
| Salt | 2 g | no | — |
| Regag bread (house-made) | 1 sheet (about 30 g), on the side | yes | Cereals containing gluten (wheat) |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (1 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot
- *Bread* (choose one, required): `bread_regag` With regag — default; `bread_none` No bread

**Removing allergens**

- Cereals containing gluten (wheat) can be left out of the recipe by choosing: No bread (traces may remain).
- Eggs cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared breakfast plancha used for regag, eggs and cheese.

**Pairs well with:** Karak Chai, Sulaimani

**Customer questions**

- **Q:** Is this gluten-free?  
  **A:** The egg and tomato dish itself has no gluten ingredients, but it comes with regag (wheat). Choose “No bread”; note it is cooked on the plancha shared with regag, so we cannot guarantee it is free from gluten traces.
- **Q:** Can I have it without chilli?  
  **A:** Yes — choose “No chilli” and the green chilli is left out. The bezar spice blend stays in but adds warmth rather than heat.

### Weekend Fuala Breakfast Spread (فوالة الصباح) — AED 149

| Field | Value |
| --- | --- |
| ID / slug | `mi_weekend_fuala` / `weekend-fuala` |
| Also called | weekend breakfast, fuala, fowala, traditional breakfast, breakfast platter, breakfast for two |
| Type | Daily / weekly special |
| Availability | Saturdays and Sundays only, 08:00–12:00 (not during Ramadan). Dine-in, pickup or dine-in pre-order; not delivered. Limited to 25 spreads per day. |
| Rules (enforced) | Only on Saturday and Sunday. Served 08:00–12:00. Not served during ramadan. |
| Portion | Serves 2: balaleet (1 portion), 2 chebab, 2 regag with egg & cheese, bayd w tamat (1 portion), 8 dates, 80 g white cheese, 2 karak |
| Serves | 2 people |
| Cooking method | Assembled to order from the breakfast station. |
| Style | Traditional Emirati hospitality spread. |
| Spice | Mild (1/3). Only the bayd w tamat contains chilli; it can be made without chilli. |
| Preparation time | 20 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Milk / dairy |
| May contain (traces) | Celery, Mustard |
| Diet | vegetarian; Vegetarian; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 6 (daily limit 25 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 2 |

Our weekend tradition, inspired by the fuala hospitality spread offered to guests: balaleet, two chebab with dibs, regag with egg and cheese, bayd w tamat, Khalas dates, white akkawi cheese and two glasses of karak.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Wheat vermicelli | 120 g (balaleet) | no | Cereals containing gluten (wheat) |
| Wheat flour | 80 g (chebab) | no | Cereals containing gluten (wheat) |
| Regag bread (house-made) | 2 sheets | no | Cereals containing gluten (wheat) |
| Eggs | 6 eggs across the dishes | no | Eggs |
| Full-cream milk | 50 ml (chebab batter) | no | Milk / dairy |
| Ghee (clarified butter) | 25 g | no | Milk / dairy |
| Processed cheese | 30 g | no | Milk / dairy |
| White brined cheese (akkawi) | 80 g | no | Milk / dairy |
| Tomato | 150 g | no | — |
| Onion | 50 g | no | — |
| Green chilli | 5 g | yes | — |
| Khalas dates | 8 dates | no | — |
| Saffron | 0.15 g | no | — |
| Green cardamom | 2 g | no | — |
| Rosewater | 5 ml | no | — |
| Sugar | 45 g (balaleet, chebab and karak) | no | — |
| Dried yeast | 1 g | no | — |
| Black tea | 10 g (karak) | no | — |
| Evaporated milk | 120 ml (karak) | no | Milk / dairy |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Dibs (Date Syrup) | side | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |
| Bezar Spice Blend | included (in the bayd w tamat) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium
- *Drinks* (choose one, required): `drinks_karak` 2 karak chai — default; `drinks_sulaimani` 2 sulaimani (no milk); `drinks_gahwa` Dallah of gahwa instead (+AED 12)

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Eggs cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared breakfast plancha used for regag, eggs and cheese.

**Pairs well with:** Gahwa Emirati (Dallah for the Table), Chilled Laban with Mint

**Customer questions**

- **Q:** Can I order the weekend breakfast on a weekday?  
  **A:** No. It is prepared only on Saturdays and Sundays between 08:00 and 12:00. On weekdays you can order the individual breakfast dishes (balaleet, chebab, regag, bayd w tamat) until 11:30.
- **Q:** Can one person order it?  
  **A:** Yes, but it is sized for two people.
- **Q:** Can I pre-order it on Friday for Saturday?  
  **A:** Yes. Pickup and dine-in pre-orders can be placed up to 7 days ahead for a Saturday or Sunday morning slot.

## Starters & Mezze — المقبلات

Small plates to share, from lentil shorba to sambousa and mehyawa regag.

### Shorbat Adas (شوربة عدس) — AED 26

| Field | Value |
| --- | --- |
| ID / slug | `mi_shorbat_adas` / `shorbat-adas` |
| Also called | lentil soup, adas, shorba, soup |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 350 ml bowl with 15 g croutons |
| Serves | 1 person |
| Cooking method | Simmered and blended. |
| Style | Gulf home-style soup; an iftar favourite. |
| Spice | Not spicy (0/3). Not spicy; chilli flakes can be served on the side. |
| Preparation time | 8 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Celery |
| May contain (traces) | Mustard |
| Diet | vegan; Vegan; Vegetarian; No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 80 per day. |
| Kitchen portions | 1 |

Red lentils simmered with onion, carrot, celery and garlic in our vegetable stock, blended until velvety and seasoned with cumin and turmeric. Finished with olive oil, a wedge of lime and crunchy sourdough croutons.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Red lentils | 70 g | no | — |
| Onion | 40 g | no | — |
| Carrot | 30 g | no | — |
| Celery | 15 g | no | Celery |
| Garlic | 5 g | no | — |
| Cumin | 1 g | no | — |
| Turmeric | 0.5 g | no | — |
| Vegetable stock (house-made) | 300 ml | no | Celery |
| Olive oil | 10 ml | no | — |
| Lime | 1 wedge | no | — |
| Salt | 2 g | no | — |
| Sourdough croutons | 15 g | yes | Cereals containing gluten (wheat) |

**Customisations**

- *Croutons* (choose one, required): `croutons_yes` With croutons — default; `croutons_no` No croutons

**Removing allergens**

- Cereals containing gluten (wheat) can be left out of the recipe by choosing: No croutons (traces may remain).
- Celery cannot be removed from this dish.

**Pairs well with:** Sambousa Trio, Salatat Al Bait (House Salad)

**Customer questions**

- **Q:** Is the lentil soup vegan?  
  **A:** Yes. It contains no meat, dairy or egg. It does contain celery, and the croutons contain wheat (gluten); you can order it without croutons.
- **Q:** Is it gluten-free without croutons?  
  **A:** Without croutons it has no gluten-containing ingredients, but it is not certified gluten-free because our kitchen handles wheat.

### Sambousa Trio (سمبوسة) — AED 34

| Field | Value |
| --- | --- |
| ID / slug | `mi_sambousa_trio` / `sambousa-trio` |
| Also called | sambousa, samosa, sambusa, samboosa |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 6 pieces (2 lamb, 2 cheese, 2 vegetable), about 240 g |
| Serves | 2 people |
| Cooking method | Deep-fried in sunflower oil. |
| Style | Gulf street snack, a Ramadan staple. |
| Spice | Mild (1/3). The fillings are pre-seasoned; ask for extra dakkus for more heat. |
| Preparation time | 10 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy |
| May contain (traces) | Eggs, Celery, Mustard, Sesame |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 150 per day. Sold by the tray of 6 for catering. |
| Kitchen portions | 1 |

Hand-folded triangles of thin pastry, fried until crisp: two filled with bezar-spiced minced lamb and onion, two with akkawi cheese and coriander, and two with potato, carrot and green chilli. Served with dakkus for dipping.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Sambousa pastry sheets | 90 g | no | Cereals containing gluten (wheat) |
| Minced lamb | 50 g (lamb filling) | no | — |
| White brined cheese (akkawi) | 40 g (cheese filling) | no | Milk / dairy |
| Potato | 40 g (vegetable filling) | no | — |
| Carrot | 20 g | no | — |
| Onion | 30 g | no | — |
| Coriander leaves | 3 g | no | — |
| Green chilli | 3 g | no | — |
| Sunflower oil | for frying | no | — |
| Salt | 1 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (seasons the lamb filling) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Dakkus Tomato-Chilli Sauce | side | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Fillings* (choose one, required): `fillings_trio` Trio (2 lamb, 2 cheese, 2 vegetable) — default; `fillings_vegetarian` Vegetarian (3 cheese, 3 vegetable); `fillings_lamb` All lamb (6 pieces) (+AED 4)
- *Extra sauces* (choose up to 1): `extra_dakkus` Extra dakkus (+AED 4)

**Removing allergens**

- Milk / dairy can be left out of the recipe by choosing: All lamb (6 pieces) (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Shorbat Adas, Limon Na'na

**Customer questions**

- **Q:** Are the sambousa vegetarian?  
  **A:** The standard trio includes two lamb pieces. Choose the vegetarian option (cheese and vegetable). The pastry contains wheat and the cheese contains milk, and they are fried in a fryer shared with other items.
- **Q:** Do you have peanuts in the sambousa?  
  **A:** No. We do not use peanuts as an ingredient, but we cannot guarantee our kitchen is free from all traces of nuts.

### Nakhi (نخي) — AED 22

| Field | Value |
| --- | --- |
| ID / slug | `mi_nakhi` / `nakhi` |
| Also called | nakhi, dango, chickpeas, spiced chickpeas, nikhi |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | About 220 g |
| Serves | 1 person |
| Cooking method | Boiled and tossed warm. |
| Style | Traditional Emirati snack. |
| Spice | Mild (1/3). Chilli can be left out or increased. |
| Preparation time | 6 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | Celery, Mustard |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 80 per day. |
| Kitchen portions | 1 |

Chickpeas simmered until soft, then tossed with toasted cumin, a pinch of dried chilli, sea salt, lime and fresh coriander. A humble, much-loved snack sold by Emirati street vendors for generations.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chickpeas | 180 g (cooked weight) | no | — |
| Cumin | 2 g | no | — |
| Dried red chilli | 1 g | yes | — |
| Lime | 1/4 lime | no | — |
| Coriander leaves | 3 g | no | — |
| Salt | 2 g | no | — |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot

**Pairs well with:** Karak Chai, Sambousa Trio

**Customer questions**

- **Q:** Is nakhi vegan?  
  **A:** Yes. It contains chickpeas, spices, lime and coriander only, and has none of the 14 major allergens as ingredients (ground cumin may carry traces of mustard and celery from the supplier).

### Hummus with Spiced Lamb & Pine Nuts (حمص باللحم والصنوبر) — AED 38

| Field | Value |
| --- | --- |
| ID / slug | `mi_hummus_lamb` / `hummus-lamb` |
| Also called | hummus, houmous, hummus lahm, hummus with meat |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | About 300 g with 1 regag |
| Serves | 2 people |
| Cooking method | Hummus blended fresh daily; lamb pan-fried to order. |
| Style | Levantine-Gulf mezze. |
| Spice | Mild (1/3). Mildly spiced; extra chilli on request. |
| Preparation time | 8 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Tree nuts, Sesame |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No dairy ingredients; No egg ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 60 per day. |
| Kitchen portions | 1 |

Smooth chickpea hummus whipped with tahini, lemon and garlic, crowned with minced lamb sizzled with bezar, toasted pine nuts, sumac and parsley. Served with warm regag for scooping.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chickpeas | 150 g | no | — |
| Tahini | 30 g | no | Sesame |
| Lemon | 15 ml juice | no | — |
| Garlic | 3 g | no | — |
| Olive oil | 15 ml | no | — |
| Minced lamb | 70 g | yes | — |
| Pine nuts | 8 g | yes | Tree nuts |
| Sumac | 0.5 g | no | — |
| Parsley | 2 g | no | — |
| Salt | 2 g | no | — |
| Regag bread (house-made) | 1 sheet, on the side | yes | Cereals containing gluten (wheat) |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (seasons the lamb) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Adjustments* (choose up to 3): `no_lamb` No lamb (vegetarian hummus) (−AED 8); `no_pine_nuts` No pine nuts; `no_bread` No regag

**Removing allergens**

- Cereals containing gluten (wheat) can be left out of the recipe by choosing: No regag (traces may remain).
- Tree nuts can be left out of the recipe by choosing: No pine nuts (traces may remain).
- Sesame cannot be removed from this dish.

**Cross-contact notes**

- Pine nuts are toasted in the same pan used for other nut garnishes.

**Pairs well with:** Salatat Al Bait (House Salad), Camel Kofta

**Customer questions**

- **Q:** Does the hummus contain nuts?  
  **A:** Yes — it is topped with pine nuts, which we label as tree nuts. You can ask for no pine nuts, but the dish is made in a kitchen that handles nuts.
- **Q:** Does hummus contain sesame?  
  **A:** Yes. Hummus is made with tahini, which is sesame paste. It cannot be made sesame-free.

### Salatat Al Bait (House Salad) (سلطة البيت) — AED 30

| Field | Value |
| --- | --- |
| ID / slug | `mi_salatat_al_bait` / `salatat-al-bait` |
| Also called | house salad, salad, arabic salad, jarjeer salad, rocket salad |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | About 250 g |
| Serves | 1 person |
| Cooking method | Raw, dressed to order. |
| Style | Fresh garden salad. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 6 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 100 per day. |
| Kitchen portions | 1 |

A crisp salad of local tomatoes, cucumber, jarjeer (rocket), radish and red onion with pomegranate seeds and mint, dressed with our loomi and sumac dressing.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Tomato | 80 g | no | — |
| Cucumber | 80 g | no | — |
| Rocket (jarjeer) | 30 g | no | — |
| Radish | 20 g | no | — |
| Onion | 15 g (red onion) | yes | — |
| Pomegranate seeds | 20 g | no | — |
| Mint | 3 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Loomi & Sumac Dressing | included (30 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#loomi-sumac-dressing |

**Customisations**

- *Dressing* (choose one, required): `dressing_on` Dressed — default; `dressing_side` Dressing on the side
- *Adjustments* (choose up to 1): `no_onion` No onion

**Pairs well with:** Lamb Machboos, Hammour Mashwi

**Customer questions**

- **Q:** Is the house salad vegan and gluten-free?  
  **A:** Yes, it is vegan and has no gluten-containing ingredients. It is not certified gluten-free because our kitchen handles wheat.

### Mehyawa Regag Bites (رقاق بالمهياوة) — AED 26

| Field | Value |
| --- | --- |
| ID / slug | `mi_mehyawa_regag` / `mehyawa-regag` |
| Also called | mehyawa, mahyawa, regag mehyawa, fish sauce bread |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open; not delivered because regag loses its crispness. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 8 bites from 2 regag (about 150 g) |
| Serves | 2 people |
| Cooking method | Baked to order on the iron plate. |
| Style | Traditional Emirati coastal snack. |
| Spice | Mild (1/3). Mehyawa is savoury and pungent rather than hot; it cannot be removed from this dish. |
| Preparation time | 8 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Fish, Milk / dairy, Mustard |
| May contain (traces) | Celery |
| Diet | pescatarian; Pescatarian (fish/seafood, no meat); No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

A Gulf-coast favourite: wafer-thin regag brushed with mehyawa — our fermented fish sauce with mustard seed and spices — then layered with egg and melted cheese and cut into crisp bites for the table.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Regag bread (house-made) | 2 sheets (about 50 g) | no | Cereals containing gluten (wheat) |
| Eggs | 1 egg | no | Eggs |
| Processed cheese | 20 g | no | Milk / dairy |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Mehyawa | included (15 g) | Fish, Mustard | see ingredients-and-sauces.md#mehyawa |

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Eggs cannot be removed from this dish.
- Fish cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Mustard cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared breakfast plancha used for regag, eggs and cheese.

**Pairs well with:** Karak Chai, Nakhi

**Customer questions**

- **Q:** What is mehyawa?  
  **A:** Mehyawa is a traditional Gulf fermented fish sauce made from small salted fish with mustard seed, cumin, fennel and coriander. It contains fish and mustard.
- **Q:** I can't eat fish — can you leave out the mehyawa?  
  **A:** No, mehyawa is the point of this dish. Order Regag with Egg & Cheese from the breakfast menu instead (before 11:30).

## Traditional Emirati — أطباق تقليدية

Home-style stews and slow-cooked classics, including our weekday specials.

### Harees (هريس) — AED 48

| Field | Value |
| --- | --- |
| ID / slug | `mi_harees` / `harees` |
| Also called | harees, harris, hareis, haris, wheat and meat porridge |
| Type | Permanent menu |
| Availability | Served from 12:00 until sold out. Limited to 30 portions per day. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 400 g bowl |
| Serves | 1 person |
| Cooking method | Slow-cooked for 10 hours, then beaten by hand. |
| Style | Traditional Emirati festive and Ramadan dish. |
| Spice | Not spicy (0/3). Harees is not spiced with chilli and cannot be made spicy. |
| Preparation time | 8 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 6 (daily limit 30 portions) |
| Catering / large orders | Eligible. Max 40 per day. At least 48 h notice. Bulk harees is cooked in a dedicated overnight batch and needs at least 48 hours' notice. |
| Kitchen portions | 1 |

One of the oldest Emirati dishes: whole hulled wheat and lamb cooked slowly overnight in a sealed pot, then beaten with a wooden madhrab until smooth and elastic. Served with a pool of warm ghee and a dusting of cinnamon. Made in a single batch each night, so quantities are limited.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Hulled wheat (harees wheat) | 120 g (dry weight) | no | Cereals containing gluten (wheat) |
| Lamb shoulder | 100 g boneless | no | — |
| Ghee (clarified butter) | 20 g (10 g beaten in, 10 g poured on top) | no | Milk / dairy |
| Cinnamon | 0.5 g | no | — |
| Salt | 2 g | no | — |

**Customisations**

- *Ghee* (choose one, required): `ghee_classic` Ghee on top — default; `ghee_side` Ghee on the side; `ghee_extra` Extra ghee (+AED 3)

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Chilled Laban with Mint, Salatat Al Bait (House Salad)

**Customer questions**

- **Q:** Can harees be made without ghee?  
  **A:** The ghee topping can be served on the side, but a little ghee is beaten into the harees while it is made, so it always contains milk.
- **Q:** Is harees gluten-free?  
  **A:** No. Harees is made from whole wheat grains and contains gluten.
- **Q:** Why is harees sometimes sold out?  
  **A:** We cook one batch overnight — 30 portions a day. Once it is gone, it is gone until tomorrow. Pre-ordering secures a portion.

### Lamb Thareed (ثريد لحم) — AED 62

| Field | Value |
| --- | --- |
| ID / slug | `mi_thareed` / `thareed` |
| Also called | thareed, tharid, threed, fareed, lamb stew with bread |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 550 g: 200 g bone-in lamb, vegetables and 80 g regag |
| Serves | 1 person |
| Cooking method | Lamb braised for 2.5 hours; assembled to order. |
| Style | Traditional Emirati stew. |
| Spice | Mild (1/3). The chilli in the saloona can be reduced; extra dakkus can be added for heat. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 60 per day. |
| Kitchen portions | 1 |

A dish of the Prophet's tradition and of every Emirati Ramadan table: a rich lamb and vegetable saloona with potato, zucchini, carrot and tomato, seasoned with loomi and bezar, poured over torn regag so the bread soaks up the broth.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lamb shoulder | 200 g bone-in | no | — |
| Regag bread (house-made) | 80 g | no | Cereals containing gluten (wheat) |
| Potato | 80 g | no | — |
| Zucchini (courgette) | 60 g | no | — |
| Carrot | 50 g | no | — |
| Tomato | 60 g | no | — |
| Tomato paste | 10 g | no | — |
| Onion | 40 g | no | — |
| Garlic | 4 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Ghee (clarified butter) | 10 g | no | Milk / dairy |
| Lamb stock (house-made) | 250 ml | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (3 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot
- *Protein* (choose one, required): `protein_lamb` Lamb — default; `protein_chicken` Chicken instead of lamb (−AED 6)

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Chilled Laban with Mint, Salatat Al Bait (House Salad)

**Customer questions**

- **Q:** What is the difference between thareed and saloona?  
  **A:** Saloona is the stew served with rice; thareed is a saloona poured over regag bread so the bread soaks up the broth.
- **Q:** Can thareed be gluten-free?  
  **A:** No — the regag bread is an essential part of thareed. For a gluten-free-ingredient alternative, try Saloonat Dajaj with rice.

### Saloonat Dajaj (صالونة دجاج) — AED 52

| Field | Value |
| --- | --- |
| ID / slug | `mi_saloona_dajaj` / `saloona-dajaj` |
| Also called | chicken saloona, saloona, salona, chicken stew, chicken curry |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 550 g: 250 g bone-in chicken with vegetables, plus 120 g (dry) rice |
| Serves | 1 person |
| Cooking method | Simmered for 45 minutes. |
| Style | Home-style Emirati stew. |
| Spice | Mild (1/3). Chilli can be reduced to none or increased to hot. |
| Preparation time | 15 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 120 per day. |
| Kitchen portions | 1 |

The everyday Emirati stew: bone-in chicken simmered with potato, carrot, zucchini and tomato, seasoned with ginger, garlic, loomi and bezar. Served with steamed basmati rice.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chicken (bone-in) | 250 g bone-in | no | — |
| Potato | 80 g | no | — |
| Carrot | 50 g | no | — |
| Zucchini (courgette) | 50 g | no | — |
| Tomato | 80 g | no | — |
| Onion | 40 g | no | — |
| Garlic | 4 g | no | — |
| Ginger | 3 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Sunflower oil | 15 ml | no | — |
| Chicken stock (house-made) | 250 ml | no | — |
| Basmati rice | 120 g (dry weight), steamed | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (3 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot
- *Served with* (choose one, required): `side_rice` White basmati rice — default; `side_regag` Regag bread instead of rice

**Pairs well with:** Salatat Al Bait (House Salad), Chilled Laban with Mint

**Customer questions**

- **Q:** Is the chicken saloona dairy-free?  
  **A:** Yes. It is cooked with sunflower oil rather than ghee and has no dairy ingredients when served with rice.
- **Q:** Can I have it without spice?  
  **A:** Yes, choose “No chilli”. The bezar spice blend remains and gives a warm, mild flavour.

### Saloonat Samak (Monday) (صالونة سمك) — AED 64

| Field | Value |
| --- | --- |
| ID / slug | `mi_fish_saloona` / `fish-saloona` |
| Also called | fish saloona, fish stew, fish curry, kingfish stew, kanaad saloona |
| Type | Daily / weekly special |
| Availability | Mondays only, from 12:00 until sold out (20 portions). Can be pre-ordered up to 7 days ahead for a Monday. |
| Rules (enforced) | Only on Monday. Served 12:00–24:00. |
| Portion | About 520 g: 220 g kingfish steak (bone-in) in sauce, plus 120 g (dry) rice |
| Serves | 1 person |
| Cooking method | Marinated, then simmered in sauce. |
| Style | Coastal Emirati fish stew. |
| Spice | Medium (2/3). Can be made mild or hot; the tamarind sourness remains. |
| Preparation time | 18 minutes |
| Contains (ingredients) | Fish |
| May contain (traces) | Celery, Mustard |
| Diet | pescatarian; Pescatarian (fish/seafood, no meat); No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 20 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Every Monday, our kingfish (kanaad) steaks are marinated in bezar and lime, then simmered in a tangy tamarind and tomato saloona with loomi, garlic and green chilli. Served with white basmati rice and fresh coriander.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Kingfish (kanaad) | 220 g bone-in steak | no | Fish |
| Tomato | 100 g | no | — |
| Tomato paste | 10 g | no | — |
| Onion | 50 g | no | — |
| Garlic | 5 g | no | — |
| Tamarind | 10 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Green chilli | 6 g | no | — |
| Coriander leaves | 3 g | no | — |
| Sunflower oil | 15 ml | no | — |
| Basmati rice | 120 g (dry weight), steamed | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar & Lime Fish Marinade | marinade | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-lime-fish-marinade |
| Bezar Spice Blend | included (2 g in the sauce) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_mild` Mild; `spice_medium` Medium — default; `spice_hot` Hot

**Removing allergens**

- Fish cannot be removed from this dish.

**Cross-contact notes**

- Fish may contain small bones.

**Pairs well with:** Salatat Al Bait (House Salad), Limon Na'na

**Customer questions**

- **Q:** Is the fish saloona available on Tuesday?  
  **A:** No. It is our Monday special only. On other days, try Hammour Mashwi or Muhammar with Fried Safi.
- **Q:** Does it have bones?  
  **A:** Kingfish is served as a bone-in steak with one central bone, which is easy to remove, but small bones are possible.

### Margooga Laham (Tuesday) (مرقوقة لحم) — AED 58

| Field | Value |
| --- | --- |
| ID / slug | `mi_margooga` / `margooga` |
| Also called | margooga, marqooqa, margoogat, marqouq, lamb stew with dough |
| Type | Daily / weekly special |
| Availability | Tuesdays only, from 12:00 until sold out (20 portions). |
| Rules (enforced) | Only on Tuesday. Served 12:00–24:00. |
| Portion | About 550 g: 180 g lamb, vegetables and 70 g dough |
| Serves | 1 person |
| Cooking method | Braised, then finished with dough sheets. |
| Style | Traditional Emirati stew. |
| Spice | Mild (1/3). Chilli can be reduced or increased. |
| Preparation time | 20 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat) |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 20 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

A hearty winter-in-the-desert dish: lamb, eggplant, potato and tomato simmered with loomi and bezar, then hand-stretched sheets of dough are laid into the pot to cook in the broth until silky.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lamb shoulder | 180 g | no | — |
| Margooga dough sheets | 70 g | no | Cereals containing gluten (wheat) |
| Eggplant (aubergine) | 60 g | no | — |
| Potato | 60 g | no | — |
| Tomato | 80 g | no | — |
| Tomato paste | 10 g | no | — |
| Onion | 40 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Lamb stock (house-made) | 300 ml | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (3 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.

**Pairs well with:** Chilled Laban with Mint

**Customer questions**

- **Q:** Is margooga available every day?  
  **A:** No, margooga is our Tuesday special only.

### Madrooba Dajaj (Wednesday) (مضروبة دجاج) — AED 54

| Field | Value |
| --- | --- |
| ID / slug | `mi_madrooba` / `madrooba` |
| Also called | madrooba, madrouba, madhrooba, mashed rice chicken, chicken rice porridge |
| Type | Daily / weekly special |
| Availability | Wednesdays only, from 12:00 until sold out (20 portions). |
| Rules (enforced) | Only on Wednesday. Served 12:00–24:00. |
| Portion | About 450 g bowl with 180 g chicken |
| Serves | 1 person |
| Cooking method | Slow-cooked and beaten. |
| Style | Traditional Emirati comfort dish. |
| Spice | Mild (1/3). Chilli can be reduced; the dish is not made hot. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Milk / dairy |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 20 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Comfort in a bowl: chicken and basmati rice cooked with onion, tomato, cardamom, loomi and bezar until the rice breaks down, then beaten (madroob) until creamy and finished with ghee.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chicken (bone-in) | 180 g (shredded off the bone) | no | — |
| Basmati rice | 100 g (dry weight) | no | — |
| Onion | 40 g | no | — |
| Tomato | 50 g | no | — |
| Green cardamom | 1 g | no | — |
| Loomi (dried black lime) | 1/2 (ground) | no | — |
| Ghee (clarified butter) | 15 g | no | Milk / dairy |
| Chicken stock (house-made) | 400 ml | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (3 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium

**Removing allergens**

- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Salatat Al Bait (House Salad), Chilled Laban with Mint

**Customer questions**

- **Q:** Does madrooba contain dairy?  
  **A:** Yes, it is finished with ghee (clarified butter), which is a milk product.

## Rice & Machboos — المجبوس والأرز

Machboos and muhammar — spiced and sweet rice dishes at the heart of the Emirati table.

### Lamb Machboos (مجبوس لحم) — AED 72

| Field | Value |
| --- | --- |
| ID / slug | `mi_lamb_machboos` / `lamb-machboos` |
| Also called | machboos, majboos, machbous, makbous, kabsa, lamb rice, rice with lamb, lamb kabsa |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 650 g: 280 g bone-in lamb (raw weight, about 180 g cooked) and 150 g (dry) basmati rice |
| Serves | 1 person |
| Cooking method | Lamb braised for 2.5 hours; rice steamed in the braising stock. |
| Style | Traditional Emirati machboos. |
| Spice | Mild (1/3). Machboos is mild (warm spice rather than chilli heat) and cannot be made milder: the rice is cooked in stock seasoned with bezar. The heat comes from the dakkus served on the side, which can be skipped or doubled. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Milk / dairy, Sulphites |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 150 per day. |
| Kitchen portions | 1 |

The national dish of the Emirates, cooked our way: bone-in lamb shoulder braised until tender with onion, tomato, ginger, garlic and whole loomi, then basmati rice is cooked in the same spiced stock with bezar, cinnamon, cardamom and cloves. Crowned with hashu (caramelised onions and golden raisins) and served with dakkus.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lamb shoulder | 280 g bone-in (raw weight) | no | — |
| Basmati rice | 150 g (dry weight) | no | — |
| Onion | 60 g | no | — |
| Tomato | 70 g | no | — |
| Garlic | 6 g | no | — |
| Ginger | 4 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Cinnamon | 1 stick | no | — |
| Green cardamom | 3 pods | no | — |
| Cloves | 2 | no | — |
| Ghee (clarified butter) | 15 g | no | Milk / dairy |
| Lamb stock (house-made) | 350 ml | no | — |
| Coriander leaves | 2 g | no | — |
| Salt | 3 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (5 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping (35 g) | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (50 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Hashu topping* (choose one, required): `hashu_classic` Hashu with raisins — default; `hashu_no_raisins` Hashu without raisins; `hashu_none` No hashu
- *Portion* (choose one, required): `portion_regular` Regular — default; `portion_large` Large (380 g lamb, 200 g rice) (+AED 18)
- *Extra sauces* (choose up to 2): `extra_dakkus` Extra dakkus (+AED 4); `extra_saffron_yogurt` Extra saffron yogurt sauce (+AED 4)

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: Hashu without raisins (traces may remain).
- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Salatat Al Bait (House Salad), Chilled Laban with Mint, Luqaimat

**Customer questions**

- **Q:** What is machboos?  
  **A:** Machboos is the Emirati national rice dish: meat (here, lamb) and basmati rice cooked together in stock spiced with bezar and dried black lime (loomi).
- **Q:** Is the lamb on the bone?  
  **A:** Yes, it is a bone-in piece of lamb shoulder — about 280 g raw, roughly 180 g cooked.
- **Q:** Can I have it without raisins?  
  **A:** Yes. Choose “Hashu without raisins” or “No hashu”. Note that the raisins are the only source of sulphites in this dish.
- **Q:** Does lamb machboos contain nuts?  
  **A:** No nut ingredients are used in lamb machboos. Our kitchen does handle nuts, so we cannot guarantee it is free from traces.
- **Q:** Is it spicy?  
  **A:** It is mild — warm spice rather than chilli heat. Dakkus on the side adds heat if you want it.

### Chicken Machboos (مجبوس دجاج) — AED 58

| Field | Value |
| --- | --- |
| ID / slug | `mi_chicken_machboos` / `chicken-machboos` |
| Also called | chicken majboos, chicken kabsa, chicken rice, machboos dajaj |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 650 g: half a chicken (about 350 g raw, bone-in) and 150 g (dry) rice |
| Serves | 1 person |
| Cooking method | Simmered, then oven-roasted; rice steamed in the stock. |
| Style | Traditional Emirati machboos. |
| Spice | Mild (1/3). Machboos is mild (warm spice rather than chilli heat) and cannot be made milder: the rice is cooked in stock seasoned with bezar. The heat comes from the dakkus served on the side, which can be skipped or doubled. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Milk / dairy, Sulphites |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 200 per day. |
| Kitchen portions | 1 |

Bone-in chicken quarters simmered with onion, tomato, garlic and loomi, then roasted until golden while the basmati cooks in the spiced chicken stock with bezar, cinnamon, cardamom and cloves. Finished with hashu and served with dakkus.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chicken (bone-in) | 350 g bone-in (half chicken, raw weight) | no | — |
| Basmati rice | 150 g (dry weight) | no | — |
| Onion | 60 g | no | — |
| Tomato | 70 g | no | — |
| Garlic | 6 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Cinnamon | 1 stick | no | — |
| Green cardamom | 3 pods | no | — |
| Cloves | 2 | no | — |
| Ghee (clarified butter) | 10 g | no | Milk / dairy |
| Chicken stock (house-made) | 350 ml | no | — |
| Salt | 3 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (5 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping (35 g) | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (50 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Hashu topping* (choose one, required): `hashu_classic` Hashu with raisins — default; `hashu_no_raisins` Hashu without raisins; `hashu_none` No hashu
- *Extra sauces* (choose up to 2): `extra_dakkus` Extra dakkus (+AED 4); `extra_saffron_yogurt` Extra saffron yogurt sauce (+AED 4)

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: Hashu without raisins (traces may remain).
- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Salatat Al Bait (House Salad), Chilled Laban with Mint

**Customer questions**

- **Q:** Is chicken machboos dairy-free?  
  **A:** No. The rice is finished with ghee and the hashu topping is cooked in ghee. Without hashu it still contains ghee.
- **Q:** Can I get white meat only?  
  **A:** Machboos is cooked with bone-in chicken quarters, so we cannot guarantee breast meat only.

### Muhammar with Fried Safi (محمر وصافي) — AED 69

| Field | Value |
| --- | --- |
| ID / slug | `mi_muhammar_safi` / `muhammar-safi` |
| Also called | muhammar, mhammar, sweet rice, date rice, safi, rabbitfish |
| Type | Permanent menu |
| Availability | Served from 12:00, subject to the day's catch (about 25 fish per day). |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 600 g: one whole safi (about 300 g) and 150 g (dry) rice |
| Serves | 1 person |
| Cooking method | Rice steamed with date syrup; fish deep-fried in the dedicated seafood fryer. |
| Style | Traditional coastal Emirati dish. |
| Spice | Mild (1/3). The fish marinade is mild; dakkus adds heat. |
| Preparation time | 18 minutes |
| Contains (ingredients) | Fish, Milk / dairy |
| May contain (traces) | Celery, Mustard |
| Diet | pescatarian; Pescatarian (fish/seafood, no meat); No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 25 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

A seafaring classic of the pearl-diving coast: basmati rice cooked with date syrup, sugar, saffron, cardamom and rosewater until amber and fragrant, served with a whole safi (rabbitfish) marinated in bezar and lime and fried until crisp. Dakkus on the side cuts the sweetness.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Basmati rice | 150 g (dry weight) | no | — |
| Date syrup (dibs) | 30 ml | no | — |
| Sugar | 10 g | no | — |
| Saffron | 0.1 g | no | — |
| Green cardamom | 1 g | no | — |
| Rosewater | 3 ml | no | — |
| Ghee (clarified butter) | 10 g | no | Milk / dairy |
| Safi (rabbitfish) | 1 whole fish (about 300 g) | no | Fish |
| Sunflower oil | for frying | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar & Lime Fish Marinade | marinade | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-lime-fish-marinade |
| Dakkus Tomato-Chilli Sauce | side (50 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Extra sauces* (choose up to 1): `extra_dakkus` Extra dakkus (+AED 4)

**Removing allergens**

- Fish cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Fried in the dedicated seafood fryer (fish only).
- Whole fish contains bones.

**Pairs well with:** Salatat Al Bait (House Salad), Limon Na'na

**Customer questions**

- **Q:** Is muhammar sweet?  
  **A:** Yes, the rice is gently sweet from date syrup and sugar, balanced by the salty fried fish and the tangy dakkus.
- **Q:** Can I have muhammar with chicken instead of fish?  
  **A:** No, we only serve muhammar with safi. For chicken, try Chicken Machboos.

### Camel Machboos (Thursday) (مجبوس لحم إبل) — AED 92

| Field | Value |
| --- | --- |
| ID / slug | `mi_camel_machboos` / `camel-machboos` |
| Also called | camel machboos, machboos laham ibil, camel rice, camel kabsa |
| Type | Daily / weekly special |
| Availability | Thursdays only, from 12:00 until sold out (20 portions). Catering orders on other days need 72 hours' notice. |
| Rules (enforced) | Only on Thursday. Served 12:00–24:00. |
| Portion | About 650 g: 280 g camel meat (raw weight) and 150 g (dry) rice |
| Serves | 1 person |
| Cooking method | Braised for 3 hours; rice steamed in the braising liquid. |
| Style | Traditional Emirati festive machboos. |
| Spice | Mild (1/3). Machboos is mild (warm spice rather than chilli heat) and cannot be made milder: the rice is cooked in stock seasoned with bezar. The heat comes from the dakkus served on the side, which can be skipped or doubled. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Milk / dairy, Sulphites |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 20 portions) |
| Catering / large orders | Eligible. Max 40 per day. At least 72 h notice. Camel meat is ordered specially for catering and needs 72 hours' notice. |
| Kitchen portions | 1 |

A Thursday-night feast: young camel (hashi) shoulder braised slowly for three hours with loomi, onion, tomato and whole spices, then the basmati is cooked in the rich braising liquid with bezar. Topped with hashu and served with dakkus.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Camel meat | 280 g (raw weight) | no | — |
| Basmati rice | 150 g (dry weight) | no | — |
| Onion | 60 g | no | — |
| Tomato | 70 g | no | — |
| Garlic | 6 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Cinnamon | 1 stick | no | — |
| Green cardamom | 3 pods | no | — |
| Cloves | 2 | no | — |
| Ghee (clarified butter) | 15 g | no | Milk / dairy |
| Salt | 3 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (5 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping (35 g) | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (50 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Hashu topping* (choose one, required): `hashu_classic` Hashu with raisins — default; `hashu_no_raisins` Hashu without raisins; `hashu_none` No hashu
- *Extra sauces* (choose up to 1): `extra_dakkus` Extra dakkus (+AED 4)

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: Hashu without raisins (traces may remain).
- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Chilled Laban with Mint, Salatat Al Bait (House Salad)

**Customer questions**

- **Q:** What does camel taste like?  
  **A:** Young camel is lean and tender, a little like beef with a slightly sweet, gamey note. Braising for three hours makes it very soft.
- **Q:** Can I get camel machboos on a Friday?  
  **A:** For regular orders it is Thursday only. Other camel dishes — Camel Kofta and the Camel Burger — are on the menu every day.

## Grills & Seafood — المشاوي والبحريات

Charcoal grills, Gulf seafood and contemporary camel dishes.

### Hammour Mashwi (هامور مشوي) — AED 98

| Field | Value |
| --- | --- |
| ID / slug | `mi_hammour_mashwi` / `hammour-mashwi` |
| Also called | grilled hammour, hamour, grouper, grilled fish, hammour |
| Type | Permanent menu |
| Availability | Served from 12:00, subject to supply. Hammour is sourced outside the UAE seasonal fishing ban; when unavailable it is marked sold out. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | 250 g hammour fillet (raw weight) with 120 g (dry) rice |
| Serves | 1 person |
| Cooking method | Marinated for 30–60 minutes and grilled over charcoal. |
| Style | Gulf seafood grill. |
| Spice | Mild (1/3). The marinade is mild; the fish can be grilled with lime and salt only, or served with extra dakkus. |
| Preparation time | 20 minutes |
| Contains (ingredients) | Fish |
| May contain (traces) | Cereals containing gluten (wheat), Crustaceans (prawns/shrimp), Soy, Celery, Mustard, Sesame |
| Diet | pescatarian; Pescatarian (fish/seafood, no meat); No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 25 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

A thick fillet of hammour, the Gulf's most prized fish, marinated in bezar, lime, turmeric and garlic and grilled over charcoal until the skin crisps. Served with white basmati rice, a lime cheek and dakkus.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Hammour (orange-spotted grouper) fillet | 250 g fillet (raw weight) | no | Fish |
| Basmati rice | 120 g (dry weight), steamed | yes | — |
| Lime | 1/2 lime | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar & Lime Fish Marinade | marinade | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-lime-fish-marinade |
| Dakkus Tomato-Chilli Sauce | side (50 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Marinade* (choose one, required): `marinade_bezar` Bezar & lime (mild) — default; `marinade_plain` Lime and salt only (not spicy)
- *Side* (choose one, required): `side_rice` White basmati rice — default; `side_salad` House salad instead of rice (+AED 4)

**Removing allergens**

- Fish cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).
- Fish may contain small bones.

**Pairs well with:** Salatat Al Bait (House Salad), Limon Na'na

**Customer questions**

- **Q:** Is the hammour fresh?  
  **A:** Yes. We buy fresh hammour from licensed suppliers several times a week and only outside the UAE seasonal fishing ban. When we cannot source it, the dish is marked sold out.
- **Q:** Can I have it without spices?  
  **A:** Yes — choose “Lime and salt only”.

### Rubyan Mashwi (روبيان مشوي) — AED 105

| Field | Value |
| --- | --- |
| ID / slug | `mi_rubyan_mashwi` / `rubyan-mashwi` |
| Also called | grilled prawns, grilled shrimp, rubyan, prawns, shrimp |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | 6 jumbo prawns (about 300 g shell-on) with 120 g (dry) rice |
| Serves | 1 person |
| Cooking method | Grilled over charcoal. |
| Style | Gulf seafood grill. |
| Spice | Mild (1/3). The butter has a pinch of chilli that can be left out; House Green is medium-spicy and can be swapped for toum. |
| Preparation time | 18 minutes |
| Contains (ingredients) | Crustaceans (prawns/shrimp), Milk / dairy |
| May contain (traces) | Cereals containing gluten (wheat), Fish, Soy, Tree nuts, Celery, Mustard, Sesame |
| Diet | pescatarian; Pescatarian (fish/seafood, no meat); No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Six jumbo Gulf prawns, split and grilled over charcoal, spooned with garlic-lime butter and served with white basmati rice and our herb-bright Al Ghaf House Green.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Gulf prawns | 6 jumbo (about 300 g shell-on) | no | Crustaceans (prawns/shrimp) |
| Basmati rice | 120 g (dry weight), steamed | no | — |
| Lime | 1/2 lime | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Garlic Lime Butter | included | Milk / dairy | see ingredients-and-sauces.md#garlic-lime-butter |
| Al Ghaf House Green | side (50 g) | none of the 14 major allergens | see ingredients-and-sauces.md#al-ghaf-house-green |

**Customisations**

- *Dipping sauce* (choose one, required): `sauce_green` Al Ghaf House Green — default; `sauce_toum` Toum garlic sauce instead
- *Butter* (choose one, required): `butter_yes` Garlic-lime butter — default; `butter_no` No butter (grilled with olive oil)

**Removing allergens**

- Milk / dairy can be left out of the recipe by choosing: No butter (grilled with olive oil) (traces may remain).
- Crustaceans (prawns/shrimp) cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).

**Pairs well with:** Salatat Al Bait (House Salad), Limon Na'na

**Customer questions**

- **Q:** Are the prawns peeled?  
  **A:** They are split and grilled in the shell for flavour, with the vein removed; they are easy to peel at the table.
- **Q:** I am allergic to shellfish — what can I eat?  
  **A:** Avoid Rubyan Mashwi. Our grills are shared with prawns, so grilled dishes may contain traces of crustaceans. Dishes from the stew and rice sections are not cooked on the grill, but the kitchen does handle shellfish.

### Rish Ghanam (Lamb Chops) (ريش غنم) — AED 118

| Field | Value |
| --- | --- |
| ID / slug | `mi_lamb_chops` / `lamb-chops` |
| Also called | lamb chops, rish, lamb ribs, grilled lamb, lamb cutlets |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | 5 chops (about 350 g raw weight) |
| Serves | 1 person |
| Cooking method | Marinated 12–18 hours; grilled over charcoal. |
| Style | Gulf grill with a contemporary glaze. |
| Spice | Mild (1/3). Ordering without the Sauce No. 7 glaze reduces the warmth. |
| Preparation time | 20 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Soy, Milk / dairy, Sesame |
| May contain (traces) | Crustaceans (prawns/shrimp), Fish, Celery, Mustard |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

French-trimmed lamb chops marinated overnight in laban, garlic and bezar, grilled over charcoal and brushed with the chef's Sauce No. 7. Served with charred tomato, grilled onion and toum.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lamb rack chops | 5 chops (about 350 g) | no | — |
| Tomato | 1 tomato, charred | no | — |
| Onion | 1/2 onion, grilled | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Laban Marinade | marinade | Milk / dairy | see ingredients-and-sauces.md#laban-marinade |
| Sauce No. 7 (Saba'a) | glaze (20 ml) | Cereals containing gluten (wheat), Soy, Sesame | see ingredients-and-sauces.md#sauce-no-7 |
| Toum Garlic Sauce | side (40 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#toum-garlic-sauce |

**Customisations**

- *Cooking* (choose one, required): `doneness_medium` Medium — default; `doneness_medium_well` Medium-well; `doneness_well` Well done
- *Glaze* (choose one, required): `glaze_no7` With Sauce No. 7 glaze — default; `glaze_none` No glaze

**Removing allergens**

- Cereals containing gluten (wheat) can be left out of the recipe by choosing: No glaze (traces may remain).
- Soy can be left out of the recipe by choosing: No glaze (traces may remain).
- Sesame can be left out of the recipe by choosing: No glaze (traces may remain).
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).

**Pairs well with:** Salatat Al Bait (House Salad), Hummus with Spiced Lamb & Pine Nuts

**Customer questions**

- **Q:** What is in Sauce No. 7?  
  **A:** Tamarind, date syrup, soy sauce, toasted sesame oil, garlic, ginger, ground loomi, sugar and bezar. It contains soy, wheat (gluten) and sesame.
- **Q:** Can I have the chops without soy?  
  **A:** Choose “No glaze” to leave out Sauce No. 7. The grill is shared with glazed items, so traces of soy, wheat and sesame are possible.

### Saffron Shish Tawook (شيش طاووق بالزعفران) — AED 68

| Field | Value |
| --- | --- |
| ID / slug | `mi_shish_tawook` / `shish-tawook` |
| Also called | shish tawook, tawook, chicken skewers, chicken kebab, chicken tikka |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | 2 skewers (about 250 g chicken) with 120 g (dry) rice or 1 regag |
| Serves | 1 person |
| Cooking method | Marinated 6 hours; grilled over charcoal. |
| Style | Levantine grill, Gulf style. |
| Spice | Mild (1/3). The marinade is pre-made and mildly spiced; add dakkus for heat. |
| Preparation time | 18 minutes |
| Contains (ingredients) | Milk / dairy |
| May contain (traces) | Cereals containing gluten (wheat), Crustaceans (prawns/shrimp), Fish, Soy, Sesame |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 80 per day. |
| Kitchen portions | 1 |

Cubes of chicken breast marinated for six hours in yogurt, saffron, lemon and paprika, grilled on skewers with peppers and onion. Served with toum and your choice of rice or regag.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chicken breast | 250 g | no | — |
| Bell pepper and onion (grilled) | 60 g | no | — |
| Basmati rice | 120 g (dry weight), steamed | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Saffron Tawook Marinade | marinade | Milk / dairy | see ingredients-and-sauces.md#saffron-tawook-marinade |
| Toum Garlic Sauce | side (40 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#toum-garlic-sauce |

**Customisations**

- *Served with* (choose one, required): `side_rice` White basmati rice — default; `side_regag` Regag bread
- *Extra sauces* (choose up to 2): `extra_toum` Extra toum (+AED 4); `extra_dakkus` Extra dakkus (+AED 4)

**Removing allergens**

- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).

**Pairs well with:** Salatat Al Bait (House Salad), Hummus with Spiced Lamb & Pine Nuts

**Customer questions**

- **Q:** Is the toum made with egg?  
  **A:** No. Our toum is garlic, sunflower oil, lemon juice and salt only — no egg and no dairy.

### Camel Kofta (كفتة لحم الإبل) — AED 76

| Field | Value |
| --- | --- |
| ID / slug | `mi_camel_kofta` / `camel-kofta` |
| Also called | camel kofta, camel kebab, kofta, kebab, camel |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | 3 skewers (about 220 g camel mince) with 1 regag |
| Serves | 1 person |
| Cooking method | Grilled over charcoal. |
| Style | Contemporary Emirati grill. |
| Spice | Medium (2/3). The kofta itself is mild; the medium heat comes from House Red, which can be swapped for toum. |
| Preparation time | 18 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Tree nuts |
| May contain (traces) | Crustaceans (prawns/shrimp), Fish, Soy, Celery, Mustard, Sesame |
| Diet | meat; No dairy ingredients; No egg ingredients; No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 |
| Catering / large orders | Eligible. Max 60 per day. At least 48 h notice. Camel mince for catering needs 48 hours' notice. |
| Kitchen portions | 1 |

Minced young camel blended with onion, parsley, sumac and bezar, shaped onto skewers and grilled over charcoal. Served with our walnut-and-roasted-pepper Al Ghaf House Red, regag and sliced onion.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Minced camel meat | 220 g | no | — |
| Onion | 40 g | no | — |
| Parsley | 5 g | no | — |
| Sumac | 1 g | no | — |
| Salt | 2 g | no | — |
| Regag bread (house-made) | 1 sheet | yes | Cereals containing gluten (wheat) |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (3 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Al Ghaf House Red | side (50 g) | Cereals containing gluten (wheat), Tree nuts | see ingredients-and-sauces.md#al-ghaf-house-red |

**Customisations**

- *Sauce* (choose one, required): `sauce_red` Al Ghaf House Red (contains walnuts) — default; `sauce_toum` Toum garlic sauce instead (nut-free ingredients)
- *Bread* (choose one, required): `bread_regag` With regag — default; `bread_none` No bread

**Removing allergens**

- Cereals containing gluten (wheat) can be left out of the recipe by choosing: Toum garlic sauce instead (nut-free ingredients) + No bread (traces may remain).
- Tree nuts can be left out of the recipe by choosing: Toum garlic sauce instead (nut-free ingredients) (traces may remain).

**Cross-contact notes**

- Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).

**Pairs well with:** Hummus with Spiced Lamb & Pine Nuts, Salatat Al Bait (House Salad)

**Customer questions**

- **Q:** Does the camel kofta contain nuts?  
  **A:** The kofta itself does not, but it is served with Al Ghaf House Red, which contains walnuts. Choose toum instead; the kitchen still handles nuts.

### Camel Burger with Loomi Aioli (برجر لحم الإبل) — AED 72

| Field | Value |
| --- | --- |
| ID / slug | `mi_camel_burger` / `camel-burger` |
| Also called | camel burger, burger, camel, camelburger |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | 180 g patty in a brioche bun with 150 g potato wedges |
| Serves | 1 person |
| Cooking method | Patty chargrilled; wedges fried in the general fryer. |
| Style | Contemporary Emirati. |
| Spice | Mild (1/3). Order without Sauce No. 7 for no warmth, or add dakkus. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Soy, Milk / dairy, Mustard, Sesame |
| May contain (traces) | Crustaceans (prawns/shrimp), Fish, Celery |
| Diet | meat; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Our contemporary signature: a 180 g camel patty brushed with Sauce No. 7, topped with melted cheese, caramelised onion, lettuce, tomato and loomi aioli in a sesame brioche bun. Served with bezar-spiced potato wedges.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Minced camel meat | 180 g patty | no | — |
| Brioche bun | 1 bun (80 g) | no | Cereals containing gluten (wheat), Eggs, Milk / dairy, Sesame |
| Processed cheese | 1 slice (20 g) | yes | Milk / dairy |
| Onion | 30 g, caramelised | no | — |
| Lettuce | 10 g | no | — |
| Tomato | 2 slices | no | — |
| Potato | 150 g wedges | no | — |
| Sunflower oil | for frying | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Sauce No. 7 (Saba'a) | glaze (15 ml) | Cereals containing gluten (wheat), Soy, Sesame | see ingredients-and-sauces.md#sauce-no-7 |
| Loomi Aioli | included (25 ml) | Eggs, Mustard | see ingredients-and-sauces.md#loomi-aioli |
| Bezar Spice Blend | included (on the wedges) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Adjustments* (choose up to 3): `no_cheese` No cheese; `no_no7` No Sauce No. 7; `aioli_side` Aioli on the side
- *Extra sauces* (choose up to 1): `extra_loomi_aioli` Extra loomi aioli (+AED 4)

**Removing allergens**

- Soy can be left out of the recipe by choosing: No Sauce No. 7 (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Eggs cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Mustard cannot be removed from this dish.
- Sesame cannot be removed from this dish.

**Cross-contact notes**

- Cooked on the shared charcoal grill used for lamb, camel, chicken, fish and prawns; some grill items are brushed with Sauce No. 7 (soy, wheat, sesame).
- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Date & Cardamom Shake, Limon Na'na

**Customer questions**

- **Q:** Is the camel burger halal?  
  **A:** Yes. All our meat, including camel, is halal.
- **Q:** Can the burger be made gluten-free?  
  **A:** No. We do not have a gluten-free bun, and the wedges are fried in a shared fryer.

## Vegetarian — أطباق نباتية

Plant-based saloona and machboos. All three dishes are vegan.

### Vegetable Machboos (مجبوس خضار) — AED 48

| Field | Value |
| --- | --- |
| ID / slug | `mi_vegetable_machboos` / `vegetable-machboos` |
| Also called | vegetable majboos, veg machboos, vegan machboos, vegetable rice, vegetable kabsa |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 600 g with 150 g (dry) rice |
| Serves | 1 person |
| Cooking method | Vegetables braised; rice steamed in vegetable stock. |
| Style | Emirati machboos, vegan. |
| Spice | Mild (1/3). Mild; the rice is cooked in spiced stock. Add dakkus for heat. |
| Preparation time | 15 minutes |
| Contains (ingredients) | Celery |
| May contain (traces) | Mustard |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 100 per day. |
| Kitchen portions | 1 |

All the warmth of machboos without the meat: chickpeas, potato, carrot, zucchini and eggplant cooked with onion, tomato, garlic, ginger and loomi, then basmati rice steamed in our vegetable stock with bezar and whole spices. Cooked with sunflower oil rather than ghee, so it is vegan. Served with dakkus.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Basmati rice | 150 g (dry weight) | no | — |
| Chickpeas | 60 g | no | — |
| Potato | 60 g | no | — |
| Carrot | 50 g | no | — |
| Zucchini (courgette) | 50 g | no | — |
| Eggplant (aubergine) | 50 g | no | — |
| Onion | 60 g | no | — |
| Tomato | 70 g | no | — |
| Garlic | 6 g | no | — |
| Ginger | 4 g | no | — |
| Loomi (dried black lime) | 1 whole (pierced) | no | — |
| Cinnamon | 1 stick | no | — |
| Green cardamom | 3 pods | no | — |
| Cloves | 2 | no | — |
| Sunflower oil | 20 ml | no | — |
| Vegetable stock (house-made) | 350 ml | no | Celery |
| Salt | 3 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (5 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Dakkus Tomato-Chilli Sauce | side (50 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |

**Customisations**

- *Add-ons* (choose up to 2): `add_hashu` Add hashu (contains ghee and raisins — no longer vegan) (+AED 5); `add_dakkus` Extra dakkus (+AED 4)

**Removing allergens**

- Celery cannot be removed from this dish.

**Cross-contact notes**

- Cooked in pots and with utensils also used for meat dishes; washed between uses.

**Pairs well with:** Salatat Al Bait (House Salad), Nakhi

**Customer questions**

- **Q:** Is the vegetable machboos vegan?  
  **A:** Yes, as served it is vegan: cooked in sunflower oil and vegetable stock with no ghee. Adding hashu makes it vegetarian rather than vegan. It contains celery (in the stock).

### Bamia Saloona (صالونة بامية) — AED 44

| Field | Value |
| --- | --- |
| ID / slug | `mi_bamia_saloona` / `bamia-saloona` |
| Also called | bamia, okra, okra stew, bamya |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 500 g with 120 g (dry) rice |
| Serves | 1 person |
| Cooking method | Simmered. |
| Style | Gulf home-style stew. |
| Spice | Mild (1/3). Chilli can be left out or increased. |
| Preparation time | 12 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | Celery, Mustard |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 60 per day. |
| Kitchen portions | 1 |

Small, tender okra simmered in a tomato sauce with plenty of garlic, fresh coriander, loomi and a little bezar, finished with olive oil. Served with white basmati rice.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Okra | 200 g | no | — |
| Tomato | 120 g | no | — |
| Tomato paste | 10 g | no | — |
| Onion | 40 g | no | — |
| Garlic | 10 g | no | — |
| Coriander leaves | 5 g | no | — |
| Loomi (dried black lime) | 1/2 (pierced) | no | — |
| Olive oil | 15 ml | no | — |
| Basmati rice | 120 g (dry weight), steamed | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (2 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot

**Pairs well with:** Salatat Al Bait (House Salad), Chilled Laban with Mint

**Customer questions**

- **Q:** Is the okra stew vegan and gluten-free?  
  **A:** Yes, it is vegan and has no gluten-containing ingredients (not certified gluten-free).

### Pumpkin & Chickpea Saloona (صالونة قرع وحمص) — AED 44

| Field | Value |
| --- | --- |
| ID / slug | `mi_qara_saloona` / `qara-saloona` |
| Also called | pumpkin stew, pumpkin curry, qara, chickpea stew |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | About 500 g with 120 g (dry) rice |
| Serves | 1 person |
| Cooking method | Simmered. |
| Style | Gulf home-style stew. |
| Spice | Mild (1/3). Chilli can be left out or increased. |
| Preparation time | 12 minutes |
| Contains (ingredients) | Celery |
| May contain (traces) | Mustard |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 60 per day. |
| Kitchen portions | 1 |

Chunks of orange pumpkin and chickpeas simmered with onion, tomato, ginger, garlic, turmeric, loomi and bezar in vegetable stock, finished with coriander. Served with white basmati rice.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Pumpkin | 200 g | no | — |
| Chickpeas | 80 g | no | — |
| Onion | 40 g | no | — |
| Tomato | 60 g | no | — |
| Ginger | 4 g | no | — |
| Garlic | 5 g | no | — |
| Turmeric | 1 g | no | — |
| Loomi (dried black lime) | 1/2 (pierced) | no | — |
| Coriander leaves | 4 g | no | — |
| Sunflower oil | 15 ml | no | — |
| Vegetable stock (house-made) | 200 ml | no | Celery |
| Basmati rice | 120 g (dry weight), steamed | no | — |
| Salt | 2 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included (2 g) | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |

**Customisations**

- *Spice level* (choose one, required): `spice_none` No chilli; `spice_mild` Mild — default; `spice_medium` Medium; `spice_hot` Hot

**Removing allergens**

- Celery cannot be removed from this dish.

**Pairs well with:** Salatat Al Bait (House Salad)

**Customer questions**

- **Q:** Does the pumpkin saloona contain celery?  
  **A:** Yes. It is cooked in our vegetable stock, which contains celery.

## Desserts — الحلويات

Luqaimat, khanfaroosh and seasonal sweets.

### Luqaimat (لقيمات) — AED 32

| Field | Value |
| --- | --- |
| ID / slug | `mi_luqaimat` / `luqaimat` |
| Also called | luqaimat, lugaimat, luqeimat, lokma, dumplings, sweet dumplings, date syrup balls |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. For takeaway or delivery we recommend dibs on the side. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 10 pieces (about 200 g) with 30 ml dibs |
| Serves | 2 people |
| Cooking method | Deep-fried to order in the general fryer. |
| Style | Traditional Emirati sweet. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 10 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy, Sesame |
| May contain (traces) | Eggs |
| Diet | vegetarian; Vegetarian; No egg ingredients; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 120 per day. Catering luqaimat are packed with dibs on the side; quantity is counted in portions of 10 pieces. |
| Kitchen portions | 1 |

The Emirates' favourite sweet: a light yeasted batter flavoured with saffron and cardamom, dropped by hand into hot oil, fried until crisp outside and fluffy inside, then drenched in warm date syrup and scattered with toasted sesame.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Wheat flour | 90 g | no | Cereals containing gluten (wheat) |
| Dried yeast | 2 g | no | — |
| Sugar | 10 g | no | — |
| Milk powder | 6 g | no | Milk / dairy |
| Saffron | 0.05 g | no | — |
| Green cardamom | 0.5 g | no | — |
| Sunflower oil | for frying | no | — |
| Sesame seeds | 3 g | yes | Sesame |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Dibs (Date Syrup) | topping (30 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |

**Customisations**

- *Size* (choose one, required): `pieces_10` 10 pieces — default; `pieces_20` 20 pieces (sharing) (+AED 28)
- *Syrup* (choose one, required): `syrup_dibs` Date syrup (dibs) — default; `syrup_saffron` Saffron cardamom syrup; `syrup_side` Dibs on the side (stays crisp for takeaway)
- *Sesame* (choose one, required): `sesame_yes` With sesame seeds — default; `sesame_no` No sesame seeds

**Removing allergens**

- Sesame can be left out of the recipe by choosing: No sesame seeds (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Gahwa Emirati (Dallah for the Table), Karak Chai

**Customer questions**

- **Q:** Do luqaimat contain sesame?  
  **A:** Yes, they are topped with toasted sesame seeds. You can order them without sesame seeds, but they are fried in a shared fryer and sesame is used in our kitchen, so we cannot say they are sesame-free.
- **Q:** Do luqaimat contain dairy?  
  **A:** Yes, the batter contains milk powder.
- **Q:** Do they stay crispy for takeaway?  
  **A:** They soften after about 20 minutes once soaked in syrup. Choose “Dibs on the side” for takeaway.

### Khanfaroosh (خنفروش) — AED 30

| Field | Value |
| --- | --- |
| ID / slug | `mi_khanfaroosh` / `khanfaroosh` |
| Also called | khanfaroosh, khanfarush, saffron cakes, rice flour cakes |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 6 cakes (about 180 g) with 20 ml syrup |
| Serves | 2 people |
| Cooking method | Shallow-fried in the general fryer. |
| Style | Traditional Emirati sweet. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 12 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs |
| May contain (traces) | Milk / dairy, Sesame |
| Diet | vegetarian; Vegetarian; No dairy ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 60 per day. |
| Kitchen portions | 1 |

An heirloom Emirati sweet: a batter of rice flour and wheat flour with eggs, saffron, cardamom and rosewater, fried in small rounds until the edges crisp and the centres stay soft. Served with saffron cardamom syrup.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Rice flour | 60 g | no | — |
| Wheat flour | 30 g | no | Cereals containing gluten (wheat) |
| Eggs | 1 egg | no | Eggs |
| Sugar | 30 g | no | — |
| Saffron | 0.05 g | no | — |
| Green cardamom | 0.5 g | no | — |
| Rosewater | 5 ml | no | — |
| Dried yeast | 1 g | no | — |
| Sunflower oil | for frying | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Saffron Cardamom Syrup | side (20 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#saffron-cardamom-syrup |

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Eggs cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Gahwa Emirati (Dallah for the Table)

**Customer questions**

- **Q:** Is khanfaroosh gluten-free because it uses rice flour?  
  **A:** No. It is made with both rice flour and wheat flour, so it contains gluten.

### Date & Camel Milk Ice Cream (آيس كريم حليب النوق بالتمر) — AED 36

| Field | Value |
| --- | --- |
| ID / slug | `mi_camel_milk_ice_cream` / `camel-milk-ice-cream` |
| Also called | camel milk ice cream, ice cream, date ice cream |
| Type | Permanent menu |
| Availability | Available whenever the kitchen is open. Not delivered (it would melt); takeaway is packed in an insulated cup. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 3 scoops (about 180 g) with 10 g pistachio crumb |
| Serves | 1 person |
| Cooking method | Custard base cooked, chilled and churned. |
| Style | Contemporary Emirati dessert. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 4 minutes |
| Contains (ingredients) | Eggs, Milk / dairy, Tree nuts |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

Churned in-house from UAE camel milk, cream and date paste, with an egg-yolk custard base. Three scoops finished with our pistachio cardamom crumb.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Camel milk | 150 ml | no | Milk / dairy |
| Fresh cream | 50 ml | no | Milk / dairy |
| Egg yolk | 20 g | no | Eggs |
| Sugar | 25 g | no | — |
| Date paste | 30 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Pistachio Cardamom Crumb | topping (10 g) | Tree nuts | see ingredients-and-sauces.md#pistachio-cardamom-crumb |

**Customisations**

- *Topping* (choose one, required): `crumb_yes` With pistachio crumb — default; `crumb_no` No pistachio crumb

**Removing allergens**

- Tree nuts can be left out of the recipe by choosing: No pistachio crumb (traces may remain).
- Eggs cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Scooped with the same equipment as other desserts topped with pistachio.

**Pairs well with:** Gahwa Emirati (Dallah for the Table)

**Customer questions**

- **Q:** Is camel milk OK if I am lactose intolerant?  
  **A:** Camel milk contains lactose and is a milk allergen. We cannot advise that it is suitable for lactose intolerance or milk allergy.
- **Q:** Can I have it without nuts?  
  **A:** You can choose no pistachio crumb, but the ice cream is scooped with shared equipment, so it may still contain traces of tree nuts.

### Aseedat Bobar (Winter Pumpkin Asida) (عصيدة بوبر) — AED 34

| Field | Value |
| --- | --- |
| ID / slug | `mi_aseedat_bobar` / `aseedat-bobar` |
| Also called | aseeda, asida, aseedat bobar, pumpkin asida, pumpkin pudding, winter dessert, seasonal dessert |
| Type | Limited-time offer |
| Availability | Limited time: served from 1 November 2026 to 28 February 2027 only. |
| Rules (enforced) | Only from 2026-11-01 to 2027-02-28. |
| Portion | About 220 g bowl |
| Serves | 1 person |
| Cooking method | Stirred on the stove for 40 minutes. |
| Style | Traditional Emirati winter sweet. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 6 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 8 (daily limit 30 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 1 |

A winter tradition from Emirati grandmothers' kitchens: orange pumpkin (bobar) cooked down with toasted flour, sugar, saffron and cardamom, stirred with ghee until glossy and finished with a few drops of rosewater. Served warm.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Pumpkin | 200 g | no | — |
| Wheat flour | 40 g, toasted | no | Cereals containing gluten (wheat) |
| Sugar | 25 g | no | — |
| Ghee (clarified butter) | 25 g | no | Milk / dairy |
| Saffron | 0.05 g | no | — |
| Green cardamom | 1 g | no | — |
| Rosewater | 3 ml | no | — |

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Gahwa Emirati (Dallah for the Table), Karak Chai

**Customer questions**

- **Q:** Is the pumpkin asida available now?  
  **A:** Only between 1 November 2026 and 28 February 2027. Outside those dates it is not served.
- **Q:** Does it contain dairy?  
  **A:** Yes, it is cooked with ghee (clarified butter), a milk product. It also contains wheat.

## Gahwa & Hot Drinks — القهوة والمشروبات الساخنة

Emirati coffee poured from the dallah, karak and sulaimani.

### Gahwa Emirati (Dallah for the Table) (قهوة عربية) — AED 30

| Field | Value |
| --- | --- |
| ID / slug | `mi_gahwa` / `gahwa` |
| Also called | gahwa, qahwa, kahwa, arabic coffee, emirati coffee, dallah, coffee |
| Type | Permanent menu |
| Availability | Available whenever we are open. Takeaway in an insulated flask; not delivered. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | One dallah (about 500 ml, around 8 finjan cups) with 6 dates; serves 2–4 |
| Serves | 3 people |
| Cooking method | Brewed and simmered in the dallah. |
| Style | Traditional Emirati coffee service. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 8 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 6 |
| Catering / large orders | Eligible. Max 30 per day. Catering gahwa is supplied in insulated flasks (1 flask = 1 dallah). |
| Kitchen portions | 0 |

Emirati hospitality in a pot: lightly roasted Arabica beans brewed with cardamom, saffron and a hint of clove and rosewater, poured from a brass dallah into small finjan cups. Served with six Khalas dates. Gahwa is unsweetened and contains no milk.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Arabic coffee beans (light roast) | 25 g | no | — |
| Green cardamom | 6 g | no | — |
| Saffron | 0.1 g | no | — |
| Cloves | 0.5 g | no | — |
| Rosewater | 2 ml | no | — |
| Khalas dates | 6 dates | no | — |

**Pairs well with:** Luqaimat, Khanfaroosh

**Customer questions**

- **Q:** How do I signal that I have had enough gahwa?  
  **A:** Gently shake the finjan cup from side to side when handing it back — that tells the host you are finished.
- **Q:** Is the Arabic coffee sweet?  
  **A:** No. Gahwa is served unsweetened; the dates provide the sweetness.

### Karak Chai (شاي كرك) — AED 12

| Field | Value |
| --- | --- |
| ID / slug | `mi_karak` / `karak` |
| Also called | karak, chai karak, karak tea, masala tea, milk tea, chai |
| Type | Permanent menu |
| Availability | Available whenever we are open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 200 ml glass or takeaway cup |
| Serves | 1 person |
| Cooking method | Simmered. |
| Style | Gulf karak. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 5 minutes |
| Contains (ingredients) | Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: no |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 100 per day. Catering karak is supplied in flasks of 8 cups; each unit counts as one cup. |
| Kitchen portions | 0 |

The UAE's everyday ritual: strong black tea boiled with evaporated milk, sugar, crushed cardamom and a few threads of saffron until rich and caramel-coloured.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Black tea | 6 g | no | — |
| Evaporated milk | 60 ml | no | Milk / dairy |
| Sugar | 15 g | yes | — |
| Green cardamom | 0.5 g | no | — |
| Saffron | 0.02 g | no | — |

**Customisations**

- *Sugar* (choose one, required): `sugar_regular` Regular sugar — default; `sugar_less` Less sugar; `sugar_none` No sugar
- *Milk* (choose one, required): `milk_evaporated` Evaporated milk (classic) — default; `milk_camel` Camel milk (+AED 4)

**Removing allergens**

- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Regag with Egg & Cheese, Luqaimat

**Customer questions**

- **Q:** Can I have karak without dairy?  
  **A:** No. Karak is made with evaporated milk (or camel milk). For a dairy-free tea, choose Sulaimani.
- **Q:** Can I have karak without sugar?  
  **A:** Yes, choose “No sugar”.

### Sulaimani (شاي سليماني) — AED 10

| Field | Value |
| --- | --- |
| ID / slug | `mi_sulaimani` / `sulaimani` |
| Also called | sulaimani, suleimani, black tea, lemon tea, tea |
| Type | Permanent menu |
| Availability | Available whenever we are open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 200 ml glass or takeaway cup |
| Serves | 1 person |
| Cooking method | Brewed. |
| Style | Gulf tea. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 4 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: no |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 0 |

Light, clear black tea brewed with fresh mint and served with a squeeze of lime. Sweetened to your taste.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Black tea | 3 g | no | — |
| Lime | 1 wedge | no | — |
| Mint | 2 g | no | — |
| Sugar | 10 g | yes | — |

**Customisations**

- *Sugar* (choose one, required): `sugar_regular` Regular sugar — default; `sugar_less` Less sugar; `sugar_none` No sugar

**Pairs well with:** Luqaimat

**Customer questions**

- **Q:** Is sulaimani vegan?  
  **A:** Yes — tea, lime, mint and sugar only.

## Cold Drinks — المشروبات الباردة

Laban, fresh lemon-mint and date shakes. We are an alcohol-free restaurant.

### Chilled Laban with Mint (لبن بارد بالنعناع) — AED 14

| Field | Value |
| --- | --- |
| ID / slug | `mi_laban_barid` / `laban-barid` |
| Also called | laban, buttermilk, ayran, yogurt drink |
| Type | Permanent menu |
| Availability | Available whenever we are open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 300 ml |
| Serves | 1 person |
| Cooking method | Chilled and whisked. |
| Style | Traditional Gulf drink. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 2 minutes |
| Contains (ingredients) | Milk / dairy |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegetarian; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: no |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 150 per day. |
| Kitchen portions | 0 |

Ice-cold laban whisked with a pinch of salt and fresh mint — the classic partner to machboos and harees.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Laban (cultured buttermilk) | 300 ml | no | Milk / dairy |
| Mint | 2 g | no | — |
| Salt | 1 g | no | — |

**Removing allergens**

- Milk / dairy cannot be removed from this dish.

**Pairs well with:** Lamb Machboos, Harees

**Customer questions**

- **Q:** Is laban the same as yogurt?  
  **A:** Laban is a cultured buttermilk — thinner than yogurt and drunk cold. It contains milk.

### Limon Na'na (ليمون بالنعناع) — AED 22

| Field | Value |
| --- | --- |
| ID / slug | `mi_limon_nana` / `limon-nana` |
| Also called | lemon mint, limonana, lemon juice, mint lemonade |
| Type | Permanent menu |
| Availability | Available whenever we are open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 400 ml |
| Serves | 1 person |
| Cooking method | Blended to order. |
| Style | Gulf café classic. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 4 minutes |
| Contains (ingredients) | none of the 14 major allergens |
| May contain (traces) | No specific trace warnings beyond the general kitchen statement |
| Diet | vegan; Vegan; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No dairy ingredients; No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: no |
| Max per order | 10 |
| Catering / large orders | Eligible. Max 100 per day. |
| Kitchen portions | 0 |

Freshly squeezed lemons blended with mint, sugar and crushed ice until frosty and bright green.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lemon | 60 ml juice | no | — |
| Mint | 6 g | no | — |
| Sugar | 25 g | yes | — |

**Customisations**

- *Sugar* (choose one, required): `sugar_regular` Regular sugar — default; `sugar_less` Less sugar; `sugar_none` No sugar

**Pairs well with:** Hammour Mashwi, Sambousa Trio

**Customer questions**

- **Q:** Is the lemon mint fresh?  
  **A:** Yes, lemons are squeezed to order.

### Date & Cardamom Shake (ميلك شيك التمر بالهيل) — AED 28

| Field | Value |
| --- | --- |
| ID / slug | `mi_date_shake` / `date-shake` |
| Also called | date shake, date milkshake, date smoothie, milkshake |
| Type | Permanent menu |
| Availability | Available whenever we are open. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | 400 ml |
| Serves | 1 person |
| Cooking method | Blended to order. |
| Style | Contemporary Emirati café drink. |
| Spice | Not spicy (0/3). Not spicy. |
| Preparation time | 4 minutes |
| Contains (ingredients) | Milk / dairy |
| May contain (traces) | Tree nuts |
| Diet | vegetarian; Vegetarian; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No nut ingredients (not a nut-free kitchen); No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: no |
| Max per order | 10 |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 0 |

A naturally sweet shake of Khalas dates, cold milk, a spoon of date syrup and a pinch of cardamom.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Khalas dates | 60 g (pitted) | no | — |
| Full-cream milk | 250 ml | no | Milk / dairy |
| Date syrup (dibs) | 15 ml | no | — |
| Green cardamom | 0.3 g | no | — |

**Customisations**

- *Milk* (choose one, required): `milk_cow` Cow's milk — default; `milk_camel` Camel milk (+AED 4)
- *Topping* (choose up to 1): `add_pistachio` Pistachio crumb (+AED 4)

**Removing allergens**

- Milk / dairy cannot be removed from this dish.

**Cross-contact notes**

- Blended in the drinks blender, which is also used for drinks with pistachio crumb.

**Pairs well with:** Camel Burger with Loomi Aioli

**Customer questions**

- **Q:** Does the date shake have added sugar?  
  **A:** No refined sugar is added; it is sweetened with dates and a little date syrup.

## Family Platters & Catering — الصواني العائلية والولائم

Sharing platters for the majlis, the Friday family platter, whole lamb ouzi and office lunch boxes.

### Majlis Sharing Platter (صينية المجلس) — AED 329

| Field | Value |
| --- | --- |
| ID / slug | `mi_majlis_platter` / `majlis-platter` |
| Also called | majlis platter, sharing platter, family platter, platter for four, mixed platter |
| Type | Permanent menu |
| Availability | Served from 12:00 until the kitchen closes; delivery available. |
| Rules (enforced) | Served 12:00–24:00. |
| Portion | Serves 4: 1.1 kg bone-in lamb (raw) on 500 g (dry) rice, 2 portions chicken saloona, 8 sambousa, large salad (600 g), 20 luqaimat |
| Serves | 4 people |
| Cooking method | Assembled from the machboos, saloona, fryer and salad stations. |
| Style | Emirati sharing tray. |
| Spice | Mild (1/3). Mild overall; dakkus on the side adds heat. |
| Preparation time | 25 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy, Sesame, Sulphites |
| May contain (traces) | Eggs, Celery, Mustard |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 4 |
| Catering / large orders | Eligible. Max 15 per day. Each platter counts as 4 portions towards catering capacity. |
| Kitchen portions | 4 |

Our everyday feast for the majlis: a large tray of lamb machboos with hashu, a pot of chicken saloona, eight sambousa (lamb, cheese and vegetable), a large Salatat Al Bait, dakkus and twenty luqaimat to finish.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lamb shoulder | 1.1 kg bone-in (raw weight) | no | — |
| Basmati rice | 500 g (dry weight) | no | — |
| Lamb stock (house-made) | 1.2 l | no | — |
| Chicken (bone-in) | 500 g bone-in (saloona) | no | — |
| Chicken stock (house-made) | 500 ml | no | — |
| Potato | 240 g | no | — |
| Carrot | 150 g | no | — |
| Zucchini (courgette) | 100 g | no | — |
| Tomato | 450 g | no | — |
| Onion | 300 g | no | — |
| Garlic | 20 g | no | — |
| Ginger | 12 g | no | — |
| Loomi (dried black lime) | 3 whole | no | — |
| Cinnamon | 2 sticks | no | — |
| Green cardamom | 8 pods | no | — |
| Cloves | 5 | no | — |
| Ghee (clarified butter) | 45 g | no | Milk / dairy |
| Sambousa pastry sheets | 120 g | no | Cereals containing gluten (wheat) |
| Minced lamb | 70 g | no | — |
| White brined cheese (akkawi) | 50 g | no | Milk / dairy |
| Cucumber | 160 g | no | — |
| Rocket (jarjeer) | 60 g | no | — |
| Radish | 40 g | no | — |
| Pomegranate seeds | 40 g | no | — |
| Mint | 6 g | no | — |
| Wheat flour | 180 g (luqaimat) | no | Cereals containing gluten (wheat) |
| Milk powder | 12 g | no | Milk / dairy |
| Dried yeast | 4 g | no | — |
| Sugar | 20 g | no | — |
| Saffron | 0.1 g | no | — |
| Sesame seeds | 6 g | no | Sesame |
| Sunflower oil | for frying and cooking | no | — |
| Salt | 12 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (150 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |
| Loomi & Sumac Dressing | included | none of the 14 major allergens | see ingredients-and-sauces.md#loomi-sumac-dressing |
| Dibs (Date Syrup) | topping (60 ml on the luqaimat) | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |

**Customisations**

- *Machboos* (choose one, required): `main_lamb` Lamb machboos — default; `main_chicken` Chicken machboos instead of lamb (−AED 40)
- *Hashu* (choose one, required): `hashu_classic` Hashu with raisins — default; `hashu_none` No hashu

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: No hashu (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Sesame cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Gahwa Emirati (Dallah for the Table), Chilled Laban with Mint

**Customer questions**

- **Q:** What is included in the Majlis Sharing Platter?  
  **A:** Lamb machboos with hashu (1.1 kg bone-in lamb on 500 g rice), two portions of chicken saloona, eight sambousa, a large house salad, dakkus and twenty luqaimat. It serves four.
- **Q:** How is it different from the Friday platter?  
  **A:** The Majlis platter is available every day and serves four. The Friday Family Machboos Platter is only made on Fridays, serves five and is built around lamb and chicken machboos with laban.

### Friday Family Machboos Platter (صينية مجبوس الجمعة) — AED 349

| Field | Value |
| --- | --- |
| ID / slug | `mi_friday_platter` / `friday-platter` |
| Also called | friday platter, friday family platter, family machboos, friday lunch, jumaa platter |
| Type | Daily / weekly special |
| Availability | Fridays only, for collection or dine-in between 12:00 and 22:00. Order at least 2 hours ahead (pre-orders up to 7 days ahead). Not delivered. Limited to 12 platters per Friday. |
| Rules (enforced) | Only on Friday. Served 12:00–22:00. Order at least 2 hours in advance. Can be ordered for: pickup, dine_in_preorder. |
| Portion | Serves 5: 1.2 kg bone-in lamb shoulder (raw), 1 whole chicken (about 1.2 kg), 750 g (dry) rice, large salad, 5 laban (300 ml), 20 luqaimat |
| Serves | 5 people |
| Cooking method | Lamb braised for 3 hours; chicken roasted; rice steamed in the combined stock. |
| Style | Emirati Friday family tray. |
| Spice | Mild (1/3). Mild; dakkus on the side adds heat. |
| Preparation time | 30 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy, Sesame, Sulphites |
| May contain (traces) | Eggs, Celery, Mustard |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 3 (daily limit 12 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 5 |

Friday lunch is family time in the Emirates. Our Friday tray carries a whole slow-braised lamb shoulder and a whole roast chicken over 750 g of spiced machboos rice with hashu, with dakkus, a large house salad, five laban and twenty luqaimat. Made only on Fridays in limited numbers.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Lamb shoulder | 1.2 kg bone-in (raw weight) | no | — |
| Chicken (bone-in) | 1 whole chicken (about 1.2 kg) | no | — |
| Basmati rice | 750 g (dry weight) | no | — |
| Lamb stock (house-made) | 1 l | no | — |
| Chicken stock (house-made) | 800 ml | no | — |
| Onion | 300 g | no | — |
| Tomato | 400 g | no | — |
| Garlic | 25 g | no | — |
| Ginger | 15 g | no | — |
| Loomi (dried black lime) | 4 whole | no | — |
| Cinnamon | 3 sticks | no | — |
| Green cardamom | 10 pods | no | — |
| Cloves | 6 | no | — |
| Ghee (clarified butter) | 60 g | no | Milk / dairy |
| Cucumber | 160 g | no | — |
| Rocket (jarjeer) | 60 g | no | — |
| Pomegranate seeds | 40 g | no | — |
| Laban (cultured buttermilk) | 5 × 300 ml | no | Milk / dairy |
| Wheat flour | 180 g (luqaimat) | no | Cereals containing gluten (wheat) |
| Milk powder | 12 g | no | Milk / dairy |
| Dried yeast | 4 g | no | — |
| Sugar | 20 g | no | — |
| Sesame seeds | 6 g | no | Sesame |
| Sunflower oil | for frying | no | — |
| Salt | 15 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (200 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |
| Loomi & Sumac Dressing | included | none of the 14 major allergens | see ingredients-and-sauces.md#loomi-sumac-dressing |
| Dibs (Date Syrup) | topping (60 ml on the luqaimat) | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |

**Customisations**

- *Hashu* (choose one, required): `hashu_classic` Hashu with raisins — default; `hashu_no_raisins` Hashu without raisins; `hashu_none` No hashu

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: Hashu without raisins (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Sesame cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Gahwa Emirati (Dallah for the Table)

**Customer questions**

- **Q:** Can I get the Friday platter on another day?  
  **A:** No. It is cooked only on Fridays. You can pre-order it on any day for collection on a Friday (up to 7 days ahead). On other days, the Majlis Sharing Platter (serves 4) is available.
- **Q:** Can it be delivered?  
  **A:** No, the Friday platter is for collection or dine-in only.
- **Q:** How many people does it feed?  
  **A:** It is portioned for five adults.

### Whole Lamb Ouzi (أوزي) — AED 1,450

| Field | Value |
| --- | --- |
| ID / slug | `mi_whole_lamb_ouzi` / `whole-lamb-ouzi` |
| Also called | ouzi, quzi, ghuzi, whole lamb, roast lamb, kharoof |
| Type | Catering & large orders only |
| Availability | Catering order only, with at least 48 hours' notice. Maximum 3 per day. Pickup, catering delivery in Dubai, or served in the majlis. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | Serves 10–12: one whole lamb (8–9 kg dressed weight) on 2.5 kg (dry) rice |
| Serves | 10 people |
| Cooking method | Marinated overnight and slow-roasted for 6 hours. |
| Style | Emirati celebration dish. |
| Spice | Mild (1/3). Mild; extra dakkus can be supplied. |
| Preparation time | 480 minutes |
| Contains (ingredients) | Milk / dairy, Tree nuts, Sulphites |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No gluten-containing ingredients (not certified gluten-free); No egg ingredients; No sesame ingredients; No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 3 (daily limit 3 portions) |
| Catering / large orders | Catering only. Min 1. Max 3 per day. At least 48 h notice. Each ouzi counts as 12 portions. Maximum 3 per day. |
| Kitchen portions | 12 |

The centrepiece of Emirati celebrations: a whole young lamb marinated in bezar and loomi and slow-roasted for six hours, served on 2.5 kg of spiced basmati with hashu, fried almonds and pine nuts. Comes with dakkus and a large house salad. Ordered through our catering team with at least 48 hours' notice.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Whole young lamb | 1 lamb (8–9 kg dressed weight) | no | — |
| Basmati rice | 2.5 kg (dry weight) | no | — |
| Lamb stock (house-made) | 4 l | no | — |
| Onion | 1 kg | no | — |
| Tomato | 800 g | no | — |
| Garlic | 80 g | no | — |
| Loomi (dried black lime) | 8 whole | no | — |
| Cinnamon | 6 sticks | no | — |
| Green cardamom | 25 pods | no | — |
| Cloves | 12 | no | — |
| Ghee (clarified butter) | 200 g | no | Milk / dairy |
| Almonds | 120 g | yes | Tree nuts |
| Pine nuts | 60 g | yes | Tree nuts |
| Cucumber | 400 g | no | — |
| Rocket (jarjeer) | 150 g | no | — |
| Salt | 40 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | marinade | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (500 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |
| Loomi & Sumac Dressing | included | none of the 14 major allergens | see ingredients-and-sauces.md#loomi-sumac-dressing |

**Customisations**

- *Nut garnish* (choose one, required): `nuts_yes` With almonds and pine nuts — default; `nuts_no` No nut garnish

**Removing allergens**

- Tree nuts can be left out of the recipe by choosing: No nut garnish (traces may remain).
- Milk / dairy cannot be removed from this dish.
- Sulphites cannot be removed from this dish.

**Cross-contact notes**

- Roasted in the main oven, which is shared with other meat and fish dishes.

**Pairs well with:** Gahwa Emirati (Dallah for the Table), Luqaimat

**Customer questions**

- **Q:** How many people does a whole lamb ouzi feed?  
  **A:** 10 to 12 adults as the main dish.
- **Q:** Can I order an ouzi for tonight?  
  **A:** No. Each lamb is ordered from the butcher and marinated overnight, so we need at least 48 hours' notice.
- **Q:** Does the ouzi contain nuts?  
  **A:** Yes, it is garnished with fried almonds and pine nuts. You can request no nut garnish, but the kitchen handles nuts.

### Office Machboos Lunch Box (صندوق غداء المجبوس) — AED 45

| Field | Value |
| --- | --- |
| ID / slug | `mi_office_lunch_box` / `office-lunch-box` |
| Also called | lunch box, office lunch, corporate lunch, meal box, box meal |
| Type | Catering & large orders only |
| Availability | Catering order only: minimum 10 boxes, at least 24 hours' notice, collection or delivery between 10:00 and 21:00. |
| Rules (enforced) | Whenever the kitchen is open. |
| Portion | One box: machboos (150 g dry rice with chicken/lamb/vegetables), 120 g salad, 3 luqaimat, 330 ml water |
| Serves | 1 person |
| Cooking method | Batch-cooked and packed hot. |
| Style | Catering. |
| Spice | Mild (1/3). Mild; dakkus is packed on the side. |
| Preparation time | 240 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy, Sesame, Sulphites |
| May contain (traces) | Eggs, Celery, Mustard |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: no · Pickup: yes · Delivery: yes · Dine-in pre-order: no |
| Max per order | 150 (daily limit 150 portions) |
| Catering / large orders | Catering only. Min 10. Max 150 per day. Minimum 10 boxes per order; mix of mains allowed by ordering separate lines. |
| Kitchen portions | 1 |

Individually packed lunch boxes for offices and events: a full portion of machboos (chicken, lamb or vegetable) with dakkus, a small house salad, three luqaimat and a bottle of water. Labelled by box with the main and allergens.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Chicken (bone-in) | 300 g bone-in (raw weight) | no | — |
| Chicken stock (house-made) | 300 ml | no | — |
| Basmati rice | 150 g (dry weight) | no | — |
| Onion | 60 g | no | — |
| Tomato | 100 g | no | — |
| Loomi (dried black lime) | 1 whole | no | — |
| Ghee (clarified butter) | 10 g | no | Milk / dairy |
| Cucumber | 50 g | no | — |
| Rocket (jarjeer) | 20 g | no | — |
| Wheat flour | 27 g (luqaimat) | no | Cereals containing gluten (wheat) |
| Milk powder | 2 g | no | Milk / dairy |
| Sesame seeds | 1 g | no | Sesame |
| Sunflower oil | for frying | no | — |
| Bottled water | 330 ml | no | — |
| Salt | 3 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side (40 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |
| Loomi & Sumac Dressing | included | none of the 14 major allergens | see ingredients-and-sauces.md#loomi-sumac-dressing |
| Dibs (Date Syrup) | side (15 ml) | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |

**Customisations**

- *Main* (choose one, required): `main_chicken` Chicken machboos — default; `main_lamb` Lamb machboos (+AED 10); `main_vegetable` Vegetable machboos (no ghee, no hashu) (−AED 5)

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: Vegetable machboos (no ghee, no hashu) (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Sesame cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Karak Chai, Chilled Laban with Mint

**Customer questions**

- **Q:** Can I order 40 lunch boxes for my office tomorrow?  
  **A:** Yes, if the order is placed at least 24 hours before the delivery or collection time and catering capacity is available that day. Request a quote for the exact time and our catering team confirms it.
- **Q:** Can I mix chicken and vegetarian boxes?  
  **A:** Yes. Add one line per main (for example 30 chicken and 10 vegetable); the 10-box minimum applies to each line.

## Seasonal & Occasions — المواسم والمناسبات

Menus served only during Ramadan and UAE National Day (Eid Al Etihad).

### Ramadan Iftar Set Menu (per person) (سفرة الإفطار) — AED 125

| Field | Value |
| --- | --- |
| ID / slug | `mi_iftar_set` / `iftar-set` |
| Also called | iftar, iftar menu, ramadan menu, iftar set, ramadan set menu, fast breaking |
| Type | Limited-time offer |
| Availability | Ramadan only (Ramadan 2027 is provisionally 8 February – 9 March 2027). Served or collected between 17:30 and 20:30. Same-day orders must be placed by 14:00. Minimum 2 sets. Dine-in (with a reservation) or pickup; not delivered. |
| Rules (enforced) | Only during ramadan (see special-days-and-seasonal-menu.md). Served 17:30–20:30. Same-day orders must be placed by 14:00. Minimum 2 per order. Can be ordered for: pickup, dine_in_preorder. |
| Portion | Per person: 3 dates, 200 ml laban, 250 ml soup, 2 sambousa, 1 main, 5 luqaimat, 1 tea |
| Serves | 1 person |
| Cooking method | Prepared in sittings timed to sunset. |
| Style | Ramadan iftar set. |
| Spice | Mild (1/3). Mild; dakkus is served on the side. |
| Preparation time | 20 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Milk / dairy, Celery, Sesame, Sulphites |
| May contain (traces) | Eggs, Mustard |
| Diet | meat; No egg ingredients; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: no · Dine-in pre-order: yes |
| Max per order | 20 (daily limit 120 portions) |
| Catering / large orders | Eligible. Max 120 per day. At least 24 h notice. Iftar catering for groups needs 24 hours' notice. |
| Kitchen portions | 1 |

Break your fast the Emirati way. Each set includes three Khalas dates with laban, Shorbat Adas, two sambousa, a main of your choice (lamb machboos, chicken machboos, harees or vegetable machboos), five luqaimat with dibs, and karak or sulaimani. Minimum two sets per order or table.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Khalas dates | 3 dates | no | — |
| Laban (cultured buttermilk) | 200 ml | no | Milk / dairy |
| Red lentils | 50 g | no | — |
| Vegetable stock (house-made) | 220 ml | no | Celery |
| Celery | 10 g | no | Celery |
| Sourdough croutons | 10 g | no | Cereals containing gluten (wheat) |
| Sambousa pastry sheets | 30 g | no | Cereals containing gluten (wheat) |
| Minced lamb | 25 g | no | — |
| White brined cheese (akkawi) | 20 g | no | Milk / dairy |
| Lamb shoulder | 250 g bone-in (main) | no | — |
| Basmati rice | 130 g (dry weight) | no | — |
| Lamb stock (house-made) | 300 ml | no | — |
| Onion | 80 g | no | — |
| Tomato | 60 g | no | — |
| Loomi (dried black lime) | 1 whole | no | — |
| Ghee (clarified butter) | 15 g | no | Milk / dairy |
| Wheat flour | 45 g (luqaimat) | no | Cereals containing gluten (wheat) |
| Milk powder | 3 g | no | Milk / dairy |
| Sesame seeds | 2 g | no | Sesame |
| Black tea | 6 g | no | — |
| Evaporated milk | 60 ml | no | Milk / dairy |
| Sugar | 25 g | no | — |
| Sunflower oil | for frying | no | — |
| Salt | 5 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |
| Dibs (Date Syrup) | topping | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |

**Customisations**

- *Main course* (choose one, required): `main_lamb` Lamb machboos — default; `main_chicken` Chicken machboos; `main_harees` Harees; `main_vegetable` Vegetable machboos
- *Tea* (choose one, required): `tea_karak` Karak — default; `tea_sulaimani` Sulaimani

**Removing allergens**

- Sulphites can be left out of the recipe by choosing: Harees (traces may remain).
- Cereals containing gluten (wheat) cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Celery cannot be removed from this dish.
- Sesame cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Gahwa Emirati (Dallah for the Table)

**Customer questions**

- **Q:** Can I order the iftar menu outside Ramadan?  
  **A:** No. The Iftar Set Menu is only served during Ramadan. Outside Ramadan, many of the same dishes are on the regular menu: Shorbat Adas, sambousa, machboos, harees and luqaimat.
- **Q:** What time is iftar served?  
  **A:** We seat iftar guests from 17:30 and serve dates and laban at the sunset call to prayer. Pickup sets can be collected between 17:30 and 20:30.
- **Q:** Can I order iftar for one person?  
  **A:** The minimum is two sets per order or table.

### Eid Al Etihad Feast (National Day) (وليمة عيد الاتحاد) — AED 355

| Field | Value |
| --- | --- |
| ID / slug | `mi_etihad_feast` / `etihad-feast` |
| Also called | national day, national day special, eid al etihad, uae national day, national day feast, union feast |
| Type | Limited-time offer |
| Availability | Available 1–3 December 2026 only. Pre-orders open on 15 November 2026 and must be placed at least 24 hours ahead. Pickup, delivery or dine-in. Limited to 20 per day. |
| Rules (enforced) | Only during national day (see special-days-and-seasonal-menu.md). Orders open on 2026-11-15. Order at least 24 hours in advance. |
| Portion | Serves 4: 2 camel machboos, 2 harees, 4 chebab, large salad, 20 luqaimat, 1 dallah of gahwa |
| Serves | 4 people |
| Cooking method | Assembled from the festive kitchen production. |
| Style | Emirati celebration tray. |
| Spice | Mild (1/3). Mild; dakkus is served on the side. |
| Preparation time | 30 minutes |
| Contains (ingredients) | Cereals containing gluten (wheat), Eggs, Milk / dairy, Sesame, Sulphites |
| May contain (traces) | Celery, Mustard |
| Diet | meat; No nut ingredients (not a nut-free kitchen); No crustaceans or molluscs |
| Fulfilment | Dine-in: yes · Pickup: yes · Delivery: yes · Dine-in pre-order: yes |
| Max per order | 4 (daily limit 20 portions) |
| Catering / large orders | Not available in catering quantities (cooked to order). |
| Kitchen portions | 4 |

Our celebration of the Union, available only for Eid Al Etihad (UAE National Day): two portions of Thursday's camel machboos, two bowls of harees, four chebab with dibs, a large house salad, twenty luqaimat and a dallah of gahwa with dates — served on a brass tray.

**Ingredients**

| Ingredient | Quantity | Removable | Allergens |
| --- | --- | --- | --- |
| Camel meat | 560 g (raw weight) | no | — |
| Basmati rice | 300 g (dry weight) | no | — |
| Hulled wheat (harees wheat) | 240 g (dry weight) | no | Cereals containing gluten (wheat) |
| Lamb shoulder | 200 g (harees) | no | — |
| Ghee (clarified butter) | 80 g | no | Milk / dairy |
| Onion | 150 g | no | — |
| Tomato | 300 g | no | — |
| Loomi (dried black lime) | 2 whole | no | — |
| Cinnamon | 2 sticks | no | — |
| Green cardamom | 12 pods | no | — |
| Wheat flour | 340 g (chebab and luqaimat) | no | Cereals containing gluten (wheat) |
| Eggs | 1 egg (chebab) | no | Eggs |
| Full-cream milk | 80 ml | no | Milk / dairy |
| Milk powder | 12 g | no | Milk / dairy |
| Dried yeast | 6 g | no | — |
| Saffron | 0.2 g | no | — |
| Sugar | 40 g | no | — |
| Sesame seeds | 6 g | no | Sesame |
| Cucumber | 160 g | no | — |
| Rocket (jarjeer) | 60 g | no | — |
| Pomegranate seeds | 40 g | no | — |
| Arabic coffee beans (light roast) | 25 g | no | — |
| Khalas dates | 6 dates | no | — |
| Sunflower oil | for frying | no | — |
| Salt | 12 g | no | — |

**Sauces, marinades and named preparations**

| Preparation | Role | Allergens | Details |
| --- | --- | --- | --- |
| Bezar Spice Blend | included | none of the 14 major allergens | see ingredients-and-sauces.md#bezar-spice-blend |
| Hashu Topping | topping | Milk / dairy, Sulphites | see ingredients-and-sauces.md#hashu-topping |
| Dakkus Tomato-Chilli Sauce | side | none of the 14 major allergens | see ingredients-and-sauces.md#dakkus |
| Dibs (Date Syrup) | topping | none of the 14 major allergens | see ingredients-and-sauces.md#dibs-date-syrup |
| Loomi & Sumac Dressing | included | none of the 14 major allergens | see ingredients-and-sauces.md#loomi-sumac-dressing |

**Removing allergens**

- Cereals containing gluten (wheat) cannot be removed from this dish.
- Eggs cannot be removed from this dish.
- Milk / dairy cannot be removed from this dish.
- Sesame cannot be removed from this dish.
- Sulphites cannot be removed from this dish.

**Cross-contact notes**

- Fried in the general fryer, which is shared with sambousa, luqaimat, khanfaroosh and potato wedges (wheat, milk, eggs and sesame).

**Pairs well with:** Karak Chai

**Customer questions**

- **Q:** Can I pre-order the National Day feast now?  
  **A:** Pre-orders open on 15 November 2026 for 1–3 December 2026, and each order must be placed at least 24 hours before collection or delivery.
- **Q:** Is there a National Day menu on 4 December?  
  **A:** No, the feast is served only from 1 to 3 December 2026.
