import { beforeAll, describe, expect, it } from "vitest";
import { menuItems } from "@/data";
import { call, MONDAY_10, apiKey, bearer } from "./helpers";
import { clearTransactions, resetDatabase } from "./db-reset";

beforeAll(async () => {
  await resetDatabase();
  await clearTransactions();
});

describe("restaurant information", () => {
  it("reports health with a request id", async () => {
    const r = await call("GET", "/health");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "ok", database: "ok" });
    expect(r.headers.get("x-request-id")).toMatch(/^req_/);
  });

  it("echoes a valid incoming X-Request-Id", async () => {
    const r = await call("GET", "/restaurant", { headers: { "x-request-id": "agent-call-12345" } });
    expect(r.headers.get("x-request-id")).toBe("agent-call-12345");
    expect(r.body.data).toMatchObject({ name: "Bayt Al Ghaf", fictional: true, currency: "AED", timezone: "Asia/Dubai" });
  });

  it("returns hours for a date range, including Ramadan overrides", async () => {
    const r = await call("GET", "/restaurant/hours?date=2027-02-14&days=2", { now: MONDAY_10 });
    expect(r.status).toBe(200);
    expect(r.body.data.days[0]).toMatchObject({ date: "2027-02-14", opensAt: "12:00", closesAt: "24:00", hoursSource: "special_period" });
    expect(r.body.data.now).toMatchObject({ localDate: "2026-10-26", isOpen: true });
  });

  it("returns location, transportation and policies", async () => {
    expect((await call("GET", "/restaurant/location")).body.data.address.area).toBe("Al Seef, Bur Dubai");
    expect((await call("GET", "/restaurant/transportation")).body.data.parking.length).toBeGreaterThan(0);
    const pol = (await call("GET", "/restaurant/policies")).body.data;
    expect(pol.reservations.partySize.max).toBe(20);
    expect(pol.ordering.onlineCardPayment).toBe(false);
    expect(pol.allergens.kitchenStatement).toMatch(/cannot guarantee/);
  });

  it("checks delivery areas", async () => {
    expect((await call("GET", "/delivery/check?area=Karama")).body.data).toMatchObject({ served: true, regularDelivery: true, area: "Al Karama" });
    expect((await call("GET", "/delivery/check?area=Dubai%20Marina")).body.data).toMatchObject({ served: true, regularDelivery: false, cateringDelivery: true });
    expect((await call("GET", "/delivery/check?area=Abu%20Dhabi")).body.data.served).toBe(false);
  });
});

