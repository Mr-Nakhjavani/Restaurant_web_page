# Policies & Edge Cases

> **Fictional test restaurant.** Bayt Al Ghaf (بيت الغاف) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.
>
> How unusual situations, exceptions, complaints, cancellations, refunds, substitutions, late orders, unavailable items and ambiguous requests are handled.
>
> Generated from the restaurant's canonical data (data version `cf5711bbbcc1`). The live, always-current version of this document is served at `GET /api/v1/knowledge/documents/policies-and-edge-cases`; live availability must always be checked through the API.

## Principles

1. **The backend is the authority.** Availability, prices, times and confirmations come from the API response, never from memory or from this document alone.
2. **Say no clearly, then help.** When a request is outside policy: explain the rule in one sentence, offer the closest real alternative, and escalate if the guest needs something only staff can decide.
3. **Never promise what was not confirmed** — tables, times, allergen safety, refunds, discounts or exceptions.
4. **Ask when ambiguous.** Dish names (“machboos”), sauces (“house sauce”), dates (“Friday” — this week or next?), and party sizes.
5. **Protect privacy.** Customer records are only discussed after verification (reference + phone number).

## Complaints

- Listen, apologise, collect the order/reservation reference, name, phone number and a short description. Food issues: within 24 hours, with a photo via WhatsApp (+971 50 555 0142) if possible.
- The duty manager decides on replacements, refunds or credits and calls back. The agent must not promise compensation.
- Abusive callers: stay polite, warn once, then end the call and log it.

## Missing or incorrect items

- Verify the order, note which items are missing/incorrect, and promise a call-back from the team (not a specific remedy). Usual outcomes: re-delivery or replacement, or a refund/credit. Refunds for items paid by card go back to the original card through the restaurant's card terminal; cash payments are refunded in cash or as a credit note. No card details are ever taken over the phone.

## Refunds

- Regular orders are paid in person, so cancelling before payment needs no refund.
- Paid items missing or wrong: Refunds for items paid by card go back to the original card through the restaurant's card terminal; cash payments are refunded in cash or as a credit note. No card details are ever taken over the phone.
- Catering deposits: refundable when cancelled at least 24 hours before; otherwise decided by the catering team.

## Cancellations

- Reservations: free until the booking time; late cancellations (under 2 hours) are noted.
- Regular orders: free until preparation starts; afterwards staff decide.
- Catering orders: free until 24 hours before; afterwards the catering team decides.

## Substitutions and unavailable items

- Before ordering: if a dish is unavailable the API says why (sold out, wrong day, outside hours, season) and gives `nextAvailable` and `alternatives`. Offer those.
- After ordering: if a dish runs out, staff remove it (the order is re-totalled) and call to offer a similar substitute or cancellation. Customers are never charged for removed items and substitutions are never made without consent.
- Hammour is sourced outside the UAE seasonal fishing ban; when unavailable it is marked sold out rather than substituted silently.

## Late orders (restaurant side)

- If the kitchen is running late, the team calls with a new time. Customers may cancel free of charge if an order is more than 20 minutes late.

## Late or missed pickups (customer side)

- Orders are held 60 minutes after the pickup time; then marked `not_collected`. Repeated non-collection (2 in 90 days) means future orders from that number are confirmed manually.

## Late arrivals and no-shows (reservations)

- Tables are held 15 minutes, then may be released as a no-show. Guests who call ahead are accommodated where possible.

## Requests we decline

| Request | Response |
| --- | --- |
| Serve a day- or season-specific dish on another day, even for extra money | Decline; offer pre-order for its day or an alternative. |
| Keep the restaurant open after hours | Decline; events team for future private events. |
| Guarantee no cross-contamination / allergen-free | Decline; read the kitchen allergen statement. |
| Promise a specific table or area when it is booked | Decline; offer other times or areas. |
| Deliver outside Dubai, or faster than lead time + drive time | Decline; offer pickup. |
| Reserve without a phone number | Decline. |
| Take card details by phone | Decline; payment is in person. |
| Discounts or price matching | Decline; only published catering volume discounts exist. |
| Bring own alcohol, shisha or smoking | Decline; alcohol-free, no smoking. |
| Parties above 20 | Escalate to the events team. |
| Catering above 250 portions or beyond capacity | Escalate to the events team. |
| Medical or nutritional advice | Give factual menu information only. |

## Ambiguous requests — what to ask

| Guest says | Ask |
| --- | --- |
| “Machboos” | Lamb, chicken or vegetable? (camel on Thursdays) |
| “The house sauce” | Which dish? House Red (walnuts, wheat), House Green, or Sauce No. 7 (soy, wheat, sesame)? |
| “Friday” / “next weekend” | Confirm the calendar date (Dubai time). |
| “A table for a big group” | Exact number of guests, including children. |
| “Something without dairy” | Is it an allergy or a preference? Which dishes interest them? |
| “Platter” | Majlis Sharing Platter (daily, serves 4) or Friday Family Platter (Fridays, serves 5)? |
| “Deliver to my office” | Area, building, street and unit; then check the zone. |
| “As soon as possible” | Pickup or delivery? Then quote ASAP and read back the accepted time. |

## Other situations

- **Lost property:** kept for 30 days; the team calls back.
- **Celebration cakes:** allowed with notice (plating fee AED 30).
- **Professional photography:** needs written permission from management.
- **Prayer:** a shared prayer room is on the first floor of the Heritage Quarter building.
- **Data:** we store name, phone number and (optionally) e-mail for bookings and orders only, to manage them. Callers can ask staff to delete their data.
- **Emergencies:** for medical emergencies call 998 (ambulance) or 999 (police) in the UAE. The agent should not try to handle emergencies.
- **Fictional business:** this is a test restaurant; if a caller appears to believe it is real and intends to travel or pay, say it is a simulation.

Agent test cases for these situations: agent-test-scenarios.md (30 scenarios).
