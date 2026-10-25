/**
 * Customer-service policy facts that are not operational settings but must be
 * quoted identically everywhere (knowledge base, FAQ, API policies endpoint).
 */
export const policyFacts = {
  complaintWindowHours: 24,
  lateOrderFreeCancelMinutes: 20,
  driverChangeAed: 200,
  deliveryWaitMinutes: 10,
  hotHoldingMinutes: 30,
  celebrationCakeFeeAed: 30,
  highChairsTotal: 6,
  maxHighChairsPerBooking: 4,
  verificationFailureLimit: 5,
  verificationLockMinutes: 15,
  lateCancellationThresholdMinutes: 120,
  refundMethod:
    "Refunds for items paid by card go back to the original card through the restaurant's card terminal; cash payments are refunded in cash or as a credit note. No card details are ever taken over the phone.",
} as const;
