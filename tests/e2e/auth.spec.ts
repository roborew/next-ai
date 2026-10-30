import { test, expect } from "@playwright/test";

const uniqueEmail = () =>
  `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe("Authentication", () => {
  test("sends signed-out visitors from the chat to the login page", async ({ page }) => {
    await page.goto("/chat");

    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("signs up, keeps the session across a reload, signs out and back in", async ({ page }) => {
    const email = uniqueEmail();
    const password = "correct-horse-battery";

    await page.goto("/login");
    await page.getByRole("button", { name: "Create an account" }).click();
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/chat");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL("/chat");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/chat");
  });
});
