"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listFilings, submitAmendment } from "@/core/api/tax-core";
import { formatApiError } from "@/core/api/error-display";
import { useAuth } from "@/core/auth/context";
import { ApiError } from "@/core/api/http";
import { useOverlayI18n } from "@/overlays/common/i18n";

type VatField = {
  key: string;
  labelKey: string;
  rubrik?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SECTION_FIELDS: Array<{ titleKey: string; fields: VatField[] }> = [
  {
    titleKey: "filings_new.section_domestic",
    fields: [
      { key: "output_vat_amount_domestic", labelKey: "filings_new.output_vat" },
      { key: "input_vat_deductible_amount_total", labelKey: "filings_new.input_vat" },
    ],
  },
  {
    titleKey: "filings_new.section_trade_abroad",
    fields: [
      { key: "reverse_charge_output_vat_goods_abroad_amount", labelKey: "filings_new.reverse_goods_vat" },
      { key: "reverse_charge_output_vat_services_abroad_amount", labelKey: "filings_new.reverse_services_vat" },
      { key: "rubrik_a_goods_eu_purchase_value", labelKey: "filings_new.rubrik_a_goods", rubrik: "A" },
      { key: "rubrik_a_services_eu_purchase_value", labelKey: "filings_new.rubrik_a_services", rubrik: "A" },
      { key: "rubrik_b_goods_eu_sale_value_reportable", labelKey: "filings_new.rubrik_b_goods_reported", rubrik: "B" },
      { key: "rubrik_b_goods_eu_sale_value_non_reportable", labelKey: "filings_new.rubrik_b_goods_not_reported", rubrik: "B" },
      { key: "rubrik_b_services_eu_sale_value", labelKey: "filings_new.rubrik_b_services", rubrik: "B" },
      { key: "rubrik_c_other_vat_exempt_supplies_value", labelKey: "filings_new.rubrik_c", rubrik: "C" },
    ],
  },
  {
    titleKey: "filings_new.section_energy_refund",
    fields: [
      { key: "reimbursement_oil_and_bottled_gas_duty_amount", labelKey: "filings_new.energy_oil_gas" },
      { key: "reimbursement_electricity_duty_amount", labelKey: "filings_new.energy_electricity" },
    ],
  },
];

function uuid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function parseAmount(value: string): number {
  const compact = value.trim().replace(/\s/g, "");
  const normalized =
    compact.includes(",") && compact.includes(".")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function periodText(start: unknown, end: unknown): string {
  const startText = typeof start === "string" ? start : "";
  const endText = typeof end === "string" ? end : "";
  if (startText && endText) return `${startText} - ${endText}`;
  if (endText) return endText;
  return "-";
}

export default function NewAmendmentPage() {
  const searchParams = useSearchParams();
  const filingFromContext = searchParams.get("original_filing_id") ?? "";
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasContext = Boolean(filingFromContext);

  const originalFilingQuery = useQuery({
    queryKey: ["amendment", "original-filing", filingFromContext, taxpayerId],
    queryFn: async () => {
      const filings = await listFilings(taxpayerId, undefined, user ?? undefined);
      return filings.find((entry) => entry.filing_id === filingFromContext) ?? null;
    },
    enabled: Boolean(hasContext && taxpayerId),
  });

  const original = originalFilingQuery.data;
  const period = periodText(original?.tax_period_start, original?.tax_period_end);

  useEffect(() => {
    if (!original) return;
    const next: Record<string, string> = {};
    for (const section of SECTION_FIELDS) {
      for (const field of section.fields) {
        next[field.key] = String(readNumber(original[field.key]));
      }
    }
    setDraftValues(next);
  }, [original]);

  if (!hasContext) {
    return (
      <section>
        <h2 className="text-2xl font-semibold">{t("amendments_new.title")}</h2>
        <p className="mt-2 text-[var(--muted)]">{t("amendments_new.context_required")}</p>
        <Link className="mt-4 inline-block rounded bg-action px-4 py-2 text-sm text-white" href="/overview">
          {t("filings_new.go_to_overview")}
        </Link>
      </section>
    );
  }

  const onValueChange = (fieldKey: string, value: string): void => {
    setDraftValues((current) => ({ ...current, [fieldKey]: value }));
  };

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!UUID_RE.test(filingFromContext)) {
      setError(t("amendments_new.invalid_original_filing_id"));
      return;
    }
    if (!original) {
      setError(t("shared.fetch_error"));
      return;
    }
    try {
      const now = new Date().toISOString();

      const amended = {
        output: parseAmount(draftValues.output_vat_amount_domestic ?? "0"),
        reverseGoods: parseAmount(draftValues.reverse_charge_output_vat_goods_abroad_amount ?? "0"),
        reverseServices: parseAmount(draftValues.reverse_charge_output_vat_services_abroad_amount ?? "0"),
        input: parseAmount(draftValues.input_vat_deductible_amount_total ?? "0"),
      };
      const originalStage1 = readNumber(original.output_vat_amount_domestic) + readNumber(original.reverse_charge_output_vat_goods_abroad_amount) + readNumber(original.reverse_charge_output_vat_services_abroad_amount);
      const originalStage2 = readNumber(original.input_vat_deductible_amount_total);
      const originalStage3 = originalStage1 - originalStage2;
      const originalStage4 = originalStage3;
      const amendedStage1 = amended.output + amended.reverseGoods + amended.reverseServices;
      const amendedStage2 = amended.input;
      const amendedStage3 = amendedStage1 - amendedStage2;
      const amendedStage4 = amendedStage3;

      const body = {
        original_filing_id: filingFromContext,
        taxpayer_id: taxpayerId,
        tax_period_end: String(original.tax_period_end ?? "2026-03-31"),
        original_assessment: {
          filing_id: filingFromContext,
          trace_id: "portal-amendment",
          rule_version_id: "DK-VAT-001",
          assessed_at: now,
          assessment_version: 1,
          stage1_gross_output_vat: originalStage1,
          stage2_total_deductible_input_vat: originalStage2,
          stage3_pre_adjustment_net_vat: originalStage3,
          stage4_net_vat: originalStage4,
          result_type: originalStage4 > 0 ? "payable" : originalStage4 < 0 ? "refund" : "zero",
          claim_amount: Math.abs(originalStage4),
        },
        new_assessment: {
          filing_id: uuid(),
          trace_id: "portal-amendment",
          rule_version_id: "DK-VAT-001",
          assessed_at: now,
          assessment_version: 2,
          stage1_gross_output_vat: amendedStage1,
          stage2_total_deductible_input_vat: amendedStage2,
          stage3_pre_adjustment_net_vat: amendedStage3,
          stage4_net_vat: amendedStage4,
          result_type: amendedStage4 > 0 ? "payable" : amendedStage4 < 0 ? "refund" : "zero",
          claim_amount: Math.abs(amendedStage4),
        },
      };
      const result = await submitAmendment(body, user ?? undefined);
      const replay = result.status === 200 && result.idempotent;
      setMessage(replay ? t("amendments_new.replayed", { trace: result.trace_id }) : t("amendments_new.submitted", { trace: result.trace_id }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === "IDEMPOTENCY_CONFLICT") {
          setError(t("amendments_new.conflict_idempotency"));
          return;
        }
        if (err.code === "STATE_ERROR") {
          setError(t("amendments_new.conflict_state", { message: err.message }));
          return;
        }
      }
      setError(formatApiError(err, t("amendments_new.submit_error")));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("amendments_new.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("amendments_new.description")}</p>
      <p className="mt-4 rounded border border-[var(--border)] bg-slate-50 p-3 text-sm">
        {t("amendments_new.source_context", { period })}
      </p>
      {originalFilingQuery.isLoading ? <p className="mt-4 text-sm">{t("shared.loading")}</p> : null}
      {originalFilingQuery.error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
      {message ? <p className="mt-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p> : null}

      {original ? (
        <form className="mt-6 space-y-6" onSubmit={(e) => void onSubmit(e)}>
          {SECTION_FIELDS.map((section) => (
            <section key={section.titleKey} className="space-y-3">
              <h3 className="text-lg font-medium">{t(section.titleKey)}</h3>
              <div className="grid grid-cols-[1fr_160px_160px_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span>{t("amendments_new.field_column")}</span>
                <span className="text-right">{t("amendments_new.latest_values_column")}</span>
                <span className="text-right">{t("amendments_new.amended_values_column")}</span>
                <span />
              </div>
              {section.fields.map((field) => (
                <label key={field.key} className="grid grid-cols-[1fr_160px_160px_36px] items-center gap-2 rounded border border-[var(--border)] px-3 py-2 text-sm">
                  <span>
                    {field.rubrik ? <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{field.rubrik}</span> : null}
                    {t(field.labelKey)}
                  </span>
                  <span className="rounded border border-[var(--border)] bg-slate-50 px-3 py-2 text-right">
                    {formatAmount(readNumber(original[field.key]))}
                  </span>
                  <input
                    className="rounded border border-[var(--border)] px-3 py-2 text-right"
                    inputMode="decimal"
                    value={draftValues[field.key] ?? "0"}
                    onChange={(event) => onValueChange(field.key, event.target.value)}
                  />
                  <span className="text-[var(--muted)]">kr.</span>
                </label>
              ))}
            </section>
          ))}
          <button className="rounded bg-action px-4 py-2 text-white" type="submit">
            {t("amendments_new.submit")}
          </button>
        </form>
      ) : null}
    </section>
  );
}
