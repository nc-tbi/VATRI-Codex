"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { listAssessments, listClaims } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { StatusChip } from "@/features/shared/status-chip";
import { claimStatusToUi } from "@/features/claims/status-mapper";
import { useOverlayI18n } from "@/overlays/common/i18n";

type StageRow = { label: string; value: number };

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AssessmentsClaimsPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerInput, setTaxpayerInput] = useState(user?.taxpayer_scope ?? "");
  const [periodFilter, setPeriodFilter] = useState("");
  const taxpayerId = useMemo(
    () => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerInput),
    [taxpayerInput, user],
  );
  const taxPeriodEnd = periodFilter ? `${periodFilter}-01` : undefined;

  const [assessmentQuery, claimQuery] = useQueries({
    queries: [
      {
        queryKey: ["assessments", taxpayerId, taxPeriodEnd ?? ""],
        queryFn: () => listAssessments(taxpayerId, taxPeriodEnd, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["claims", taxpayerId, taxPeriodEnd ?? ""],
        queryFn: () => listClaims(taxpayerId, taxPeriodEnd, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
    ],
  });
  const statusLabel = (status: string): string => {
    const key = `status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const stageRowsFromEntry = (entry: { assessment: Record<string, unknown>; transparency?: { calculation_stages?: Array<{ label?: string; value?: number }> } }): StageRow[] => {
    const staged = entry.transparency?.calculation_stages;
    if (Array.isArray(staged) && staged.length > 0) {
      return staged.map((row, index) => ({
        label: row.label ?? `Stage ${index + 1}`,
        value: readNumber(row.value),
      }));
    }
    const assessment = entry.assessment;
    return [
      { label: "Stage 1", value: readNumber(assessment.stage1_gross_output_vat_amount ?? assessment.stage1_gross_output_vat) },
      { label: "Stage 2", value: readNumber(assessment.stage2_total_deductible_input_vat_amount ?? assessment.stage2_total_deductible_input_vat) },
      { label: "Stage 3", value: readNumber(assessment.stage3_pre_adjustment_net_vat_amount ?? assessment.stage3_pre_adjustment_net_vat) },
      { label: "Stage 4", value: readNumber(assessment.stage4_net_vat_amount ?? assessment.stage4_net_vat) },
    ];
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("assessments_claims.title")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {user?.role === "admin" ? (
          <label className="block">
            <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
            <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerInput} onChange={(e) => setTaxpayerInput(e.target.value)} />
          </label>
        ) : (
          <div />
        )}
        <label className="block">
          <span className="mb-1 block text-sm">{t("obligations.period")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" type="month" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {(assessmentQuery.data ?? []).map((entry, idx) => {
          const stages = stageRowsFromEntry(entry);
          return (
            <article className="rounded border p-4" key={`${idx}-${String(entry.assessment?.filing_id ?? "")}`}>
              <h3 className="font-medium">
                {t("assessments_claims.assessment")} {String(entry.assessment?.assessment_id ?? "")}
              </h3>
              <p className="mt-1 text-sm">
                {t("assessments_claims.result")}:{" "}
                {typeof entry.transparency?.result_type === "string" ? statusLabel(entry.transparency.result_type) : t("shared.unknown")}
              </p>
              <p className="mt-1 text-sm">
                {t("assessments_claims.amount")}: {String(entry.transparency?.claim_amount ?? "-")}
              </p>
              <table className="mt-3 w-full border-collapse text-sm">
                <caption className="sr-only">{t("assessments_claims.calculation_stages_caption")}</caption>
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-left" scope="col">
                      {t("assessments_claims.stage")}
                    </th>
                    <th className="py-1 text-right" scope="col">
                      {t("assessments_claims.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage) => (
                    <tr className="border-b" key={`${idx}-${stage.label}`}>
                      <th className="py-1 text-left font-normal" scope="row">
                        {stage.label}
                      </th>
                      <td className="py-1 text-right">{formatAmount(stage.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm text-[var(--muted)]">{entry.transparency?.explanation ?? t("assessments_claims.no_explanation")}</p>
            </article>
          );
        })}

        <article className="rounded border p-4">
          <h3 className="font-medium">{t("assessments_claims.claims")}</h3>
          <ul aria-label={t("assessments_claims.claims_list_label")} className="mt-2 space-y-2 text-sm">
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
