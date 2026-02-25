import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

function randomUuid(): string {
  return randomUUID();
}

test("@live-backend admin can create and retrieve taxpayer registration through persisted backend state", async ({ page }) => {
  const adminUser = process.env.E2E_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "adminadmin";
  const taxpayerId = randomUuid();
  const legalName = `Portal Live ${taxpayerId.slice(0, 8)}`;

  await page.goto("/login");
  await page.getByLabel(/Brugernavn|Username/i).fill(adminUser);
  await page.getByLabel(/Adgangskode|Password/i).fill(adminPassword);
  await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);

  await page.getByRole("link", { name: /Registrer skatteyder|Register taxpayer/i }).click();
  await expect(page).toHaveURL(/\/admin\/taxpayers\/new/);

  await page.getByLabel(/Skatteyder-id|Taxpayer ID/i).fill(taxpayerId);
  await page.getByLabel(/Juridisk navn|Legal name/i).fill(legalName);
  await page.getByLabel(/Kontaktperson|Contact person/i).fill("Portal Integration Tester");
  await page.getByLabel(/Kontakt e-mail|Contact email/i).fill("portal.integration@example.com");
  await page.getByLabel(/Kontakttelefon|Contact phone/i).fill("+4511223344");
  await page.getByLabel(/Adresse linje 1|Address line 1/i).fill("Integrationvej 1");
  await page.getByLabel(/Postnummer|Postal code/i).fill("2100");
  await page.getByLabel(/By|City/i).fill("Kobenhavn");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/registrations") &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: /Opret registrering|Create registration/i }).click();

  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const createBody = (await createResponse.json()) as { registration_id?: string };
  expect(typeof createBody.registration_id).toBe("string");

  const registrationId = createBody.registration_id as string;
  await expect(page.getByText(new RegExp(registrationId, "i"))).toBeVisible();

  await page.getByRole("link", { name: /Søg skatteyder|Find taxpayer/i }).click();
  await expect(page).toHaveURL(/\/admin\/taxpayers/);

  await page.getByPlaceholder(/Registrerings-id|Registration ID/i).fill(registrationId);
  const lookupResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/registrations/${registrationId}`) &&
      response.request().method() === "GET",
  );
  await page.getByRole("button", { name: /Søg|Search/i }).click();
  const lookupResponse = await lookupResponsePromise;
  expect(lookupResponse.status()).toBe(200);

  await expect(page.locator("dd").filter({ hasText: taxpayerId }).first()).toBeVisible();
});
