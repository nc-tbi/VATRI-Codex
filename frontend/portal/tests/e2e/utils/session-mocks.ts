import type { Page, Route } from "@playwright/test";

interface MockPortalApisOptions {
  role?: "admin" | "taxpayer";
  subjectId?: string;
  taxpayerScope?: string | null;
  obligations?: Array<Record<string, unknown>>;
  filings?: Array<Record<string, unknown>>;
  amendments?: Array<Record<string, unknown>>;
  onSubmitFiling?: (payload: Record<string, unknown>) => void;
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
      access_token: "token-1",
      refresh_token: "refresh-1",
      user,
    });
  });

  await page.route("**/auth/me", async (route) => {
    await json(route, { user });
  });

  await page.route("**/auth/logout", async (route) => {
    await json(route, { ok: true });
  });

  await page.route("**/obligations*", async (route) => {
    await json(route, {
      obligations: options.obligations ?? [],
    });
  });

  await page.route("**/vat-filings*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await json(route, {
        filings: options.filings ?? [],
      });
      return;
    }
    if (method === "POST") {
      const payload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      options.onSubmitFiling?.(payload);
      await json(
        route,
        {
          trace_id: "trace-100",
          idempotent: false,
          filing_id: "FILING-NEW-001",
          filing: {
            filing_id: "FILING-NEW-001",
          },
        },
        201
      );
      return;
    }
    await json(route, {});
  });

  await page.route("**/amendments*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await json(route, {
        amendments: options.amendments ?? [],
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
}
