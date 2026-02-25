"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { listAssessments, listClaims } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { StatusChip } from "@/features/shared/status-chip";
import { claimStatusToUi } from "@/features/claims/status-mapper";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function AssessmentsClaimsPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerInput, setTaxpayerInput] = useState(user?.taxpayer_scope ?? "");
  const taxpayerId = useMemo(() => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerInput), [taxpayerInput, user]);

  const [assessmentQuery, claimQuery] = useQueries({
    queries: [
      {
        queryKey: ["assessments", taxpayerId],
        queryFn: () => listAssessments(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["claims", taxpayerId],
        queryFn: () => listClaims(taxpayerId, undefined, user ?? undefined),
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
      <h2 className="text-2xl font-semibold">{t("assessments_claims.title")}</h2>
      {user?.role === "admin" ? (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerInput} onChange={(e) => setTaxpayerInput(e.target.value)} />
        </label>
      ) : null}
      <div className="mt-6 space-y-4">
        {(assessmentQuery.data ?? []).map((entry, idx) => (
          <article className="rounded border p-4" key={`${idx}-${String(entry.assessment?.filing_id ?? "")}`}>
            <h3 className="font-medium">
              {t("assessments_claims.assessment")} {String(entry.assessment?.assessment_id ?? "")}
            </h3>
            <p className="mt-1 text-sm">
              {t("assessments_claims.result")}: {typeof entry.transparency?.result_type === "string" ? statusLabel(entry.transparency.result_type) : t("shared.unknown")}
            </p>
            <p className="mt-1 text-sm">
              {t("assessments_claims.amount")}: {String(entry.transparency?.claim_amount ?? "-")}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">{entry.transparency?.explanation ?? t("assessments_claims.no_explanation")}</p>
          </article>
        ))}
        <article className="rounded border p-4">
          <h3 className="font-medium">{t("assessments_claims.claims")}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(claimQuery.data ?? []).map((claim) => {
              const ui = claimStatusToUi(claim);
              return (
                <li key={String(claim.claim_id)} className="rounded border p-3">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">{String(claim.claim_id)}</span>
                    <StatusChip text={t(ui.labelKey)} tone={ui.tone} />
                  </p>
                  {ui.detailKey ? <p className="mt-1 text-[var(--muted)]">{t(ui.detailKey, ui.detailVars)}</p> : null}
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
