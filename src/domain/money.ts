/** Money is always handled as integer fils (1 AED = 100 fils) to avoid rounding errors. */

export interface Money {
  amountFils: number;
  amount: number;
  currency: "AED";
  formatted: string;
}

export function formatAed(fils: number): string {
  const negative = fils < 0;
  const abs = Math.abs(fils);
  const whole = Math.floor(abs / 100);
  const rem = abs % 100;
  const wholeStr = whole.toLocaleString("en-US");
  const body = rem === 0 ? wholeStr : `${wholeStr}.${String(rem).padStart(2, "0")}`;
  return `${negative ? "−" : ""}AED ${body}`;
}

export function money(fils: number): Money {
  return { amountFils: fils, amount: fils / 100, currency: "AED", formatted: formatAed(fils) };
}

/** VAT contained in a VAT-inclusive amount (e.g. 5% → amount × 5 / 105), rounded to the nearest fils. */
export function vatIncluded(totalFils: number, vatRatePercent: number): number {
  return Math.round((totalFils * vatRatePercent) / (100 + vatRatePercent));
}

export function percentOf(fils: number, percent: number): number {
  return Math.round((fils * percent) / 100);
}
