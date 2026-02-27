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
  await page.getByLabel(/turnover|oms.tning/i).fill("50000");
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

  await page.route("**/registrations/latest?*", async (route) => {
    const url = new URL(route.request().url());
    const taxpayerId = url.searchParams.get("taxpayer_id");
    if (taxpayerId === "TXP-FALLBACK-001") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trace_id: "trace-find-fallback",
          taxpayer_id: "TXP-FALLBACK-001",
          registration_id: fallbackRegistrationId,
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
  });

  await page.route("**/registrations/*", async (route) => {
    const id = route.request().url().split("/registrations/")[1].split("?")[0];
    if (id === "latest") {
      await route.fallback();
      return;
    }
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
  await page.locator("form").first().getByRole("button").click();
  await expect(page.getByLabel(/Taxpayer|Skatteyder/i)).toHaveValue("TXP-DIRECT-001");

  // Fallback lookup by taxpayer id when registration id 404s.
  await lookupInput.fill("TXP-FALLBACK-001");
  await page.locator("form").first().getByRole("button").click();
  await expect(page.getByLabel(/Taxpayer|Skatteyder/i)).toHaveValue("TXP-FALLBACK-001");
});


test("@mocked admin find-taxpayer supports edit registration cadence preview and filing/amendment alter undo redo", async ({ page }) => {
  await mockPortalApis(page, { role: "admin", taxpayerScope: null });

  const registrationId = "11111111-1111-4111-8111-111111111111";
  const filingId = "f6666666-6666-4666-8666-666666666666";
  const amendmentId = "a6666666-6666-4666-8666-666666666666";
  const calls = {
    updateRegistration: 0,
    filingAlter: 0,
    filingUndo: 0,
    filingRedo: 0,
    amendmentAlter: 0,
    amendmentUndo: 0,
    amendmentRedo: 0,
  };
  let updatePayload: Record<string, unknown> | null = null;

  await page.route("**/registrations/latest?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("taxpayer_id") === "TXP-ADMIN-001") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ registration_id: registrationId }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
  });

  await page.route("**/registrations/*", async (route) => {
    const method = route.request().method().toUpperCase();
    const id = route.request().url().split("/registrations/")[1].split("?")[0];
    if (id === "latest" || id === "cadence-policy") {
      await route.fallback();
      return;
    }
    if (id !== registrationId) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
      return;
    }
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registration_id: registrationId,
          taxpayer_id: "TXP-ADMIN-001",
          cvr_number: "12345678",
          annual_turnover_dkk: 50000,
          cadence: "monthly",
          business_profile: {
            effective_date: "2026-01-01",
            status: "active",
          },
          contact: {},
          address: { country_code: "DK" },
        }),
      });
      return;
    }
    if (method === "PUT" || method === "PATCH") {
      calls.updateRegistration += 1;
      updatePayload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trace_id: "trace-reg-update",
          registration_id: registrationId,
        }),
      });
      return;
    }
    await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "method not allowed" }) });
  });

  await page.route("**/vat-filings?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        filings: [
          {
            filing_id: filingId,
            taxpayer_id: "TXP-ADMIN-001",
            tax_period_start: "2026-01-01",
            tax_period_end: "2026-03-31",
            state: "submitted",
            output_vat_amount_domestic: 1000,
            reverse_charge_output_vat_goods_abroad_amount: 100,
            reverse_charge_output_vat_services_abroad_amount: 50,
            input_vat_deductible_amount_total: 400,
            adjustments_amount: 0,
            reimbursement_oil_and_bottled_gas_duty_amount: 0,
            reimbursement_electricity_duty_amount: 0,
            rubrik_a_goods_eu_purchase_value: 0,
            rubrik_a_services_eu_purchase_value: 0,
            rubrik_b_goods_eu_sale_value_reportable: 0,
            rubrik_b_goods_eu_sale_value_non_reportable: 0,
            rubrik_b_services_eu_sale_value: 0,
            rubrik_c_other_vat_exempt_supplies_value: 0,
            claim_amount: 0,
          },
        ],
      }),
    });
  });

  await page.route("**/vat-filings/*", async (route) => {
    const method = route.request().method().toUpperCase();
    const url = route.request().url();
    if (method === "POST" && url.includes(`/vat-filings/${filingId}/alter`)) {
      calls.filingAlter += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace_id: "trace-file-alter" }) });
      return;
    }
    if (method === "POST" && url.includes(`/vat-filings/${filingId}/undo`)) {
      calls.filingUndo += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace_id: "trace-file-undo" }) });
      return;
    }
    if (method === "POST" && url.includes(`/vat-filings/${filingId}/redo`)) {
      calls.filingRedo += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace_id: "trace-file-redo" }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
  });

  await page.route("**/amendments?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        amendments: [
          {
            amendment_id: amendmentId,
            original_filing_id: filingId,
            taxpayer_id: "TXP-ADMIN-001",
            tax_period_end: "2026-03-31",
            delta_classification: "increase",
            delta_net_vat: 100,
          },
        ],
      }),
    });
  });

  await page.route("**/amendments/*", async (route) => {
    const method = route.request().method().toUpperCase();
    const url = route.request().url();
    if (method === "POST" && url.includes(`/amendments/${amendmentId}/alter`)) {
      calls.amendmentAlter += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace_id: "trace-amend-alter" }) });
      return;
    }
    if (method === "POST" && url.includes(`/amendments/${amendmentId}/undo`)) {
      calls.amendmentUndo += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace_id: "trace-amend-undo" }) });
      return;
    }
    if (method === "POST" && url.includes(`/amendments/${amendmentId}/redo`)) {
      calls.amendmentRedo += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace_id: "trace-amend-redo" }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
  });

  await loginAsAdmin(page);
  await page.goto("/admin/taxpayers");

  const lookupInput = page.getByPlaceholder(/Registration ID|Registrerings-id/i);
  await lookupInput.fill("TXP-ADMIN-001");
  await page.locator("form").first().getByRole("button").click();
  await expect(page.getByLabel(/Taxpayer|Skatteyder/i)).toHaveValue("TXP-ADMIN-001");

  await page.getByLabel(/turnover|oms.tning/i).fill("999999");
  await page.getByLabel(/Ny kadence|New cadence/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /Anvend kadence|Apply cadence/i }).click();
  expect(calls.updateRegistration).toBe(1);

  await page.getByLabel(/turnover|oms.tning/i).fill("999999");
  await page.locator("article").first().locator("button[type='submit']").click();
  expect(calls.updateRegistration).toBe(2);
  expect(updatePayload).toMatchObject({
    taxpayer_id: "TXP-ADMIN-001",
    cvr_number: "12345678",
    annual_turnover_dkk: 999999,
  });

  await page.locator("article").nth(1).locator("select").first().selectOption(filingId);
  const filingActions = page.locator("article").nth(1).locator("button");
  await filingActions.nth(0).click();
  await filingActions.nth(1).click();
  await filingActions.nth(2).click();
  expect(calls.filingAlter).toBe(1);
  expect(calls.filingUndo).toBe(1);
  expect(calls.filingRedo).toBe(1);

  await page.locator("article").nth(2).locator("select").first().selectOption(amendmentId);
  const amendmentActions = page.locator("article").nth(2).locator("button");
  await amendmentActions.nth(0).click();
  await amendmentActions.nth(1).click();
  await amendmentActions.nth(2).click();
  expect(calls.amendmentAlter).toBe(1);
  expect(calls.amendmentUndo).toBe(1);
  expect(calls.amendmentRedo).toBe(1);
});


