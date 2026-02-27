import { expect, test, type Page } from "@playwright/test";
import { mockPortalApis } from "./utils/session-mocks";

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("admin");
  await page.getByLabel(/Adgangskode|Password/i).fill("secret");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);
}

test("@mocked admin taxpayer search uses taxpayer fallback for non-uuid input", async ({ page }) => {
  await mockPortalApis(page, { role: "admin", subjectId: "admin-001", taxpayerScope: null });

  let nonUuidRouteCalled = false;
  let taxpayerQueryCalled = false;
  await page.route("**/registrations/latest?taxpayer_id=001", async (route) => {
    taxpayerQueryCalled = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        trace_id: "trace-reg-001",
        taxpayer_id: "001",
        registration_id: "11111111-1111-4111-8111-111111111111",
      }),
    });
  });
  await page.route("**/registrations/001", async (route) => {
    nonUuidRouteCalled = true;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "INTERNAL_ERROR", message: "should not be called", trace_id: "trace-fail" }),
    });
  });
  await page.route("**/registrations/11111111-1111-4111-8111-111111111111", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        registration_id: "11111111-1111-4111-8111-111111111111",
        taxpayer_id: "001",
        cvr_number: "12345678",
        annual_turnover_dkk: 50000,
      }),
    });
  });

  await loginAsAdmin(page);
  await page.goto("/admin/taxpayers");
  await page.getByPlaceholder(/Registrerings-id|Registration ID/i).fill("001");
  await page.locator("form").first().getByRole("button").click();
  await expect(page.getByLabel(/Taxpayer|Skatteyder/i)).toHaveValue("001");
  expect(taxpayerQueryCalled).toBe(true);
  expect(nonUuidRouteCalled).toBe(false);
});


