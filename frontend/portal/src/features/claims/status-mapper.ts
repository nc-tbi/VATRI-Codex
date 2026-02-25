export type ClaimUiModel = {
  label: string;
  tone: "info" | "warning" | "success" | "danger";
  detail: string | null;
};

export function claimStatusToUi(claim: Record<string, unknown>): ClaimUiModel {
  const status = String(claim.status ?? "");
  const retryCount = typeof claim.retry_count === "number" ? claim.retry_count : 0;
  const nextRetryAt = typeof claim.next_retry_at === "string" ? claim.next_retry_at : null;
  const lastAttemptedAt = typeof claim.last_attempted_at === "string" ? claim.last_attempted_at : null;

  if (status === "failed") {
    if (retryCount < 3) {
      return {
        label: "Dispatch failed (retry in progress)",
        tone: "warning",
        detail: nextRetryAt ? `Retry scheduled for ${nextRetryAt}` : "Retry pending",
      };
    }
    return {
      label: "Dispatch failed (terminal)",
      tone: "danger",
      detail: "Max retries reached.",
    };
  }
  if (status === "dead_letter") {
    return { label: "Requires intervention", tone: "danger", detail: "Max retries reached." };
  }
  if (status === "queued") {
    return { label: "Pending dispatch", tone: "info", detail: null };
  }
  if (status === "sent") {
    return {
      label: "Dispatched",
      tone: "info",
      detail: lastAttemptedAt ? `Last dispatch attempt: ${lastAttemptedAt}` : null,
    };
  }
  if (status === "acked") {
    return { label: "Confirmed", tone: "success", detail: null };
  }
  if (status === "superseded") {
    return { label: "Superseded by return", tone: "success", detail: null };
  }
  return { label: status || "Unknown", tone: "warning", detail: null };
}
