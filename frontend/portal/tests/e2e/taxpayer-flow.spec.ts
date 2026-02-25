import { expect, test, type Page } from "@playwright/test";
import { mockPortalApis } from "./utils/session-mocks";

async function loginAsTaxpayer(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("taxpayer");
  await page.getByLabel(/Adgangskode|Password/i).fill("secret");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);
}

test("sidebar hides obligations and new vat return links for taxpayer", async ({ page }) => {
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
        filing_id: "FILING-123",
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-03-31",
        state: "submitted",
      },
    ],
  });

  await loginAsTaxpayer(page);
  await expect(page.getByRole("link", { name: /Forpligtelser|Obligations/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Ny momsangivelse|New VAT return/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Åbn momsforpligtelse|Open VAT obligation/i })).toBeVisible();
});

test("overview opens obligation and filing submission includes obligation context", async ({ page }) => {
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
  await page.getByRole("link", { name: /Åbn momsforpligtelse|Open VAT obligation/i }).click();
  await expect(page).toHaveURL(/\/filings\/new\?obligation_id=OBL-2026Q1/);

  await page.getByRole("button", { name: /Indsend momsangivelse|Submit VAT return/i }).click();
  await expect(page.getByText(/FILING-NEW-001/)).toBeVisible();
  expect(submittedObligationId).toBe("OBL-2026Q1");
});

test("submitted filing page keeps original immutable and starts amendment from context", async ({ page }) => {
  await mockPortalApis(page, {
    filings: [
      {
        filing_id: "FILING-123",
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
        amendment_id: "AMD-001",
        original_filing_id: "FILING-123",
        taxpayer_id: "TXP-12345678",
        tax_period_end: "2026-03-31",
        delta_classification: "increase",
      },
    ],
  });

  await loginAsTaxpayer(page);
  await page.goto("/submissions/FILING-123");
  await expect(page.getByText(/endelig og kan aldrig redigeres|final and can never be edited/i)).toBeVisible();
  await page.getByRole("link", { name: /Opret ændring|Create amendment/i }).click();
  await expect(page).toHaveURL(/\/amendments\/new\?original_filing_id=FILING-123/);
  const originalFilingInput = page.getByLabel(/Originalt momsangivelses-id|Original filing ID/i);
  await expect(originalFilingInput).toHaveValue("FILING-123");
  await expect(originalFilingInput).toHaveAttribute("readonly", "");
});
