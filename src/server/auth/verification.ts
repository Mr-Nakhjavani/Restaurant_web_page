import { checkPhone } from "@/domain/phone";
import { tokenMatches } from "@/domain/references";
import { ApiError } from "../errors";
import { isStaff, type Principal } from "./principal";

export interface VerificationInput {
  phone?: string | null;
  accessToken?: string | null;
}

const FAILURE_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

function lockedOut(ref: string): boolean {
  const f = failures.get(ref);
  if (!f) return false;
  if (Date.now() - f.first > LOCK_MS) {
    failures.delete(ref);
    return false;
  }
  return f.count >= FAILURE_LIMIT;
}

function recordFailure(ref: string) {
  const f = failures.get(ref);
  if (!f || Date.now() - f.first > LOCK_MS) failures.set(ref, { count: 1, first: Date.now() });
  else f.count += 1;
}

/** Throws VERIFICATION_REQUIRED before any lookup when no proof was supplied (prevents enumeration). */
export function requireVerificationInput(principal: Principal, v: VerificationInput) {
  if (isStaff(principal)) return;
  if (!v.phone && !v.accessToken) throw new ApiError("VERIFICATION_REQUIRED");
}

/**
 * Confirm the caller may see a customer record. Staff always may; customers and the
 * voice agent must present the access token or the phone number stored on the record.
 */
export function assertRecordAccess(
  principal: Principal,
  reference: string,
  record: { phone: string; accessTokenHash: string } | null,
  v: VerificationInput,
): asserts record is { phone: string; accessTokenHash: string } {
  if (isStaff(principal) && record) return;
  if (lockedOut(reference)) throw new ApiError("TOO_MANY_VERIFICATION_ATTEMPTS");
  if (!record) {
    recordFailure(reference);
    throw new ApiError("RECORD_NOT_FOUND");
  }
  if (v.accessToken && tokenMatches(v.accessToken, record.accessTokenHash)) return;
  if (v.phone) {
    const p = checkPhone(v.phone);
    if (p.valid && p.e164 === record.phone) return;
  }
  recordFailure(reference);
  throw new ApiError("RECORD_NOT_FOUND");
}

export function resetVerificationFailures() {
  failures.clear();
}
