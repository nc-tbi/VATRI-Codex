import { expect, test } from "@playwright/test";
import { mockPortalApis } from "./utils/session-mocks";

test("@mocked login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Log ind|Sign in/i })).toBeVisible();
  await expect(page.getByLabel(/Brugernavn|Username/i)).toBeVisible();
  await expect(page.getByLabel(/Adgangskode|Password/i)).toBeVisible();
});

test("@mocked first-login password creation happy path persists session and redirects", async ({ page }) => {
  await mockPortalApis(page, { role: "taxpayer" });

  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        trace_id: "trace-login-first",
        session_id: "session-first",
        access_token: "token-first",
        refresh_token: "refresh-first",
        expires_in: 3600,
        password_change_required: true,
        user: { subject_id: "taxpayer-001", role: "taxpayer", taxpayer_scope: "TXP-12345678" },
      }),
    });
  });

  let passwordPayload: Record<string, unknown> | null = null;
  await page.route("**/auth/change-password", async (route) => {
    passwordPayload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("taxpayer");
  await page.getByLabel(/Adgangskode|Password/i).fill("secret");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();

  await expect(page.getByRole("heading", { name: /Create new password|Opret ny adgangskode/i })).toBeVisible();
  await page.getByLabel(/^New password$|^Ny adgangskode$/i).fill("BetterSecret123!");
  await page.getByLabel(/^Confirm new password$|^Bekræft ny adgangskode$/i).fill("BetterSecret123!");
  await page.getByRole("button", { name: /Save new password|Gem ny adgangskode/i }).click();

  await expect(page).toHaveURL(/\/overview/);
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        token: localStorage.getItem("vatri.portal.access_token"),
        refresh: localStorage.getItem("vatri.portal.refresh_token"),
      }))
    )
    .toEqual({ token: "token-first", refresh: "refresh-first" });

  expect(passwordPayload).toMatchObject({
    current_password: "secret",
    new_password: "BetterSecret123!",
  });
});

test("@mocked first-login password creation rejects short and mismatched passwords", async ({ page }) => {
  await mockPortalApis(page, { role: "taxpayer" });

  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        trace_id: "trace-login-first-neg",
        session_id: "session-first-neg",
        access_token: "token-first-neg",
        refresh_token: "refresh-first-neg",
        expires_in: 3600,
        password_change_required: true,
        user: { subject_id: "taxpayer-001", role: "taxpayer", taxpayer_scope: "TXP-12345678" },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("taxpayer");
  await page.getByLabel(/Adgangskode|Password/i).fill("secret");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();

  await page.getByLabel(/^New password$|^Ny adgangskode$/i).fill("short");
  await page.getByLabel(/^Confirm new password$|^Bekræft ny adgangskode$/i).fill("short");
  await page.getByRole("button", { name: /Save new password|Gem ny adgangskode/i }).click();
  await expect(page.getByText(/at least 12|mindst 12/i)).toBeVisible();

  await page.getByLabel(/^New password$|^Ny adgangskode$/i).fill("LongEnough123!");
  await page.getByLabel(/^Confirm new password$|^Bekræft ny adgangskode$/i).fill("Different123!");
  await page.getByRole("button", { name: /Save new password|Gem ny adgangskode/i }).click();
  await expect(page.getByText(/do not match|matcher ikke/i)).toBeVisible();
});

