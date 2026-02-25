import { expect, test } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log ind" })).toBeVisible();
  await expect(page.getByLabel("Brugernavn")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

