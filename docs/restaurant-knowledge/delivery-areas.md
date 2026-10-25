# Delivery Areas & Fees

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> Where we deliver, fees, minimum orders and delivery rules.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/delivery-areas`; live availability must always be checked through the API.

We run our own delivery within Dubai, **12:00–22:30** (arrival times). Breakfast is not delivered. We do not deliver outside Dubai (no Abu Dhabi, Sharjah, Ajman or other emirates) and we do not use third-party delivery apps in this environment.

| Zone | Regular orders | Fee | Minimum order | Free above | Typical drive | Areas |
| --- | --- | --- | --- | --- | --- | --- |
| Zone A — Old Dubai | yes | AED 7 | AED 50 | AED 250 | 15 min | Al Seef, Al Fahidi, Bur Dubai, Al Souq Al Kabeer, Al Hamriya, Mankhool, Al Raffa, Umm Hurair 1, Al Ghubaiba |
| Zone B — Creek & Deira | yes | AED 12 | AED 80 | AED 350 | 25 min | Al Karama, Oud Metha, Umm Hurair 2, Al Jaddaf, Za'abeel, Al Satwa, Al Bada'a, Deira, Al Ras, Al Rigga, Port Saeed, Al Muraqqabat, Al Sabkha |
| Zone C — Downtown & Garhoud | yes | AED 18 | AED 120 | — | 35 min | Downtown Dubai, Business Bay, DIFC, Trade Centre, Jumeirah 1, Al Wasl, Al Garhoud, Dubai Festival City, Ras Al Khor, Dubai Healthcare City |
| Zone D — Greater Dubai (catering only) | catering only | AED 75 | AED 1,000 | — | 50 min | Dubai Marina, Jumeirah Lakes Towers, JBR, Palm Jumeirah, Al Barsha, Al Quoz, Umm Suqeim, Jumeirah 3, Dubai Hills, Mirdif, Al Qusais, Al Nahda, Dubai Silicon Oasis, Dubai Internet City, Dubai Media City |

## Rules

- Delivery time = the time food arrives; the kitchen schedules dispatch using the zone's drive time. Arrival is estimated within a 15-minute window.
- The earliest delivery = preparation lead time + drive time. “Deliver to Abu Dhabi in 15 minutes” is impossible: Abu Dhabi is outside our area, and no delivery is faster than lead time + drive time.
- A UAE mobile number is required so the driver can call.
- Address: area (must be in the list above), building or villa, street; plus apartment/unit, floor, landmark, Makani number and instructions if helpful.
- Payment: cash or card on delivery. Drivers carry change up to AED 200.
- If the driver cannot reach the customer within 10 minutes at the address, the order is marked `delivery_failed` and the team calls.
- Dishes that do not travel well are not delivered (see ordering-and-takeaway.md).

Area names are matched leniently (e.g. “Karama”, “Al Karama”). Unknown areas return `DELIVERY_AREA_NOT_SERVED` with the full list.
