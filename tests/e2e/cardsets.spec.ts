import { test, expect } from "@playwright/test";

test.describe("Card set management", () => {
  test("creates a set, adds cards, flips one, selects it, and renames it", async ({ page }) => {
    // Unique names keep reruns independent: nothing from a previous run collides.
    const unique = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const setName = `E2E Set ${unique}`;
    const renamedSet = `E2E Renamed ${unique}`;

    await page.goto("/cards");
    await expect(page.getByRole("heading", { level: 1, name: "Cards" })).toBeVisible();

    // Create a card set and land on its own page.
    // `.filter({ visible: true })` skips the hidden copy Next streams before the
    // page is revealed; otherwise fill waits on that copy forever.
    await page.getByRole("link", { name: "Create New Cardset" }).click();
    await page.getByLabel("Card Set Name").filter({ visible: true }).fill(setName);
    await page.getByRole("button", { name: "Create Card Set" }).click();

    await expect(page).toHaveURL(/\/cards\/[0-9a-f-]{36}$/);
    const setId = new URL(page.url()).pathname.split("/").pop();
    await expect(page.getByRole("heading", { level: 1, name: setName })).toBeVisible();

    // Add two cards; each submission revalidates the set page.
    await page.getByLabel("Question").filter({ visible: true }).fill("What is 2 + 2?");
    await page.getByLabel("Answer").filter({ visible: true }).fill("4");
    await page.getByRole("button", { name: "Add Card" }).click();
    await expect(page.getByRole("button", { name: "What is 2 + 2?" })).toBeVisible();

    await page
      .getByLabel("Question")
      .filter({ visible: true })
      .fill("What is the capital of France?");
    await page.getByLabel("Answer").filter({ visible: true }).fill("Paris");
    await page.getByRole("button", { name: "Add Card" }).click();
    await expect(
      page.getByRole("button", { name: "What is the capital of France?" }),
    ).toBeVisible();

    // Clicking a card reveals its answer.
    const firstCard = page.getByRole("button", { name: "What is 2 + 2?" });
    await firstCard.click();
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("4", { exact: true })).toHaveAttribute("aria-hidden", "false");

    // Select the set again from the list.
    await page.getByRole("link", { name: "Cards" }).click();
    await expect(page).toHaveURL("/cards");
    await page.getByRole("link", { name: setName }).click();
    await expect(page).toHaveURL(`/cards/${setId}`);
    await expect(page.getByRole("heading", { level: 1, name: setName })).toBeVisible();

    // Rename the set and see the update on the set page and the list.
    await page.getByRole("link", { name: "Edit Card Set" }).click();
    await expect(page).toHaveURL(`/cards/${setId}/edit`);
    await page.getByLabel("Card Set Name").filter({ visible: true }).fill(renamedSet);
    await page.getByRole("button", { name: "Update Card Set" }).click();

    await expect(page).toHaveURL(`/cards/${setId}`);
    await expect(page.getByRole("heading", { level: 1, name: renamedSet })).toBeVisible();

    await page.getByRole("link", { name: "Cards" }).click();
    await expect(page.getByRole("link", { name: renamedSet })).toBeVisible();
  });

  test("shows the not-found page for a malformed card set id", async ({ page }) => {
    await page.goto("/cards/de54a30e-0cec-4b57-b42d-eeb8bb69f7c6sdf");

    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
