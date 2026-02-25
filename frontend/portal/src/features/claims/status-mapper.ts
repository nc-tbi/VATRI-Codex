export type ClaimUiModel = {
  labelKey: string;
  tone: "info" | "warning" | "success" | "danger";
  detailKey: string | null;
  detailVars?: Record<string, string>;
};

export function claimStatusToUi(claim: Record<string, unknown>): ClaimUiModel {
  const status = String(claim.status ?? "");
  const retryCount = typeof claim.retry_count === "number" ? claim.retry_count : 0;
  const nextRetryAt = typeof claim.next_retry_at === "string" ? claim.next_retry_at : null;
  const lastAttemptedAt = typeof claim.last_attempted_at === "string" ? claim.last_attempted_at : null;

  if (status === "failed") {
    if (retryCount < 3) {
      return {
        labelKey: "status.dispatch_failed_retrying",
        tone: "warning",
        detailKey: nextRetryAt ? "claims.retry_scheduled" : "claims.retry_pending",
        detailVars: nextRetryAt ? { time: nextRetryAt } : undefined,
      };
    }
    return {
      labelKey: "status.dispatch_failed_terminal",
      tone: "danger",
      detailKey: "claims.max_retries",
    };
  }
  if (status === "dead_letter") {
    return { labelKey: "status.requires_intervention", tone: "danger", detailKey: "claims.max_retries" };
  }
  if (status === "queued") {
    return { labelKey: "status.pending_dispatch", tone: "info", detailKey: null };
  }
  if (status === "sent") {
    return {
      labelKey: "status.dispatched",
      tone: "info",
      detailKey: lastAttemptedAt ? "claims.last_attempt" : null,
      detailVars: lastAttemptedAt ? { time: lastAttemptedAt } : undefined,
    };
  }
  if (status === "acked") {
    return { labelKey: "status.confirmed", tone: "success", detailKey: null };
  }
  if (status === "superseded") {
    return { labelKey: "status.superseded", tone: "success", detailKey: null };
  }
  return { labelKey: "shared.unknown", tone: "warning", detailKey: null };
}
