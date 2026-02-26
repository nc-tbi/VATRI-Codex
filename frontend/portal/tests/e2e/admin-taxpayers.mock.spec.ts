import { expect, test, type Page } from "@playwright/test";
import { mockPortalApis } from "./utils/session-mocks";

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("admin");
  await page.getByLabel(/Adgangskode|Password/i).fill("adminadmin");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);
}

test("@mocked registration required fields block submit and optional fields are omitted when blank", async ({ page }) => {
  await mockPortalApis(page, { role: "admin", taxpayerScope: null });

  let createCalls = 0;
  let postedBody: Record<string, unknown> | null = null;

  await page.route("**/registrations", async (route) => {
    if (route.request().method().toUpperCase() !== "POST") {
      await route.continue();
      return;
    }
    createCalls += 1;
    postedBody = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        trace_id: "trace-reg-create",
        registration_id: "REG-001",
        obligations_created: 2,
      }),
    });
  });

  await loginAsAdmin(page);
  await page.goto("/admin/taxpayers/new");

  // Required field behavior: missing taxpayer_id keeps form invalid and prevents POST.
  await page.getByLabel(/^CVR$/i).fill("12345678");
  await page.getByLabel(/turnover|omsætning/i).fill("50000");
  await page.getByRole("button", { name: /Create registration|Opret registrering/i }).click();
  expect(createCalls).toBe(0);

  // Happy path with required fields only; contact/address remain optional and omitted.
  await page.getByLabel(/Taxpayer ID|Skatteyder-id/i).fill("TXP-MOCK-001");
  await page.getByRole("button", { name: /Create registration|Opret registrering/i }).click();

  await expect(page.getByText(/REG-001/i)).toBeVisible();
  await expect(page.getByText(/obligations|forpligtelser/i)).toBeVisible();
  expect(createCalls).toBe(1);
  expect(postedBody).toMatchObject({
    taxpayer_id: "TXP-MOCK-001",
    cvr_number: "12345678",
    annual_turnover_dkk: 50000,
  });
  expect(postedBody).toHaveProperty("business_profile");
  expect(postedBody).not.toHaveProperty("contact");
  expect(postedBody).toHaveProperty("address");
  if (!postedBody) {
    throw new Error("postedBody was not captured");
  }
  const posted = postedBody as unknown as Record<string, unknown>;
  const address = posted.address as Record<string, unknown>;
  expect(address).toMatchObject({ country_code: "DK" });
  expect(address).not.toHaveProperty("line1");
  expect(address).not.toHaveProperty("postal_code");
});

test("@mocked find-taxpayer supports registration-id direct lookup and taxpayer-id fallback", async ({ page }) => {
  await mockPortalApis(page, { role: "admin", taxpayerScope: null });
  const directRegistrationId = "11111111-1111-4111-8111-111111111111";
  const fallbackRegistrationId = "22222222-2222-4222-8222-222222222222";

  await page.route("**/registrations?*", async (route) => {
    const url = new URL(route.request().url());
    const taxpayerId = url.searchParams.get("taxpayer_id");
    if (taxpayerId === "TXP-FALLBACK-001") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trace_id: "trace-find-fallback",
          taxpayer_id: "TXP-FALLBACK-001",
          registrations: [{ registration_id: fallbackRegistrationId }],
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
  });

  await page.route("**/registrations/*", async (route) => {
    const id = route.request().url().split("/registrations/")[1];
    if (id === directRegistrationId || id === fallbackRegistrationId) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registration_id: id,
          taxpayer_id: id === directRegistrationId ? "TXP-DIRECT-001" : "TXP-FALLBACK-001",
          cvr_number: "12345678",
          annual_turnover_dkk: 100000,
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
  });

  await loginAsAdmin(page);
  await page.goto("/admin/taxpayers");

  const lookupInput = page.getByPlaceholder(/Registration ID|Registrerings-id/i);

  // Direct lookup by registration id.
  await lookupInput.fill(directRegistrationId);
  await page.getByRole("button", { name: /Search|Søg/i }).click();
  await expect(page.locator("dd").filter({ hasText: "TXP-DIRECT-001" }).first()).toBeVisible();

  // Fallback lookup by taxpayer id when registration id 404s.
  await lookupInput.fill("TXP-FALLBACK-001");
  await page.getByRole("button", { name: /Search|Søg/i }).click();
  await expect(page.locator("dd").filter({ hasText: "TXP-FALLBACK-001" }).first()).toBeVisible();
});

