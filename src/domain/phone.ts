import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface PhoneCheck {
  valid: boolean;
  e164: string | null;
  isUae: boolean;
  isUaeMobile: boolean;
  display: string | null;
  error?: string;
}

/**
 * Validate and normalise a phone number. Local UAE formats ("050 123 4567",
 * "04 555 0142") are interpreted with the +971 country code; international
 * numbers must include their country code.
 */
export function checkPhone(raw: string): PhoneCheck {
  const input = (raw ?? "").trim();
  if (!input) return { valid: false, e164: null, isUae: false, isUaeMobile: false, display: null, error: "Phone number is required." };
  const cleaned = input.replace(/^00/, "+");
  const parsed = parsePhoneNumberFromString(cleaned, "AE");
  if (!parsed || !parsed.isValid()) {
    return {
      valid: false,
      e164: null,
      isUae: false,
      isUaeMobile: false,
      display: null,
      error: "Enter a valid phone number, e.g. 050 123 4567 or +971 50 123 4567 (international numbers need their country code).",
    };
  }
  const isUae = parsed.country === "AE" || parsed.countryCallingCode === "971";
  const type = parsed.getType();
  // libphonenumber may return undefined type with min metadata; fall back to the UAE mobile prefix rule.
  const national = parsed.nationalNumber.toString();
  const isUaeMobile = isUae && (type === "MOBILE" || /^5[0-9]{8}$/.test(national));
  return { valid: true, e164: parsed.number, isUae, isUaeMobile, display: parsed.formatInternational() };
}

/** Mask a phone number for logs and non-verified displays: +971 50 *** **67 */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  if (e164.length <= 6) return "***";
  return `${e164.slice(0, 6)}****${e164.slice(-2)}`;
}

export function phonesMatch(a: string, b: string): boolean {
  const pa = checkPhone(a);
  const pb = checkPhone(b);
  return pa.valid && pb.valid && pa.e164 === pb.e164;
}
