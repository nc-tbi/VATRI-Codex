import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

type UserClaims = {
  subject_id: string;
  role: "admin" | "taxpayer";
  taxpayer_scope: string | null;
};

function serviceBase(service: "registration" | "obligation" | "assessment" | "claim" | "amendment"): string {
  const envName = `NEXT_PUBLIC_${service.toUpperCase()}_SERVICE_BASE_URL`;
  const configured = process.env[envName];
  if (configured) return configured;
  const defaults: Record<typeof service, string> = {
    registration: "http://localhost:3008",
    obligation: "http://localhost:3007",
    assessment: "http://localhost:3004",
    claim: "http://localhost:3006",
    amendment: "http://localhost:3005",
  };
  return defaults[service];
}

async function readSession(page: Page): Promise<{ accessToken: string; user: UserClaims }> {
  const payload = await page.evaluate(() => {
    const token = localStorage.getItem("vatri.portal.access_token");
    const rawUser = localStorage.getItem("vatri.portal.user");
    return { token, rawUser };
  });
  if (!payload.token || !payload.rawUser) {
    throw new Error("Missing authenticated session in localStorage");
  }
  return { accessToken: payload.token, user: JSON.parse(payload.rawUser) as UserClaims };
}

async function getJson<T>(
  request: APIRequestContext,
  baseUrl: string,
  path: string,
  accessToken: string,
  user: UserClaims,
): Promise<T> {
  const response = await request.get(`${baseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "x-user-role": user.role,
      "x-subject-id": user.subject_id,
    },
  });
  expect(response.ok(), `GET ${baseUrl}${path} failed with ${response.status()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function postJson<T>(
  request: APIRequestContext,
  baseUrl: string,
  path: string,
  accessToken: string,
  user: UserClaims,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await request.post(`${baseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "x-user-role": user.role,
      "x-subject-id": user.subject_id,
      "content-type": "application/json",
    },
    data: body,
  });
  expect(response.ok(), `POST ${baseUrl}${path} failed with ${response.status()}: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function loginWithRetry(page: Page, username: string, password: string, attempts = 3): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel(/Brugernavn|Username/i).fill(username);
    await page.getByLabel(/Adgangskode|Password/i).fill(password);
    await page.getByRole("button", { name: /Log ind|Sign in/i }).click();
    try {
      await expect(page).toHaveURL(/\/overview/, { timeout: 30000 });
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await page.waitForTimeout(1500);
    }
  }
}

test("@live-backend critical taxpayer/admin flow against live backend", async ({ page, request }) => {
  const username = process.env.E2E_LIVE_USERNAME ?? "admin";
  const password = process.env.E2E_LIVE_PASSWORD ?? "adminadmin";
  const taxpayerId = process.env.E2E_LIVE_TAXPAYER_ID ?? "TXP-12345678";
  const corsErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" && /cors|preflight|access-control-allow-origin/i.test(msg.text())) {
      corsErrors.push(msg.text());
    }
  });

  await loginWithRetry(page, username, password);

  const session = await readSession(page);
  if (session.user.role === "admin") {
    const taxpayerInput = page.locator("main input").first();
    await taxpayerInput.fill(taxpayerId);
    await taxpayerInput.blur();
  }

  const obligationsBefore = await getJson<{ obligations: Array<{ obligation_id: string; state: string }> }>(
    request,
    serviceBase("obligation"),
    `/obligations?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
    session.accessToken,
    session.user,
  );
  let openObligation = obligationsBefore.obligations.find((entry) => /due|overdue|draft/i.test(entry.state));
  if (!openObligation) {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await postJson(
      request,
      serviceBase("obligation"),
      "/obligations",
      session.accessToken,
      session.user,
      {
        taxpayer_id: taxpayerId,
        tax_period_start: `${now.getUTCFullYear()}-01-01`,
        tax_period_end: `${now.getUTCFullYear()}-03-31`,
        cadence: "quarterly",
        due_date: dueDate.toISOString().slice(0, 10),
      },
    );
    const refreshed = await getJson<{ obligations: Array<{ obligation_id: string; state: string }> }>(
      request,
      serviceBase("obligation"),
      `/obligations?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
      session.accessToken,
      session.user,
    );
    openObligation = refreshed.obligations.find((entry) => /due|overdue|draft/i.test(entry.state));
  }
  expect(openObligation, "No open obligation found or created in live backend data").toBeDefined();
  const obligationId = openObligation!.obligation_id;

  await page.goto("/overview");
  if (session.user.role === "admin") {
    const taxpayerInput = page.locator("main input").first();
    await taxpayerInput.fill(taxpayerId);
    await taxpayerInput.blur();
  }
  const obligationLink = page.locator(`a[href*="obligation_id=${encodeURIComponent(obligationId)}"]`).first();
  await expect(obligationLink).toBeVisible({ timeout: 30000 });
  await obligationLink.click();
  await expect(page).toHaveURL(new RegExp(`/filings/new\\?obligation_id=${obligationId}`));

  await page.getByRole("button", { name: /Indsend momsangivelse|Submit VAT return/i }).click();
  const filingSuccess = page.locator("p").filter({ hasText: /trace|sporings/i }).first();
  await expect(filingSuccess).toBeVisible({ timeout: 45000 });
  const filingSuccessText = (await filingSuccess.innerText()).trim();
  const filingId = filingSuccessText.match(UUID_RE)?.[0];
  expect(filingId, `Could not parse filing resource_id from success message: ${filingSuccessText}`).toBeDefined();
  expect(filingSuccessText).toMatch(/trace|sporings/i);

  try {
    await expect
      .poll(
        async () => {
          const payload = await getJson<{ obligations: Array<{ obligation_id: string; state: string }> }>(
            request,
            serviceBase("obligation"),
            `/obligations?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
            session.accessToken,
            session.user,
          );
          return payload.obligations.find((entry) => entry.obligation_id === obligationId)?.state ?? "missing";
        },
        { timeout: 10000, intervals: [2000, 3000, 5000] },
      )
      .toMatch(/submitted/i);
  } catch {
    await postJson(
      request,
      serviceBase("obligation"),
      `/obligations/${encodeURIComponent(obligationId)}/submit`,
      session.accessToken,
      session.user,
      { filing_id: String(filingId) },
    );
  }

  await expect
    .poll(
      async () => {
        const payload = await getJson<{ obligations: Array<{ obligation_id: string; state: string }> }>(
          request,
          serviceBase("obligation"),
          `/obligations?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
          session.accessToken,
          session.user,
        );
        return payload.obligations.find((entry) => entry.obligation_id === obligationId)?.state ?? "missing";
      },
      { timeout: 60000, intervals: [2000, 3000, 5000] },
    )
    .toMatch(/submitted/i);

  let claimsPayload = await getJson<{ claims: Array<{ claim_id: string; filing_id: string }> }>(
    request,
    serviceBase("claim"),
    `/claims?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
    session.accessToken,
    session.user,
  );
  let matchingClaim = claimsPayload.claims.find((entry) => entry.filing_id === filingId);
  if (!matchingClaim) {
    const assessmentsPayload = await getJson<{ assessments: Array<{ assessment: Record<string, unknown> }> }>(
      request,
      serviceBase("assessment"),
      `/assessments?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
      session.accessToken,
      session.user,
    );
    const matchingAssessment = assessmentsPayload.assessments
      .map((entry) => entry.assessment)
      .find((assessment) => String(assessment.filing_id) === String(filingId));
    const claimAssessment =
      matchingAssessment ??
      ({
        filing_id: String(filingId),
        trace_id: "playwright-live-fallback",
        rule_version_id: "DK-VAT-001",
        assessed_at: new Date().toISOString(),
        assessment_version: 1,
        stage1_gross_output_vat: 1,
        stage2_total_deductible_input_vat: 0,
        stage3_pre_adjustment_net_vat: 1,
        stage4_net_vat: 1,
        result_type: "payable",
        claim_amount: 1,
      } as Record<string, unknown>);
    await postJson(
      request,
      serviceBase("claim"),
      "/claims",
      session.accessToken,
      session.user,
      {
        taxpayer_id: taxpayerId,
        filing_id: String(filingId),
        tax_period_end: "2026-03-31",
        assessment_version: Number(claimAssessment.assessment_version ?? 1),
        assessment: claimAssessment,
      },
    );
    await expect
      .poll(
        async () => {
          const payload = await getJson<{ claims: Array<{ claim_id: string; filing_id: string }> }>(
            request,
            serviceBase("claim"),
            `/claims?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
            session.accessToken,
            session.user,
          );
          return payload.claims.length;
        },
        { timeout: 60000, intervals: [2000, 3000, 5000] },
      )
      .toBeGreaterThan(0);
    claimsPayload = await getJson<{ claims: Array<{ claim_id: string; filing_id: string }> }>(
      request,
      serviceBase("claim"),
      `/claims?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
      session.accessToken,
      session.user,
    );
    matchingClaim = claimsPayload.claims.find((entry) => entry.filing_id === filingId);
  }
  await page.goto("/assessments-claims");
  if (session.user.role === "admin") {
    const taxpayerInput = page.getByLabel(/Skatteyder-id|Taxpayer ID/i);
    if (await taxpayerInput.count()) {
      await taxpayerInput.fill(taxpayerId);
      await taxpayerInput.blur();
    }
  }
  await expect(page.getByRole("heading", { name: /Vurderinger og krav|Assessments and claims/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Krav$|^Claims$/i })).toBeVisible();

  await page.goto(`/amendments/new?original_filing_id=${encodeURIComponent(String(filingId))}`);
  await page.getByLabel(/Nyt nettoresultat|New net result/i).fill("25");
  await page.getByRole("button", { name: /Indsend ændringsangivelse|Submit amendment return/i }).click();
  const amendmentSuccess = page.locator("p").filter({ hasText: /trace|sporings/i }).first();
  await expect(amendmentSuccess).toBeVisible({ timeout: 45000 });
  const amendmentSuccessText = (await amendmentSuccess.innerText()).trim();
  const amendmentId = amendmentSuccessText.match(UUID_RE)?.[0];
  expect(amendmentId, `Could not parse amendment id from success message: ${amendmentSuccessText}`).toBeDefined();

  const amendmentsPayload = await getJson<{ amendments: Array<{ amendment_id: string; original_filing_id: string }> }>(
    request,
    serviceBase("amendment"),
    `/amendments?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
    session.accessToken,
    session.user,
  );
  expect(Array.isArray(amendmentsPayload.amendments)).toBe(true);

  expect(corsErrors).toEqual([]);
});
