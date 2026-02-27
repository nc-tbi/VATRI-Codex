import { expect, test, type Page } from "@playwright/test";
import { mockPortalApis } from "./utils/session-mocks";

async function loginAsTaxpayer(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill("taxpayer");
  await page.getByLabel(/Adgangskode|Password/i).fill("secret");
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);
}

test("@mocked assessments and claims apply period filter month as tax_period_end", async ({ page }) => {
  await mockPortalApis(page, { role: "admin", taxpayerScope: null });

  const assessmentPeriods: string[] = [];
  const claimPeriods: string[] = [];

  await page.route(/\/assessments\?.*/, async (route) => {
    const url = new URL(route.request().url());
    assessmentPeriods.push(url.searchParams.get("tax_period_end") ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        assessments: [
          {
            assessment: {
              assessment_id: "ASSMT-001",
              filing_id: "f5555555-5555-4555-8555-555555555555",
              tax_period_end: "2026-03-31",
              stage1_gross_output_vat: 1000,
              stage2_total_deductible_input_vat: 200,
              stage3_pre_adjustment_net_vat: 800,
              stage4_net_vat: 800,
              claim_amount: 800,
            },
            transparency: {
              explanation: "ok",
              result_type: "payable",
              claim_amount: 800,
            },
          },
        ],
      }),
    });
  });

  await page.route(/\/claims\?.*/, async (route) => {
    const url = new URL(route.request().url());
    claimPeriods.push(url.searchParams.get("tax_period_end") ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        claims: [
          {
            claim_id: "CLM-001",
            filing_id: "f5555555-5555-4555-8555-555555555555",
            status: "queued",
            claim_amount: 800,
          },
        ],
      }),
    });
  });

  await loginAsTaxpayer(page);
  await page.goto("/assessments-claims");

  const periodInput = page.locator("input[type='month']");
  await expect(periodInput).toBeVisible();
  await periodInput.fill("2026-03");

  await expect.poll(() => assessmentPeriods.includes("2026-03-31")).toBeTruthy();
  await expect.poll(() => claimPeriods.includes("2026-03-31")).toBeTruthy();
});


