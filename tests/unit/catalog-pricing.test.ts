import { describe, expect, it } from "vitest";
import { allergenAvoidance, composeItem, composeSauce } from "@/domain/catalog";
import { priceLines, resolveSelection } from "@/domain/pricing";
import { validateCanonicalData } from "@/data/validate";
import { menuItems } from "@/data";
import { catalog, item } from "./fixtures";

describe("canonical data", () => {
  it("passes every referential and consistency check", () => {
    expect(validateCanonicalData()).toEqual([]);
  });

  it("has a substantial menu with every kind of item", () => {
    expect(menuItems.length).toBeGreaterThanOrEqual(30);
    expect(menuItems.length).toBeLessThanOrEqual(50);
    expect(new Set(menuItems.map((i) => i.kind))).toEqual(new Set(["permanent", "daily_special", "limited_time", "catering"]));
    for (const i of menuItems) {
      expect(i.arabicName, i.id).toMatch(/[؀-ۿ]/);
      expect(i.customerQA.length, i.id).toBeGreaterThan(0);
      expect(i.description.length, i.id).toBeGreaterThan(60);
    }
  });
});

describe("allergens and diets are derived from ingredients", () => {
  it("lamb machboos contains milk (ghee) and sulphites (raisins in the hashu)", () => {
    const c = composeItem(catalog, item("mi_lamb_machboos"));
    expect(c.allergens).toEqual(["milk", "sulphites"]);
    expect(c.diet).toBe("meat");
    expect(c.dietaryTags).toContain("gluten_free_ingredients");
  });

  it("removing raisins from the hashu removes the sulphites", () => {
    const c = composeItem(catalog, item("mi_lamb_machboos"), ["hashu_no_raisins", "portion_regular"]);
    expect(c.allergens).toEqual(["milk"]);
    const avoid = allergenAvoidance(catalog, item("mi_lamb_machboos"));
    expect(avoid.find((a) => a.allergen === "sulphites")?.avoidableWith).toBeTruthy();
    expect(avoid.find((a) => a.allergen === "milk")?.avoidableWith).toBeNull();
  });

  it("detects hidden fish and mustard in mehyawa regag", () => {
    expect(composeItem(catalog, item("mi_mehyawa_regag")).allergens).toEqual(expect.arrayContaining(["fish", "mustard", "gluten", "eggs", "milk"]));
  });

  it("Sauce No. 7 contains soy, gluten (soy sauce) and sesame", () => {
    expect(composeSauce(catalog, "sau_no7").allergens).toEqual(["gluten", "soy", "sesame"]);
  });

  it("the two 'house sauces' differ: Red has walnuts and wheat, Green has none but may contain traces", () => {
    expect(composeSauce(catalog, "sau_ghaf_red").allergens).toEqual(["gluten", "tree_nuts"]);
    const green = composeSauce(catalog, "sau_ghaf_green");
    expect(green.allergens).toEqual([]);
    expect(green.mayContain).toEqual(expect.arrayContaining(["tree_nuts", "gluten"]));
    expect(green.diet).toBe("vegan");
  });

  it("vegetable machboos is vegan unless hashu is added", () => {
    expect(composeItem(catalog, item("mi_vegetable_machboos")).diet).toBe("vegan");
    expect(composeItem(catalog, item("mi_vegetable_machboos"), ["add_hashu"]).diet).toBe("vegetarian");
  });

  it("every dish described as vegan really is vegan", () => {
    for (const i of catalog.items) {
      if (/\bvegan\b/i.test(i.shortDescription) && !/not vegan/i.test(i.shortDescription)) expect(composeItem(catalog, i).diet, i.id).toBe("vegan");
    }
  });

  it("propagates shared-equipment traces (camel kofta grill, luqaimat fryer)", () => {
    expect(composeItem(catalog, item("mi_camel_kofta")).mayContain).toEqual(expect.arrayContaining(["crustaceans", "fish"]));
    expect(composeItem(catalog, item("mi_luqaimat"), ["pieces_10", "syrup_dibs", "sesame_no"]).mayContain).toContain("sesame");
  });
});

describe("server-side pricing", () => {
  it("adds option price deltas and multiplies by quantity", () => {
    const { priced, issues } = priceLines(catalog, [{ itemId: "mi_lamb_machboos", quantity: 2, options: ["portion_large", "extra_dakkus"] }], { maxQuantityPerLine: 10 });
    expect(issues).toEqual([]);
    expect(priced[0].unitPriceFils).toBe(7200 + 1800 + 400);
    expect(priced[0].lineTotalFils).toBe(2 * 9400);
    expect(priced[0].selectedOptionIds).toEqual(expect.arrayContaining(["hashu_classic", "portion_large", "extra_dakkus"]));
  });

  it("supports negative deltas without going below zero", () => {
    const { priced } = priceLines(catalog, [{ itemId: "mi_hummus_lamb", quantity: 1, options: ["no_lamb"] }], { maxQuantityPerLine: 10 });
    expect(priced[0].unitPriceFils).toBe(3000);
  });

  it("rejects unknown items, unknown options, double choices and bad quantities", () => {
    const { issues } = priceLines(
      catalog,
      [
        { itemId: "mi_does_not_exist", quantity: 1 },
        { itemId: "mi_karak", quantity: 1, options: ["extra_gold_leaf"] },
        { itemId: "mi_karak", quantity: 1, options: ["sugar_less", "sugar_none"] },
        { itemId: "mi_karak", quantity: 11 },
        { itemId: "mi_karak", quantity: 0 },
      ],
      { maxQuantityPerLine: 10 },
    );
    expect(issues.map((i) => i.code)).toEqual(["UNKNOWN_MENU_ITEM", "INVALID_CUSTOMIZATION", "INVALID_CUSTOMIZATION", "INVALID_QUANTITY", "INVALID_QUANTITY"]);
  });

  it("fills required single-choice groups with their defaults", () => {
    const { selection } = resolveSelection(item("mi_karak"), []);
    expect(selection).toEqual(["sugar_regular", "milk_evaporated"]);
  });

  it("accepts slugs as item ids", () => {
    expect(priceLines(catalog, [{ itemId: "luqaimat", quantity: 1 }], { maxQuantityPerLine: 10 }).priced[0].itemId).toBe("mi_luqaimat");
  });
});