describe("menu", () => {
  it("lists every visible dish with prices matching the canonical data", async () => {
    const r = await call("GET", "/menu", { now: MONDAY_10 });
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(menuItems.length);
    for (const item of menuItems) {
      const api = r.body.data.find((x: { id: string }) => x.id === item.id);
      expect(api.price.amountFils, item.id).toBe(item.priceFils);
    }
    expect(r.body.meta.categories).toHaveLength(11);
  });

  it("filters by category, diet, excluded allergens, price and search variants", async () => {
    const rice = await call("GET", "/menu?category=rice-and-machboos");
    expect(rice.body.data.every((i: { category: { slug: string } }) => i.category.slug === "rice-and-machboos")).toBe(true);
    const vegan = await call("GET", "/menu?dietary=vegan");
    expect(vegan.body.data.length).toBeGreaterThan(5);
    expect(vegan.body.data.every((i: { dietaryTags: string[] }) => i.dietaryTags.includes("vegan"))).toBe(true);
    const noNuts = await call("GET", "/menu?excludeAllergens=tree_nuts,sesame");
    expect(noNuts.body.data.some((i: { id: string }) => i.id === "mi_hummus_lamb")).toBe(false);
    expect(noNuts.body.data.some((i: { id: string }) => i.id === "mi_lamb_machboos")).toBe(true);
    const cheap = await call("GET", "/menu?maxPriceAed=15");
    expect(cheap.body.data.every((i: { price: { amount: number } }) => i.price.amount <= 15)).toBe(true);
    const majboos = await call("GET", "/menu?search=majboos");
    expect(majboos.body.data[0].name).toMatch(/Machboos/);
  });

  it("rejects unknown filter values with a validation error", async () => {
    const r = await call("GET", "/menu?excludeAllergens=kryptonite");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns full dish detail by id or slug and 404 for unknown ids", async () => {
    const r = await call("GET", "/menu/items/lamb-machboos", { now: MONDAY_10 });
    expect(r.body.data.id).toBe("mi_lamb_machboos");
    expect(r.body.data.ingredients.find((i: { id: string }) => i.id === "ing_lamb_shoulder").quantity).toMatch(/280 g/);
    expect(r.body.data.allergenDetails.map((a: { allergen: string }) => a.allergen)).toEqual(["milk", "sulphites"]);
    const missing = await call("GET", "/menu/items/mi_pizza");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatchObject({ code: "NOT_FOUND", category: "not_found", retryable: false });
  });

  it("answers date-aware availability for special-day dishes", async () => {
    const tue = await call("GET", "/menu/items/mi_friday_platter/availability?date=2026-10-27&mode=pickup", { now: MONDAY_10 });
    expect(tue.status).toBe(200);
    expect(tue.body.data.availability.orderable).toBe(false);
    expect(tue.body.data.availability.reasons[0].code).toBe("NOT_AVAILABLE_ON_DAY");
    expect(tue.body.data.availability.nextAvailable.date).toBe("2026-10-30");
    expect(tue.body.data.alternatives.length).toBeGreaterThan(0);
    const fri = await call("GET", "/menu/items/mi_friday_platter/availability?date=2026-10-30&time=13:00&mode=pickup", { now: MONDAY_10 });
    expect(fri.body.data.availability.orderable).toBe(true);
    const iftar = await call("GET", "/menu/items/mi_iftar_set/availability?date=2026-10-31&mode=pickup&quantity=2", { now: MONDAY_10 });
    expect(iftar.body.data.availability.reasons.map((r: { code: string }) => r.code)).toContain("OUTSIDE_SPECIAL_PERIOD");
  });

  it("lists specials served on a date", async () => {
    const r = await call("GET", "/menu/specials?date=2026-10-26", { now: MONDAY_10 });
    expect(r.body.data.today.map((i: { id: string }) => i.id)).toContain("mi_fish_saloona");
    expect(r.body.data.today.map((i: { id: string }) => i.id)).not.toContain("mi_friday_platter");
  });

  it("finds a dish from a description", async () => {
    const r = await call("GET", "/menu/search?q=rice%20meat%20dried%20lemon");
    expect(r.body.data[0].item.id).toBe("mi_lamb_machboos");
  });

  it("returns ingredients and sauces with full composition", async () => {
    const loomi = await call("GET", "/ingredients/ing_loomi");
    expect(loomi.body.data.aliases).toContain("dried lemon");
    expect(loomi.body.data.usedIn.length).toBeGreaterThan(5);
    const no7 = await call("GET", "/sauces/sauce-no-7");
    expect(no7.body.data.allergens).toEqual(["gluten", "soy", "sesame"]);
    expect(no7.body.data.ingredients.map((i: { id: string }) => i.id)).toContain("ing_sesame_oil");
    expect(no7.body.data.includes[0].id).toBe("sau_bezar");
    expect((await call("GET", "/sauces/house-sauce")).status).toBe(404);
    expect((await call("GET", "/sauces")).body.data).toHaveLength(19);
  });

  it("suggests the cheapest way to feed a group", async () => {
    const r = await call("GET", "/menu/feeding-suggestions?guests=15&date=2026-10-27", { now: MONDAY_10 });
    expect(r.body.data.options.length).toBeGreaterThan(0);
    for (const o of r.body.data.options) expect(o.servings).toBeGreaterThanOrEqual(15);
    const totals = r.body.data.options.map((o: { total: { amountFils: number } }) => o.total.amountFils);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
  });

  it("reflects admin price and availability changes immediately (single source of truth)", async () => {
    const admin = await apiKey(["admin"]);
    const patched = await call("PATCH", "/admin/menu/items/mi_karak", { body: { priceFils: 1300 }, headers: bearer(admin), now: MONDAY_10 });
    expect(patched.status).toBe(200);
    expect((await call("GET", "/menu/items/mi_karak")).body.data.price.formatted).toBe("AED 13");
    const doc = await call("GET", "/knowledge/documents/menu-catalog?format=markdown");
    expect(doc.body).toContain("### Karak Chai (شاي كرك) — AED 13");
    await call("PATCH", "/admin/menu/items/mi_karak", { body: { priceFils: 1200, availabilityStatus: "sold_out" }, headers: bearer(admin), now: MONDAY_10 });
    const sold = await call("GET", "/menu/items/mi_karak/availability?mode=pickup", { now: MONDAY_10 });
    expect(sold.body.data.availability.status).toBe("sold_out");
    await call("PATCH", "/admin/menu/items/mi_karak", { body: { availabilityStatus: "available" }, headers: bearer(admin) });
  });
});
