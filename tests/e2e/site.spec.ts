import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("home page presents the restaurant and its calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("An Emirati table");
    await expect(page.getByRole("link", { name: "Reserve a table" }).first()).toBeVisible();
    await expect(page.getByText("From today's kitchen")).toBeVisible();
    await expect(page.getByText(/fictional restaurant/i).first()).toBeVisible();
  });

  test("navigation reaches every main page", async ({ page, isMobile }) => {
    await page.goto("/");
    for (const [label, heading] of [
      ["Menu", "The menu"],
      ["Reservations", "Reserve a table"],
      ["Catering", "Catering & large orders"],
      ["Our story", "A house named for a tree"],
      ["Visit", "Find us on Al Seef"],
      ["FAQ", "Frequently asked"],
    ]) {
      if (isMobile) {
        await page.getByRole("button", { name: "Open menu" }).click();
        await page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: label, exact: true }).click();
      } else {
        await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }).click();
      }
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
  });

  test("pages never scroll horizontally", async ({ page }) => {
    for (const path of ["/", "/menu", "/order", "/reservations", "/catering", "/contact", "/faq", "/about", "/menu/lamb-machboos", "/order/checkout"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("the menu filters by search spelling variants and diet", async ({ page }) => {
    await page.goto("/menu");
    await page.getByPlaceholder(/Search dishes/).fill("majboos");
    await expect(page.getByRole("heading", { name: "Lamb Machboos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Luqaimat" })).toHaveCount(0);
    await page.getByPlaceholder(/Search dishes/).fill("");
    await page.getByRole("button", { name: /Dietary/ }).click();
    await page.getByRole("button", { name: "Vegan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Vegetable Machboos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lamb Machboos" })).toHaveCount(0);
  });

  test("prices shown on the menu match the API", async ({ page, request }) => {
    const api = await (await request.get("/api/v1/menu")).json();
    await page.goto("/menu");
    for (const id of ["mi_lamb_machboos", "mi_luqaimat", "mi_friday_platter", "mi_karak"]) {
      const item = api.data.find((i: { id: string }) => i.id === id);
      const card = page.locator("article").filter({ has: page.getByRole("heading", { name: item.name, exact: true }) });
      await expect(card.getByLabel(`Price ${item.price.formatted}`)).toBeVisible();
    }
  });

  test("a dish page shows ingredients, allergens and the weekly availability", async ({ page }) => {
    await page.goto("/menu/friday-platter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Friday Family Machboos Platter");
    await expect(page.getByRole("heading", { name: "Allergens" })).toBeVisible();
    await expect(page.getByText("Fridays only").first()).toBeVisible();
    await expect(page.getByRole("table", { name: /Ingredients/ })).toContainText("Lamb shoulder");
  });

  test("FAQ search narrows the questions", async ({ page }) => {
    await page.goto("/faq");
    await page.getByPlaceholder("Search questions").first().fill("parking");
    await expect(page.getByText("Is parking available?")).toBeVisible();
    await page.getByText("Is parking available?").click();
    await expect(page.getByText(/Al Seef multi-storey car park/)).toBeVisible();
  });
});
