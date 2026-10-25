const KEY = "bayt-al-ghaf.orders.v1";

export interface RememberedOrder {
  number: string;
  token: string;
  savedAt: string;
}

export function rememberOrder(number: string, token: string) {
  try {
    const list = recentOrders().filter((o) => o.number !== number);
    list.unshift({ number, token, savedAt: new Date().toISOString() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* storage unavailable */
  }
}

export function recentOrders(): RememberedOrder[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RememberedOrder[]) : [];
  } catch {
    return [];
  }
}

export function tokenFor(number: string): string | null {
  return recentOrders().find((o) => o.number === number)?.token ?? null;
}
