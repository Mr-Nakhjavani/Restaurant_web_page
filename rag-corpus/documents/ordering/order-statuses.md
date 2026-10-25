---
id: "order-statuses"
title: "Bayt Al Ghaf order statuses explained"
type: "ordering"
summary: "What each Bayt Al Ghaf order status means, from awaiting confirmation to completed, and the typical order journey."
entities: ["order-status:pending-confirmation", "order-status:confirmed", "order-status:preparing", "order-status:ready-for-pickup", "order-status:out-for-delivery", "order-status:ready-to-serve", "order-status:completed", "order-status:cancelled", "order-status:rejected", "order-status:not-collected", "order-status:delivery-failed"]
tags: ["ordering", "status"]
language: "en"
restaurant: "Bayt Al Ghaf"
data_version: "cf5711bbbcc1"
---

# Bayt Al Ghaf order statuses explained

What each Bayt Al Ghaf order status means, from awaiting confirmation to completed, and the typical order journey.

## Bayt Al Ghaf order status: Received — awaiting confirmation

Received — awaiting confirmation (system status pending_confirmation): The order has been received but not yet accepted. The team reviews it (for example large or high-value orders) and calls to confirm. It is not confirmed until the team accepts it.

## Bayt Al Ghaf order status: Confirmed

Confirmed (system status confirmed): Bayt Al Ghaf has accepted the order and scheduled it for the agreed time.

## Bayt Al Ghaf order status: Being prepared

Being prepared (system status preparing): The kitchen has started cooking. From this point the order can no longer be changed or cancelled online.

## Bayt Al Ghaf order status: Ready for collection

Ready for collection (system status ready_for_pickup): The order is packed and waiting at the takeaway counter at Heritage Quarter Gate 3.

## Bayt Al Ghaf order status: Out for delivery

Out for delivery (system status out_for_delivery): A Bayt Al Ghaf driver has collected the order and is on the way.

## Bayt Al Ghaf order status: Ready to serve

Ready to serve (system status ready_to_serve): The pre-ordered food is ready to be served at the guest's table.

## Bayt Al Ghaf order status: Completed

Completed (system status completed): The order has been collected, delivered or served.

## Bayt Al Ghaf order status: Cancelled

Cancelled (system status cancelled): The order was cancelled by the customer or by the restaurant.

## Bayt Al Ghaf order status: Declined by the restaurant

Declined by the restaurant (system status rejected): Bayt Al Ghaf could not accept the order.

## Bayt Al Ghaf order status: Not collected

Not collected (system status not_collected): The pickup order was not collected within the 60-minute holding time and was not kept, for food-safety reasons.

## Bayt Al Ghaf order status: Delivery failed

Delivery failed (system status delivery_failed): The driver could not complete the delivery (for example the customer could not be reached at the address for 10 minutes); the team calls the customer.

## Typical Bayt Al Ghaf order journey

Awaiting confirmation (only when a review applies) → Confirmed → Being prepared → Ready for collection, Out for delivery or Ready to serve → Completed. An order can also end as Cancelled, Declined, Not collected or Delivery failed.

## Related documents

- [Changing or cancelling an order](changes-and-cancellations.md)
