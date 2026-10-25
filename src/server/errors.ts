/**
 * Machine-readable error catalogue. Every error returned by the API uses one of
 * these codes; the catalogue is exported to docs/api/error-codes.md and to the
 * OpenAPI description so external agents can branch on `error.code`.
 */

export type ErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "verification"
  | "not_found"
  | "conflict"
  | "business_rule"
  | "unavailable_item"
  | "rate_limit"
  | "server";

interface ErrorSpec {
  status: number;
  category: ErrorCategory;
  retryable: boolean;
  description: string;
  agentGuidance: string;
}

export const ERROR_CATALOG = {
  // --- request shape -------------------------------------------------------
  VALIDATION_ERROR: { status: 400, category: "validation", retryable: false, description: "The request body, query or path parameters failed validation. `details.issues` lists each field.", agentGuidance: "Ask the customer for the missing or invalid information, then retry with corrected values." },
  INVALID_JSON: { status: 400, category: "validation", retryable: false, description: "The request body is not valid JSON.", agentGuidance: "Fix the client request; this is not a customer problem." },
  PAYLOAD_TOO_LARGE: { status: 413, category: "validation", retryable: false, description: "The request body exceeds the size limit (64 KB).", agentGuidance: "Send a smaller request." },
  ROUTE_NOT_FOUND: { status: 404, category: "not_found", retryable: false, description: "No API route matches the method and path.", agentGuidance: "Check the URL against the OpenAPI specification." },
  // --- auth ----------------------------------------------------------------
  AUTHENTICATION_REQUIRED: { status: 401, category: "authentication", retryable: false, description: "This endpoint requires an API key or an admin session.", agentGuidance: "Send `Authorization: Bearer <api key>`." },
  INVALID_API_KEY: { status: 401, category: "authentication", retryable: false, description: "The API key is unknown or revoked.", agentGuidance: "Stop and alert an operator; do not retry with the same key." },
  INVALID_CREDENTIALS: { status: 401, category: "authentication", retryable: false, description: "Email or password is incorrect.", agentGuidance: "Admin login only." },
  FORBIDDEN: { status: 403, category: "authorization", retryable: false, description: "The credentials are valid but lack the required scope or role.", agentGuidance: "This action is reserved for restaurant staff; offer to escalate to the team." },
  VERIFICATION_REQUIRED: { status: 401, category: "verification", retryable: false, description: "Access to a customer record requires the phone number used for the booking/order (`X-Customer-Phone`) or the access token (`X-Access-Token`).", agentGuidance: "Ask the caller for the phone number used when booking, then retry with `X-Customer-Phone`." },
  RECORD_NOT_FOUND: { status: 404, category: "not_found", retryable: false, description: "No order or reservation matches this reference and verification. (For privacy the API does not say which part was wrong.)", agentGuidance: "Read the reference back to the caller and confirm the phone number; after two failures, offer to transfer to staff." },
  TOO_MANY_VERIFICATION_ATTEMPTS: { status: 429, category: "rate_limit", retryable: true, description: "Too many failed verification attempts for this reference. Locked for 15 minutes.", agentGuidance: "Do not keep guessing. Offer to have the team call the customer back." },
  RATE_LIMITED: { status: 429, category: "rate_limit", retryable: true, description: "Too many requests. See the `Retry-After` header.", agentGuidance: "Wait for the number of seconds in `Retry-After` and retry." },
  // --- generic -------------------------------------------------------------
  NOT_FOUND: { status: 404, category: "not_found", retryable: false, description: "The requested resource (menu item, ingredient, sauce, document, FAQ, quote…) does not exist.", agentGuidance: "Use the list or search endpoints to find the correct id; never guess." },
  IDEMPOTENCY_KEY_REUSED: { status: 422, category: "validation", retryable: false, description: "The Idempotency-Key was already used with a different request body.", agentGuidance: "Generate a new Idempotency-Key for each distinct order or booking." },
  IDEMPOTENCY_REQUEST_IN_PROGRESS: { status: 409, category: "conflict", retryable: true, description: "A request with the same Idempotency-Key is still being processed.", agentGuidance: "Wait a second and retry with the same key; you will receive the original result." },
  INVALID_STATUS_TRANSITION: { status: 409, category: "conflict", retryable: false, description: "The requested status change is not allowed from the current status.", agentGuidance: "Re-read the record's status and allowed transitions." },
  INTERNAL_ERROR: { status: 500, category: "server", retryable: true, description: "Unexpected server error. Nothing should be assumed to have happened.", agentGuidance: "Do not tell the customer the action succeeded. Retry once (with the same Idempotency-Key for creates); if it fails again, apologise and offer a call-back." },
  SERVICE_UNAVAILABLE: { status: 503, category: "server", retryable: true, description: "A dependency (e.g. the database) is unavailable.", agentGuidance: "Retry after a short wait; if it persists, take the customer's details for a call-back. Never confirm anything." },
  // --- menu / items --------------------------------------------------------
  ITEM_UNAVAILABLE: { status: 422, category: "unavailable_item", retryable: false, description: "One or more dishes cannot be served for the requested date, time or order type. `details.items[]` has per-item reasons, the next available date and suggested alternatives.", agentGuidance: "Explain the reason (e.g. Fridays only), offer `nextAvailable` or one of `alternatives`, and re-quote." },
  UNKNOWN_MENU_ITEM: { status: 422, category: "validation", retryable: false, description: "An item id in the order does not exist.", agentGuidance: "Search the menu (`GET /menu/search`) to resolve the dish the customer means." },
  INVALID_CUSTOMIZATION: { status: 422, category: "validation", retryable: false, description: "A selected option does not exist for the item, or the selection breaks the group's rules. `details.availableOptions` lists valid choices.", agentGuidance: "Offer only the listed options; anything else is not possible." },
  INVALID_QUANTITY: { status: 422, category: "validation", retryable: false, description: "Quantity is not a whole number within the allowed range for the item.", agentGuidance: "Tell the customer the maximum per order; very large quantities go through a catering quote." },
  BULK_ONLY_ITEM: { status: 422, category: "business_rule", retryable: false, description: "The item (e.g. Whole Lamb Ouzi, Office Lunch Box) can only be ordered through the catering flow.", agentGuidance: "Request a quote with `POST /bulk-orders/quotes`." },
  REQUIRES_BULK_ORDER: { status: 422, category: "business_rule", retryable: false, description: "The order exceeds the regular-order portion limit and must be placed as a catering (bulk) order with advance notice.", agentGuidance: "Explain the limit and switch to `POST /bulk-orders/quotes`." },
  EMPTY_ORDER: { status: 422, category: "validation", retryable: false, description: "The order has no items.", agentGuidance: "Ask what the customer would like to order." },
  // --- customer & delivery -------------------------------------------------
  INVALID_PHONE: { status: 422, category: "validation", retryable: false, description: "The phone number is not a valid number. UAE numbers can be local (050 123 4567); international numbers need a country code.", agentGuidance: "Read the number back digit by digit and ask the customer to confirm it." },
  DELIVERY_ADDRESS_REQUIRED: { status: 422, category: "validation", retryable: false, description: "Delivery orders need an address (area, building/villa and street; unit if applicable).", agentGuidance: "Ask for the missing address fields listed in `details.missing`." },
  DELIVERY_AREA_NOT_SERVED: { status: 422, category: "business_rule", retryable: false, description: "We do not deliver to this area. `details.servedAreas` lists covered areas.", agentGuidance: "Offer pickup instead; do not promise delivery." },
  DELIVERY_ZONE_CATERING_ONLY: { status: 422, category: "business_rule", retryable: false, description: "This area is covered for catering orders only, not regular takeaway delivery.", agentGuidance: "Offer pickup, or a catering quote if the order is large." },
  BELOW_DELIVERY_MINIMUM: { status: 422, category: "business_rule", retryable: false, description: "The order subtotal is below the minimum for delivery to this zone.", agentGuidance: "Tell the customer the minimum (`details.minimumOrder`) and offer to add items or switch to pickup." },
  DELIVERY_REQUIRES_UAE_MOBILE: { status: 422, category: "business_rule", retryable: false, description: "Delivery orders need a UAE mobile number so the driver can call.", agentGuidance: "Ask for a UAE mobile number (05X XXX XXXX)." },
  DELIVERY_UNAVAILABLE: { status: 422, category: "business_rule", retryable: true, description: "Delivery is switched off at the moment.", agentGuidance: "Offer pickup." },
  RESERVATION_REQUIRED_FOR_PREORDER: { status: 422, category: "business_rule", retryable: false, description: "Dine-in pre-orders must be linked to a confirmed reservation made with the same phone number.", agentGuidance: "Book a table first (`POST /reservations`), then place the pre-order with its reference." },
  RESERVATION_MISMATCH: { status: 422, category: "business_rule", retryable: false, description: "The linked reservation is not confirmed, belongs to another phone number, or is for a different date.", agentGuidance: "Check the reservation reference and date with the customer." },
  // --- timing & capacity ---------------------------------------------------
  TIME_TOO_SOON: { status: 422, category: "business_rule", retryable: false, description: "The kitchen cannot have the order ready by the requested time. `details.alternatives` has the earliest feasible times.", agentGuidance: "Offer the earliest time in `details.alternatives`; never promise the original time." },
  OUTSIDE_ORDERING_HOURS: { status: 422, category: "business_rule", retryable: false, description: "The requested time is outside pickup/delivery hours for that day.", agentGuidance: "Offer one of `details.alternatives`." },
  TOO_FAR_IN_ADVANCE: { status: 422, category: "business_rule", retryable: false, description: "The date is beyond the advance-booking window (7 days for orders, 60 days for tables, 90 days for catering).", agentGuidance: "Ask the customer to call back nearer the date, or use catering for large orders." },
  RESTAURANT_CLOSED: { status: 422, category: "business_rule", retryable: false, description: "The restaurant is closed (or the relevant service is closed) at the requested date/time.", agentGuidance: "Give the opening hours from `GET /restaurant/hours` and offer another time." },
  INVALID_TIME: { status: 422, category: "validation", retryable: false, description: "Times must fall on 15-minute slots (e.g. 13:00, 13:15).", agentGuidance: "Round to the nearest slot and confirm with the customer." },
  SLOT_FULL: { status: 409, category: "conflict", retryable: false, description: "The kitchen is fully booked for that time slot. `details.alternatives` lists nearby times.", agentGuidance: "Offer the nearest alternative time." },
  ORDERING_PAUSED: { status: 422, category: "business_rule", retryable: true, description: "The restaurant has temporarily paused new orders.", agentGuidance: "Apologise and suggest trying later; take a message if needed." },
  DUPLICATE_ORDER: { status: 409, category: "conflict", retryable: false, description: "An identical order for the same phone number and time was placed in the last few minutes. `details.existingOrderNumber` gives its reference.", agentGuidance: "Ask whether the customer wants a second, identical order; if so, change something or wait and retry." },
  // --- modifications -------------------------------------------------------
  ORDER_NOT_MODIFIABLE: { status: 409, category: "conflict", retryable: false, description: "The order's status no longer allows changes or cancellation online (e.g. it is being prepared).", agentGuidance: "Offer to pass the request to the team, who will call back; do not promise the change." },
  MODIFICATION_WINDOW_CLOSED: { status: 422, category: "business_rule", retryable: false, description: "Changes must be made before the cut-off (30 minutes before the order time / 2 hours before a reservation).", agentGuidance: "Explain the cut-off and offer to escalate to staff." },
  CANCELLATION_WINDOW_CLOSED: { status: 422, category: "business_rule", retryable: false, description: "The record can no longer be cancelled online (preparation has started, or catering free-cancellation period has passed).", agentGuidance: "Escalate to staff; do not promise a refund." },
  // --- reservations --------------------------------------------------------
  RESERVATIONS_PAUSED: { status: 422, category: "business_rule", retryable: true, description: "The restaurant has paused new reservations.", agentGuidance: "Mention that walk-ins are welcome subject to availability." },
  INVALID_PARTY_SIZE: { status: 422, category: "validation", retryable: false, description: "Party size must be a positive whole number.", agentGuidance: "Ask how many guests, including children." },
  PARTY_TOO_LARGE: { status: 422, category: "business_rule", retryable: false, description: "The party exceeds the largest bookable table (20 guests).", agentGuidance: "Offer the events team (events@…) for private hire; do not book." },
  DATE_IN_PAST: { status: 422, category: "validation", retryable: false, description: "The requested date/time has already passed.", agentGuidance: "Confirm the intended date (Dubai time)." },
  INSUFFICIENT_NOTICE: { status: 422, category: "business_rule", retryable: false, description: "Not enough advance notice for this booking or item.", agentGuidance: "Offer the next time that satisfies the notice period." },
  OUTSIDE_SEATING_HOURS: { status: 422, category: "business_rule", retryable: false, description: "The start time is outside reservation hours for that day (last seating is 90 minutes before closing).", agentGuidance: "Offer one of `details.alternatives`." },
  MAJLIS_MIN_PARTY: { status: 422, category: "business_rule", retryable: false, description: "Private majlis rooms are for groups of 6 or more.", agentGuidance: "Offer a regular table." },
  MAJLIS_NOTICE: { status: 422, category: "business_rule", retryable: false, description: "Majlis rooms need 24 hours' notice.", agentGuidance: "Offer a regular table or a later date." },
  TERRACE_CLOSED: { status: 422, category: "business_rule", retryable: false, description: "The outdoor terrace is closed for the season (May–mid-October) or for weather.", agentGuidance: "Offer indoor or window seating." },
  NO_TABLE_AVAILABLE: { status: 409, category: "conflict", retryable: false, description: "No suitable table is free at that time. `details.alternatives` lists nearby times (and `details.otherDates` if the day is full).", agentGuidance: "Offer the alternatives; never promise a table that the API did not confirm." },
  SEATING_PREFERENCE_UNAVAILABLE: { status: 409, category: "conflict", retryable: false, description: "The requested seating area is fully booked at that time, although other areas may be free (`details.availableAreas`).", agentGuidance: "Offer another area at the same time or the same area at another time." },
  DUPLICATE_RESERVATION: { status: 409, category: "conflict", retryable: false, description: "This phone number already has an active reservation overlapping that time. `details.existingReference` gives it.", agentGuidance: "Offer to modify the existing booking instead of creating a second one." },
  RESERVATION_NOT_MODIFIABLE: { status: 409, category: "conflict", retryable: false, description: "The reservation is cancelled, completed or otherwise no longer changeable.", agentGuidance: "Offer to make a new reservation." },
  // --- bulk / catering -----------------------------------------------------
  QUOTE_EXPIRED: { status: 409, category: "conflict", retryable: false, description: "The catering quote has expired (quotes are valid for 48 hours).", agentGuidance: "Request a new quote; prices and capacity may have changed." },
  QUOTE_NOT_FEASIBLE: { status: 422, category: "business_rule", retryable: false, description: "The quote has blocking issues and cannot be turned into an order.", agentGuidance: "Explain `details.issues` and offer `details.alternatives` or escalation to the events team." },
  QUOTE_ALREADY_USED: { status: 409, category: "conflict", retryable: false, description: "An order has already been placed from this quote.", agentGuidance: "Look up the existing order with `details.orderNumber`." },
  BULK_NOT_FEASIBLE: { status: 422, category: "business_rule", retryable: false, description: "The catering request cannot be fulfilled as specified (notice, capacity or item limits).", agentGuidance: "Offer the feasible alternatives returned; escalate above-capacity events." },
} as const satisfies Record<string, ErrorSpec>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly retryable: boolean;
  readonly category: ErrorCategory;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    const spec = ERROR_CATALOG[code];
    super(message ?? spec.description);
    this.code = code;
    this.status = spec.status;
    this.details = details;
    this.retryable = spec.retryable;
    this.category = spec.category;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    status: number;
    category: ErrorCategory;
    retryable: boolean;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export function errorBody(err: ApiError, requestId: string): ErrorBody {
  return {
    error: {
      code: err.code,
      message: err.message,
      status: err.status,
      category: err.category,
      retryable: err.retryable,
      requestId,
      ...(err.details ? { details: err.details } : {}),
    },
  };
}
