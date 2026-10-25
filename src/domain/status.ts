import type { OrderType } from "./types";

export const ORDER_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "ready_to_serve",
  "completed",
  "cancelled",
  "rejected",
  "not_collected",
  "delivery_failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_INFO: Record<OrderStatus, { label: string; description: string; terminal: boolean; active: boolean }> = {
  pending_confirmation: { label: "Received — awaiting confirmation", description: "The order is recorded but the restaurant has not yet accepted it. Do not tell the customer it is confirmed.", terminal: false, active: true },
  confirmed: { label: "Confirmed", description: "The restaurant has accepted the order and scheduled it for the promised time.", terminal: false, active: true },
  preparing: { label: "Being prepared", description: "The kitchen has started cooking. The order can no longer be changed or cancelled online.", terminal: false, active: true },
  ready_for_pickup: { label: "Ready for collection", description: "The order is packed and waiting at the collection counter.", terminal: false, active: true },
  out_for_delivery: { label: "Out for delivery", description: "A driver has collected the order.", terminal: false, active: true },
  ready_to_serve: { label: "Ready to serve", description: "The pre-ordered food is ready to be served at the table.", terminal: false, active: true },
  completed: { label: "Completed", description: "Collected, delivered or served.", terminal: true, active: false },
  cancelled: { label: "Cancelled", description: "Cancelled by the customer or the restaurant.", terminal: true, active: false },
  rejected: { label: "Declined by the restaurant", description: "The restaurant could not accept the order.", terminal: true, active: false },
  not_collected: { label: "Not collected", description: "The order was not collected within the holding time.", terminal: true, active: false },
  delivery_failed: { label: "Delivery failed", description: "The driver could not complete the delivery.", terminal: true, active: false },
};

/** Statuses counted against kitchen capacity and daily limits. */
export const CAPACITY_ORDER_STATUSES: OrderStatus[] = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "ready_to_serve",
  "completed",
];

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ["confirmed", "rejected", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "ready_to_serve", "cancelled"],
  ready_for_pickup: ["completed", "not_collected"],
  out_for_delivery: ["completed", "delivery_failed"],
  ready_to_serve: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
  not_collected: [],
  delivery_failed: [],
};

export function allowedOrderTransitions(status: OrderStatus, type: OrderType): OrderStatus[] {
  return ORDER_TRANSITIONS[status].filter((next) => {
    if (next === "ready_for_pickup") return type === "pickup";
    if (next === "out_for_delivery") return type === "delivery";
    if (next === "ready_to_serve") return type === "dine_in_preorder";
    return true;
  });
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus, type: OrderType): boolean {
  return allowedOrderTransitions(from, type).includes(to);
}

/** Statuses from which a customer may still cancel or modify (subject to time cut-offs). */
export const CUSTOMER_MUTABLE_ORDER_STATUSES: OrderStatus[] = ["pending_confirmation", "confirmed"];

export const RESERVATION_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
  "rejected",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_INFO: Record<ReservationStatus, { label: string; description: string; holdsTable: boolean; terminal: boolean }> = {
  pending_confirmation: { label: "Requested — awaiting confirmation", description: "A table is held while the team reviews the request (large groups). Not yet confirmed.", holdsTable: true, terminal: false },
  confirmed: { label: "Confirmed", description: "The table is booked.", holdsTable: true, terminal: false },
  seated: { label: "Seated", description: "The guests have arrived and are seated.", holdsTable: true, terminal: false },
  completed: { label: "Completed", description: "The visit is finished.", holdsTable: false, terminal: true },
  cancelled: { label: "Cancelled", description: "Cancelled by the guest or the restaurant.", holdsTable: false, terminal: true },
  no_show: { label: "No-show", description: "The guests did not arrive within the grace period.", holdsTable: false, terminal: true },
  rejected: { label: "Declined", description: "The restaurant could not accommodate the request.", holdsTable: false, terminal: true },
};

export const TABLE_HOLDING_RESERVATION_STATUSES: ReservationStatus[] = ["pending_confirmation", "confirmed", "seated"];

const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending_confirmation: ["confirmed", "rejected", "cancelled"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
  rejected: [],
};

export function allowedReservationTransitions(status: ReservationStatus): ReservationStatus[] {
  return RESERVATION_TRANSITIONS[status];
}

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[from].includes(to);
}
