"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { listFilings, listObligations, wipeUserDataPreservingAdmin } from "@/core/api/tax-core";
import { formatApiError } from "@/core/api/error-display";
import { useAuth } from "@/core/auth/context";
import { formatDateOnly, formatPeriod } from "@/core/format/date";
import { StatusChip } from "@/features/shared/status-chip";
import { useOverlayI18n } from "@/overlays/common/i18n";

function isOpenable(state: string): boolean {
  return state === "due" || state === "overdue" || state === "draft";
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerInput, setTaxpayerInput] = useState(user?.taxpayer_scope ?? "");
  const [wipePending, setWipePending] = useState(false);
  const [wipeMessage, setWipeMessage] = useState<string | null>(null);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const taxpayerId = useMemo(() => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerInput), [taxpayerInput, user]);

  const [obligationsQuery, filingsQuery] = useQueries({
    queries: [
      {
        queryKey: ["overview", "obligations", taxpayerId],
        queryFn: () => listObligations(taxpayerId, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["overview", "filings", taxpayerId],
        queryFn: () => listFilings(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
    ],
  });

  const statusLabel = (status: string): string => {
    const key = `status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const onWipeUserData = async (): Promise<void> => {
    if (user?.role !== "admin") return;
    if (!window.confirm(t("overview.admin_wipe_confirm"))) return;
    setWipePending(true);
    setWipeError(null);
    setWipeMessage(null);
    try {
      const result = await wipeUserDataPreservingAdmin(user);
      setWipeMessage(t("overview.admin_wipe_success", { count: String(result.admins_preserved) }));
      await Promise.all([obligationsQuery.refetch(), filingsQuery.refetch()]);
    } catch (err) {
      setWipeError(formatApiError(err, t("overview.admin_wipe_error")));
    } finally {
      setWipePending(false);
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("overview.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("overview.description")}</p>
      {user?.role === "admin" ? (
        <div className="mt-4 space-y-3">
          <label className="block max-w-sm">
            <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
            <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerInput} onChange={(e) => setTaxpayerInput(e.target.value)} />
          </label>
          <div className="max-w-sm rounded border border-danger bg-red-50 p-3">
            <button
              className="rounded bg-danger px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onWipeUserData()}
              type="button"
              disabled={wipePending}
            >
              {wipePending ? t("shared.loading") : t("overview.admin_wipe_button")}
            </button>
            {wipeMessage ? <p className="mt-2 text-sm text-success">{wipeMessage}</p> : null}
            {wipeError ? <p className="mt-2 text-sm text-danger">{wipeError}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded border border-[var(--border)] p-4">
          <h3 className="text-lg font-medium">{t("overview.upcoming_obligations")}</h3>
          {obligationsQuery.isLoading ? <p className="mt-3 text-sm text-[var(--muted)]">{t("shared.loading")}</p> : null}
          {obligationsQuery.error ? <p className="mt-3 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
          <ul className="mt-3 space-y-3">
            {(obligationsQuery.data ?? []).map((obligation) => (
              <li key={obligation.obligation_id} className="rounded border border-[var(--border)] p-3">
                <p className="text-sm">
                  {formatPeriod(obligation.tax_period_start, obligation.tax_period_end)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("obligations.due_date")}: {formatDateOnly(obligation.due_date)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusChip text={statusLabel(obligation.state)} />
                  {isOpenable(obligation.state) ? (
                    <Link className="rounded bg-action px-3 py-1.5 text-sm text-white" href={`/filings/new?obligation_id=${encodeURIComponent(obligation.obligation_id)}`}>
                      {t("overview.open_obligation")}
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">{t("overview.already_closed")}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded border border-[var(--border)] p-4">
          <h3 className="text-lg font-medium">{t("overview.submitted_filings")}</h3>
          {filingsQuery.isLoading ? <p className="mt-3 text-sm text-[var(--muted)]">{t("shared.loading")}</p> : null}
          {filingsQuery.error ? <p className="mt-3 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
          <ul className="mt-3 space-y-3">
            {(filingsQuery.data ?? []).map((filing) => (
              <li key={filing.filing_id} className="rounded border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {t("shared.vat_return_period", {
                      period: formatPeriod(filing.tax_period_start, filing.tax_period_end),
                    })}
                  </p>
                  {typeof filing.state === "string" ? <StatusChip text={statusLabel(filing.state)} /> : null}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("obligations.period")}: {formatPeriod(filing.tax_period_start, filing.tax_period_end)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link className="inline-block text-sm text-action underline" href={`/submissions/${encodeURIComponent(filing.filing_id)}`}>
                    {t("overview.view_filing")}
                  </Link>
                  <Link className="inline-block text-sm text-action underline" href={`/amendments/new?original_filing_id=${encodeURIComponent(filing.filing_id)}`}>
                    {t("overview.create_amendment")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
