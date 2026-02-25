import { describe, expect, it } from "vitest";
import { claimStatusToUi } from "./status-mapper";

describe("claimStatusToUi", () => {
  it("maps failed with retries remaining to retry-in-progress", () => {
    const result = claimStatusToUi({
      status: "failed",
      retry_count: 1,
      next_retry_at: "2026-03-01T10:00:00Z",
    });
    expect(result.labelKey).toBe("status.dispatch_failed_retrying");
    expect(result.tone).toBe("warning");
    expect(result.detailKey).toBe("claims.retry_scheduled");
  });

  it("maps dead_letter to terminal failure", () => {
    const result = claimStatusToUi({
      status: "dead_letter",
      retry_count: 3,
    });
    expect(result.labelKey).toBe("status.requires_intervention");
    expect(result.tone).toBe("danger");
  });
});
