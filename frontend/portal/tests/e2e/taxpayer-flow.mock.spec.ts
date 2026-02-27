import { expect, test, type Page } from "@playwright/test";
import { mockPortalApis } from "./utils/session-mocks";

async function loginAsTaxpayer(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("taxpayer");
  await page.getByLabel(/Adgangskode|Password/i).fill("secret");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);
}

test("@mocked sidebar hides obligations and new vat return links for taxpayer", async ({ page }) => {
  await mockPortalApis(page, {
    obligations: [
      {
        obligation_id: "OBL-2026Q1",
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        due_date: "2026-04-30",
        cadence: "quarterly",
        state: "due",
      },
    ],
    filings: [
      {
        filing_id: "f1111111-1111-4111-8111-111111111111",
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-03-31",
        state: "submitted",
      },
    ],
  });

  await loginAsTaxpayer(page);
  await expect(page.getByRole("link", { name: /Forpligtelser|Obligations/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Ny momsangivelse|New VAT return/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Ny ændringsangivelse|New amendment return/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Open VAT obligation|momsforpligtelse/i })).toBeVisible();
});

test("@mocked overview opens obligation and filing submission includes obligation context", async ({ page }) => {
  let submittedObligationId: string | null = null;
  await mockPortalApis(page, {
    obligations: [
      {
        obligation_id: "OBL-2026Q1",
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        due_date: "2026-04-30",
        cadence: "quarterly",
        state: "due",
      },
    ],
    onSubmitFiling: (payload) => {
      submittedObligationId = typeof payload.obligation_id === "string" ? payload.obligation_id : null;
    },
  });

  await loginAsTaxpayer(page);
  await page.getByRole("link", { name: /Open VAT obligation|momsforpligtelse/i }).click();
  await expect(page).toHaveURL(/\/filings\/new\?obligation_id=OBL-2026Q1/);

  await page.getByRole("button", { name: /Indsend momsangivelse|Submit VAT return/i }).click();
  const successAlert = page.locator("p").filter({ hasText: /trace/i }).first();
  await expect(successAlert).toBeVisible();
  await expect(successAlert).toContainText(/trace-100/);
  expect(submittedObligationId).toBe("OBL-2026Q1");
});

test("@mocked submitted filing page keeps original immutable and starts amendment from context", async ({ page }) => {
  await mockPortalApis(page, {
    filings: [
      {
        filing_id: "f1111111-1111-4111-8111-111111111111",
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-03-31",
        state: "submitted",
        output_vat_amount_domestic: 1000,
        reverse_charge_output_vat_goods_abroad_amount: 100,
        reverse_charge_output_vat_services_abroad_amount: 50,
        input_vat_deductible_amount_total: 400,
        adjustments_amount: 0,
      },
    ],
    amendments: [
      {
        amendment_id: "a1111111-1111-4111-8111-111111111111",
        original_filing_id: "f1111111-1111-4111-8111-111111111111",
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-03-31",
        delta_classification: "increase",
      },
    ],
  });

  await loginAsTaxpayer(page);
  await page.goto("/submissions/f1111111-1111-4111-8111-111111111111");
  await expect(page.getByRole("link", { name: /Opret ændring|Create amendment/i })).toBeVisible();
  await page.getByRole("link", { name: /Opret ændring|Create amendment/i }).click();
  await expect(page).toHaveURL(/\/amendments\/new\?original_filing_id=f1111111-1111-4111-8111-111111111111/);
  await expect(page.getByText(/Ændring oprettet for periode|Amendment started for period/i)).toBeVisible();
});

test("@mocked amendment page requires filing context from overview/submission flow", async ({ page }) => {
  await mockPortalApis(page, {});
  await loginAsTaxpayer(page);
  await page.goto("/amendments/new");
  await expect(page.getByRole("heading", { name: /Ny|New amendment return/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Indsend ændringsangivelse|Submit amendment return/i })).toHaveCount(0);
  await expect(page.locator("main").getByRole("link", { name: /overblik|overview/i }).last()).toBeVisible();
});

