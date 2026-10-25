const KEY = "bayt-al-ghaf.reservations.v1";

export function rememberReservation(reference: string, token: string) {
  try {
    const list = recentReservations().filter((r) => r.reference !== reference);
    list.unshift({ reference, token });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* ignore */
  }
}

export function recentReservations(): { reference: string; token: string }[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
