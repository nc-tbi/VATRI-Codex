import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiPostWithMeta } from "./http";

describe("apiPostWithMeta", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns status and data for success responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ idempotent: true }),
    } as Response);

    const result = await apiPostWithMeta("filing", "/vat-filings", { filing_id: "f1" });
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ idempotent: true });
  });

  it("throws typed ApiError with code and trace_id for conflict", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "DUPLICATE_FILING", trace_id: "trace-1", message: "Conflict" }),
      text: async () => "Conflict",
    } as Response);

    await expect(apiPostWithMeta("filing", "/vat-filings", { filing_id: "f1" })).rejects.toMatchObject({
      status: 409,
      code: "DUPLICATE_FILING",
      traceId: "trace-1",
    });
  });
});