test("@mocked submit filing then create amendment shows original values and summary delta", async ({ page }) => {
  const filingId = "f1111111-1111-4111-8111-111111111111";

  await mockPortalApis(page, {
    filingResponseId: filingId,
    obligations: [
      {
        obligation_id: "OBL-2026Q1",
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        due_date: "2026-04-30",
        cadence: "quarterly",
        state: "due",
      },
    ],
    filings: [
      {
        filing_id: filingId,
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        state: "submitted",
        output_vat_amount_domestic: 1000,
        reverse_charge_output_vat_goods_abroad_amount: 100,
        reverse_charge_output_vat_services_abroad_amount: 50,
        input_vat_deductible_amount_total: 400,
        reimbursement_oil_and_bottled_gas_duty_amount: 30,
        reimbursement_electricity_duty_amount: 20,
      },
    ],
  });

  await loginAsTaxpayer(page);

  await page.getByRole("link", { name: /Open VAT obligation|momsforpligtelse/i }).click();
  await page.getByRole("button", { name: /Indsend momsangivelse|Submit VAT return/i }).click();
  await expect(page.locator("p").filter({ hasText: /trace/i }).first()).toContainText(/trace-100/);

  await page.goto(`/submissions/${filingId}`);
  await expect(page).toHaveURL(new RegExp(`/submissions/${filingId}`));

  const originalFilingPanel = page.locator("article").first();
  await expect(page.getByRole("link", { name: /Opret ændring|Create amendment/i })).toBeVisible();
  await expect(originalFilingPanel).toContainText("1.000,00");

  await page.getByRole("link", { name: /Opret ændring|Create amendment/i }).click();
  await expect(page).toHaveURL(new RegExp(`/amendments/new\\?original_filing_id=${filingId}`));

  await expect(page.getByTestId("amendment-summary-stage4-original")).toHaveText("700,00");
  await expect(page.getByTestId("amendment-summary-stage4-amended")).toHaveText("700,00");
  await expect(page.getByTestId("amendment-summary-stage4-delta")).toHaveText("0,00");

  await page.locator("form input[inputmode='decimal']").first().fill("1100");
  await expect(page.getByTestId("amendment-summary-stage4-original")).toHaveText("700,00");
  await expect(page.getByTestId("amendment-summary-stage4-amended")).toHaveText("800,00");
  await expect(page.getByTestId("amendment-summary-stage4-delta")).toHaveText("100,00");
});

test("@mocked submissions list exposes clickable amendment entry to original filing details", async ({ page }) => {
  const filingId = "f3333333-3333-4333-8333-333333333333";
  await mockPortalApis(page, {
    filings: [
      {
        filing_id: filingId,
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-04-01",
        tax_period_end: "2026-06-30",
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
    amendments: [
      {
        amendment_id: "a3333333-3333-4333-8333-333333333333",
        original_filing_id: filingId,
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-06-30",
        delta_classification: "increase",
        delta_net_vat: 100,
      },
    ],
  });

  await page.route(`**/vat-filings/${filingId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        filing_id: filingId,
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-04-01",
        tax_period_end: "2026-06-30",
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
      }),
    });
  });

  await loginAsTaxpayer(page);
  await page.goto("/submissions");
  await page.locator("article").nth(1).getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/submissions/${filingId}`));
  await expect(page.getByRole("heading", { name: /Original momsangivelse|Original VAT return/i })).toBeVisible();
});

test("@mocked submission details render non-zero submitted VAT values", async ({ page }) => {
  const filingId = "f4444444-4444-4444-8444-444444444444";
  await mockPortalApis(page, {
    amendments: [
      {
        amendment_id: "a4444444-4444-4444-8444-444444444444",
        original_filing_id: filingId,
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-03-31",
        delta_classification: "increase",
        delta_net_vat: 250,
      },
    ],
  });

  await page.route(`**/vat-filings/${filingId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        filing_id: filingId,
        taxpayer_id: "TXP-12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        state: "submitted",
        output_vat_amount_domestic: 1234,
        reverse_charge_output_vat_goods_abroad_amount: 345,
        reverse_charge_output_vat_services_abroad_amount: 234,
        input_vat_deductible_amount_total: 456,
        adjustments_amount: 111,
        reimbursement_oil_and_bottled_gas_duty_amount: 90,
        reimbursement_electricity_duty_amount: 75,
        rubrik_a_goods_eu_purchase_value: 10,
        rubrik_a_services_eu_purchase_value: 11,
        rubrik_b_goods_eu_sale_value_reportable: 12,
        rubrik_b_goods_eu_sale_value_non_reportable: 13,
        rubrik_b_services_eu_sale_value: 14,
        rubrik_c_other_vat_exempt_supplies_value: 15,
        claim_amount: 0,
      }),
    });
  });

  await loginAsTaxpayer(page);
  await page.goto(`/submissions/${filingId}`);
  await expect(page.getByRole("heading", { name: /Original momsangivelse|Original VAT return/i })).toBeVisible();
  await expect(page.locator("article").first()).toContainText("1.234,00");
  await expect(page.locator("article").first()).toContainText("456,00");
  await expect(page.locator("article").first()).toContainText("345,00");
  await expect(page.locator("article").first()).toContainText("234,00");
  await expect(page.locator("article").first()).toContainText("90,00");
});



