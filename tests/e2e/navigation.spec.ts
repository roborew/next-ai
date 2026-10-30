import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate to the about page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  });

  test("should send signed-out visitors from the chat to the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Chat" }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("should navigate to the cards page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Cards" }).click();
    await expect(page).toHaveURL("/cards");
    await expect(page.getByRole("heading", { level: 1, name: "Cards" })).toBeVisible();
  });
});
