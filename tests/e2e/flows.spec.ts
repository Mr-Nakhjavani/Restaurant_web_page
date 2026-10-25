import { expect, test } from "@playwright/test";

test.describe("ordering", () => {
  test("empty cart shows a helpful empty state", async ({ page }) => {
    await page.goto("/order/checkout");
    await expect(page.getByText("Your order is empty")).toBeVisible();
  });

  test("customer orders for pickup and sees the confirmed order", async ({ page }, info) => {
    await page.goto("/order");
    await page.getByRole("button", { name: "Add Lamb Machboos" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Hashu topping").first()).toBeVisible();
    await dialog.getByRole("radio", { name: /^Hashu without raisins/ }).check();
    await dialog.getByRole("button", { name: /^Add · AED 72/ }).click();
    await page.getByRole("button", { name: "Add Karak Chai" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Add · / }).click();
    await page.goto("/order/checkout");
    await expect(page.getByText("Order summary")).toBeVisible();
    await expect(page.getByText("AED 84").first()).toBeVisible(); // server-calculated total
    await page.getByLabel("Full name").fill("E2E Guest");
    // a distinct phone per project: an identical order from the same phone minutes apart is (correctly) refused as a duplicate
    await page.getByLabel("Mobile number").fill(info.project.name === "mobile" ? "050 555 0177" : "050 555 0199");
    await page.getByRole("button", { name: /^Place order/ }).click();
    await expect(page).toHaveURL(/\/order\/confirmation\/ORD-\d{6}/);
    await expect(page.getByRole("heading", { name: "Confirmed" })).toBeVisible();
    await expect(page.getByText(/Hashu without raisins/).first()).toBeVisible();
  });

  test("checkout explains why delivery to an unserved area is not possible", async ({ page }) => {
    await page.goto("/order");
    await page.getByRole("button", { name: "Add Chicken Machboos" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Add · / }).click();
    await page.goto("/order/checkout");
    await page.getByText("Delivery", { exact: true }).click();
    await page.getByLabel("Area (Dubai)").fill("Abu Dhabi");
    await page.getByLabel("Building or villa").fill("Tower 1");
    await page.getByLabel("Street").fill("Corniche Road");
    await expect(page.getByText(/We do not deliver to “Abu Dhabi”/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Place order/ })).toBeDisabled();
  });
});

test.describe("reservations", () => {
  test("guest finds a table, books it and can cancel it", async ({ page }, info) => {
    await page.goto("/reservations");
    await page.getByLabel("Guests", { exact: true }).selectOption("4");
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page.getByText(/tables are booked for 120 minutes/)).toBeVisible();
    await page.getByRole("radiogroup", { name: "Evening times" }).getByRole("radio", { disabled: false }).first().click();
    await page.getByLabel("Name for the booking").fill("E2E Family");
    await page.getByLabel("Mobile number", { exact: false }).fill(info.project.name === "mobile" ? "050 555 0166" : "050 555 0188");
    await page.getByRole("button", { name: /^Confirm table for 4/ }).click();
    await expect(page).toHaveURL(/\/reservations\/confirmation\/RES-\d{6}/);
    await expect(page.getByRole("heading", { name: "Confirmed" })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel reservation" }).click();
    await expect(page.getByRole("heading", { name: "Cancelled" })).toBeVisible();
  });
});

test.describe("back office @desktop-only", () => {
  test("staff marks a dish sold out and the public API reflects it", async ({ page, request }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel("E-mail").fill("admin@baytalghaf.example");
    await page.getByLabel("Password").fill("E2E-Admin-Password-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await page.getByRole("link", { name: "Menu & availability" }).click();
    await page.getByLabel("Availability of Khanfaroosh").selectOption("sold_out");
    await expect(page.getByText("Khanfaroosh: sold out until end of today")).toBeVisible();
    const api = await (await request.get("/api/v1/menu/items/khanfaroosh/availability?mode=pickup")).json();
    expect(api.data.availability.status).toBe("sold_out");
    await page.getByLabel("Availability of Khanfaroosh").selectOption("available");
    await expect(page.getByText("Khanfaroosh: available")).toBeVisible();
  });
});
