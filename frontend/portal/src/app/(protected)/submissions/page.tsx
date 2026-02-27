"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { listAmendments, listFilings } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { formatPeriod } from "@/core/format/date";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function SubmissionsPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerInput, setTaxpayerInput] = useState(user?.taxpayer_scope ?? "");
  const taxpayerId = useMemo(() => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerInput), [taxpayerInput, user]);

  const [filingsQuery, amendmentsQuery] = useQueries({
    queries: [
      {
        queryKey: ["submissions", "filings", taxpayerId],
        queryFn: () => listFilings(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["submissions", "amendments", taxpayerId],
        queryFn: () => listAmendments(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
    ],
  });
  const statusLabel = (status: string): string => {
    const key = `status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("submissions.title")}</h2>
      {user?.role === "admin" ? (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerInput} onChange={(e) => setTaxpayerInput(e.target.value)} />
        </label>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article>
          <h3 className="font-medium">{t("submissions.filings")}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(filingsQuery.data ?? []).map((f) => (
              <li key={String(f.filing_id)} className="rounded border p-3">
                <Link className="underline" href={`/submissions/${encodeURIComponent(String(f.filing_id))}`}>
                  {t("shared.vat_return_period", { period: formatPeriod(f.tax_period_start, f.tax_period_end) })}
                </Link>{" "}
                - {typeof f.state === "string" ? statusLabel(f.state) : t("shared.unknown")}
              </li>
            ))}
          </ul>
        </article>
        <article>
          <h3 className="font-medium">{t("submissions.amendments")}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(amendmentsQuery.data ?? []).map((a) => (
              <li key={String(a.amendment_id)} className="rounded border p-3">
                {typeof a.original_filing_id === "string" && a.original_filing_id ? (
                  <Link className="underline" href={`/submissions/${encodeURIComponent(a.original_filing_id)}`}>
                    {t("shared.amendment_period", { period: formatPeriod(undefined, a.tax_period_end) })}
                  </Link>
                ) : (
                  t("shared.amendment_period", { period: formatPeriod(undefined, a.tax_period_end) })
                )}{" "}
                - {String(a.delta_classification ?? t("shared.unknown"))}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
