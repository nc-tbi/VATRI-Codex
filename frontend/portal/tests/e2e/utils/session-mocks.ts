import type { Page, Route } from "@playwright/test";

interface MockPortalApisOptions {
  role?: "admin" | "taxpayer";
  subjectId?: string;
  taxpayerScope?: string | null;
  obligations?: Array<Record<string, unknown>>;
  filings?: Array<Record<string, unknown>>;
  amendments?: Array<Record<string, unknown>>;
  onSubmitFiling?: (payload: Record<string, unknown>) => void;
  filingResponseId?: string;
  filingTraceId?: string;
}

const REQUIRED_FILING_NUMBER_FIELDS = [
  "output_vat_amount_domestic",
  "reverse_charge_output_vat_goods_abroad_amount",
  "reverse_charge_output_vat_services_abroad_amount",
  "input_vat_deductible_amount_total",
  "adjustments_amount",
  "reimbursement_oil_and_bottled_gas_duty_amount",
  "reimbursement_electricity_duty_amount",
  "rubrik_a_goods_eu_purchase_value",
  "rubrik_a_services_eu_purchase_value",
  "rubrik_b_goods_eu_sale_value_reportable",
  "rubrik_b_goods_eu_sale_value_non_reportable",
  "rubrik_b_services_eu_sale_value",
  "rubrik_c_other_vat_exempt_supplies_value",
  "claim_amount",
] as const;

function withFilingDefaults(record: Record<string, unknown>): Record<string, unknown> {
  const enriched: Record<string, unknown> = {
    tax_period_start: "2026-01-01",
    tax_period_end: "2026-03-31",
    ...record,
  };
  for (const key of REQUIRED_FILING_NUMBER_FIELDS) {
    if (typeof enriched[key] !== "number") {
      enriched[key] = 0;
    }
  }
  return enriched;
}

function withAmendmentDefaults(record: Record<string, unknown>): Record<string, unknown> {
  return {
    delta_net_vat: 0,
    ...record,
  };
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockPortalApis(page: Page, options: MockPortalApisOptions = {}): Promise<void> {
  const user = {
    subject_id: options.subjectId ?? "taxpayer-001",
    role: options.role ?? "taxpayer",
    taxpayer_scope: options.taxpayerScope ?? "TXP-12345678",
  };

  await page.route("**/auth/login", async (route) => {
    await json(route, {
      trace_id: "trace-login-1",
      session_id: "session-1",
      access_token: "token-1",
      refresh_token: "refresh-1",
      expires_in: 3600,
      user,
    });
  });

  await page.route("**/auth/me", async (route) => {
    await json(route, { user });
  });

  await page.route("**/auth/logout", async (route) => {
    await json(route, { ok: true });
  });

  const obligationHandler = async (route: Route): Promise<void> => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await json(route, { obligations: options.obligations ?? [] });
      return;
    }
    if (method === "POST") {
      await json(route, { status: "submitted" });
      return;
    }
    await json(route, {});
  };
  await page.route("**/obligations*", obligationHandler);
  await page.route("**/obligations/**", obligationHandler);

  const vatFilingsHandler = async (route: Route): Promise<void> => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      const url = new URL(route.request().url());
      const detailMatch = /\/vat-filings\/([^/?]+)$/.exec(url.pathname);
      if (detailMatch) {
        const filingId = decodeURIComponent(detailMatch[1]);
        const found = (options.filings ?? []).find((entry) => String(entry.filing_id ?? "") === filingId);
        await json(
          route,
          withFilingDefaults({
            filing_id: filingId,
            ...(found ?? {}),
          })
        );
        return;
      }
      await json(route, {
        filings: (options.filings ?? []).map((entry) => withFilingDefaults(entry)),
      });
      return;
    }
    if (method === "POST") {
      const payload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      options.onSubmitFiling?.(payload);
      const filingId = typeof payload.filing_id === "string" ? payload.filing_id : options.filingResponseId ?? "00000000-0000-4000-8000-000000000001";
      const traceId = options.filingTraceId ?? "trace-100";
      await json(
        route,
        {
          trace_id: traceId,
          idempotent: false,
          filing_id: filingId,
          filing: {
            filing_id: filingId,
          },
        },
        201
      );
      return;
    }
    await json(route, {});
  };
  await page.route("**/vat-filings*", vatFilingsHandler);
  await page.route("**/vat-filings/**", vatFilingsHandler);

  await page.route("**/amendments*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await json(route, {
        amendments: (options.amendments ?? []).map((entry) => withAmendmentDefaults(entry)),
      });
      return;
    }
    await json(route, {
      trace_id: "trace-amd-1",
      idempotent: false,
      amendment_id: "AMD-001",
      amendment: {
        amendment_id: "AMD-001",
      },
    });
  });

  const assessmentsHandler = async (route: Route): Promise<void> => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await json(route, { assessments: [] });
      return;
    }
    if (method === "POST") {
      const body = (route.request().postDataJSON() ?? {}) as { filing?: Record<string, unknown> };
      const filingId = String(body.filing?.filing_id ?? "FILING-NEW-001");
      await json(route, {
        trace_id: "trace-assess-1",
        assessment: {
          assessment_id: "ASSESS-001",
          filing_id: filingId,
          rule_version_id: "DK-VAT-001",
          result_type: "payable",
          claim_amount: 100,
          stage1_gross_output_vat: 100,
          stage2_total_deductible_input_vat: 0,
          stage3_pre_adjustment_net_vat: 100,
          stage4_net_vat: 100,
        },
      }, 201);
      return;
    }
    await json(route, {});
  };
  await page.route(/\/assessments(?:\?|$).*/, assessmentsHandler);
  await page.route(/\/assessments$/, assessmentsHandler);

  const claimsHandler = async (route: Route): Promise<void> => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await json(route, { claims: [] });
      return;
    }
    if (method === "POST") {
      await json(route, {
        trace_id: "trace-claim-1",
        idempotent: false,
        claim: {
          claim_id: "CLAIM-001",
          status: "queued",
          claim_amount: 100,
        },
      }, 201);
      return;
    }
    await json(route, {});
  };
  await page.route(/\/claims(?:\?|$).*/, claimsHandler);
  await page.route(/\/claims$/, claimsHandler);
}
