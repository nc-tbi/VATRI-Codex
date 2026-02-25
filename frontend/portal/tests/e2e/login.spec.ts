import { expect, test } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Log ind|Sign in/i })).toBeVisible();
  await expect(page.getByLabel(/Brugernavn|Username/i)).toBeVisible();
  await expect(page.getByLabel(/Adgangskode|Password/i)).toBeVisible();
});

