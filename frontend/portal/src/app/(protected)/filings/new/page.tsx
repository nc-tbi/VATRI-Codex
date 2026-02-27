"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  createAssessmentFromFiling,
  createClaimFromAssessment,
  listObligations,
  submitFiling,
  submitObligation,
} from "@/core/api/tax-core";
import { formatApiError } from "@/core/api/error-display";
import { useAuth } from "@/core/auth/context";
import { ApiError } from "@/core/api/http";
import { formatVatAmount, readAmount } from "@/core/format/amount";
import { formatDateOnly, formatPeriod } from "@/core/format/date";
import { useOverlayI18n } from "@/overlays/common/i18n";

function uuid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

interface AmountFieldProps {
  label: string;
  rubrik?: string;
  value: string;
  onChange: (value: string) => void;
}

function AmountField({ label, rubrik, value, onChange }: AmountFieldProps) {
  return (
    <label className="grid grid-cols-[1fr_140px_36px] items-center gap-3 rounded border border-[var(--border)] px-3 py-2 text-sm">
      <span>
        {rubrik ? <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{rubrik}</span> : null}
        {label}
      </span>
      <input
        className="rounded border border-[var(--border)] px-3 py-2 text-right"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-[var(--muted)]">kr.</span>
    </label>
  );
}

export default function NewFilingPage() {
  const searchParams = useSearchParams();
  const obligationId = searchParams.get("obligation_id");
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);

  const obligationQuery = useQuery({
    queryKey: ["filings-new", "obligation", taxpayerId, obligationId],
    queryFn: async () => {
      const obligations = await listObligations(taxpayerId, user ?? undefined);
      return obligations.find((entry) => entry.obligation_id === obligationId) ?? null;
    },
    enabled: Boolean(taxpayerId && obligationId),
  });

  const [outputVat, setOutputVat] = useState("0");
  const [inputVat, setInputVat] = useState("0");
  const [reverseGoodsVat, setReverseGoodsVat] = useState("0");
  const [reverseServicesVat, setReverseServicesVat] = useState("0");
  const [rubrikAGoods, setRubrikAGoods] = useState("0");
  const [rubrikAServices, setRubrikAServices] = useState("0");
  const [rubrikBGoodsReported, setRubrikBGoodsReported] = useState("0");
  const [rubrikBGoodsNotReported, setRubrikBGoodsNotReported] = useState("0");
  const [rubrikBServices, setRubrikBServices] = useState("0");
  const [rubrikC, setRubrikC] = useState("0");
  const [energyOilGas, setEnergyOilGas] = useState("0");
  const [energyElectricity, setEnergyElectricity] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stageSummary = useMemo(() => {
    const stage1 = readAmount(outputVat) + readAmount(reverseGoodsVat) + readAmount(reverseServicesVat);
    const stage2 = readAmount(inputVat);
    const stage3 = stage1 - stage2;
    const stage4 = stage3 - readAmount(energyOilGas) - readAmount(energyElectricity);
    const result = stage4 > 0 ? t("status.payable") : stage4 < 0 ? t("status.refund") : t("status.zero");
    const claimAmount = Math.abs(stage4);
    return { stage1, stage2, stage3, stage4, result, claimAmount };
  }, [energyElectricity, energyOilGas, inputVat, outputVat, reverseGoodsVat, reverseServicesVat, t]);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!obligationId) {
      setError(t("filings_new.missing_obligation"));
      return;
    }
    try {
      const now = new Date();
      const energyOilGasAmount = readAmount(energyOilGas);
      const energyElectricityAmount = readAmount(energyElectricity);
      const payload = {
        filing_id: uuid(),
        trace_id: uuid(),
        taxpayer_id: taxpayerId,
        cvr_number: "12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        filing_type: "regular",
        submission_timestamp: now.toISOString(),
        contact_reference: "portal-user",
        source_channel: "portal",
        rule_version_id: "DK-VAT-001|DK-VAT-002|DK-VAT-003|DK-VAT-004|DK-VAT-005|DK-VAT-006|DK-VAT-007",
        assessment_version: 1,
        prior_filing_id: null,
        obligation_id: obligationId,
        output_vat_amount_domestic: readAmount(outputVat),
        reverse_charge_output_vat_goods_abroad_amount: readAmount(reverseGoodsVat),
        reverse_charge_output_vat_services_abroad_amount: readAmount(reverseServicesVat),
        input_vat_deductible_amount_total: readAmount(inputVat),
        adjustments_amount: 0,
        rubrik_a_goods_eu_purchase_value: readAmount(rubrikAGoods),
        rubrik_a_services_eu_purchase_value: readAmount(rubrikAServices),
        rubrik_b_services_eu_sale_value: readAmount(rubrikBServices),
        rubrik_c_other_vat_exempt_supplies_value: readAmount(rubrikC),
        rubrik_b_goods_eu_sale_value_reportable: readAmount(rubrikBGoodsReported),
        rubrik_b_goods_eu_sale_value_non_reportable: readAmount(rubrikBGoodsNotReported),
        reimbursement_oil_and_bottled_gas_duty_amount: energyOilGasAmount,
        reimbursement_electricity_duty_amount: energyElectricityAmount,
      };
      const result = await submitFiling(payload, user ?? undefined);
      const assessment = await createAssessmentFromFiling(payload, payload.rule_version_id, user ?? undefined);
      await createClaimFromAssessment(
        {
          taxpayer_id: taxpayerId,
          filing_id: result.resource_id,
          tax_period_end: payload.tax_period_end,
          assessment_version: payload.assessment_version,
          assessment,
        },
        user ?? undefined,
      );
      await submitObligation(obligationId, result.resource_id, user ?? undefined);
      const replay = result.status === 200 && result.idempotent;
      setMessage(
        replay
          ? t("filings_new.replayed", { id: result.resource_id, trace: result.trace_id })
          : t("filings_new.submitted", { id: result.resource_id, trace: result.trace_id }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === "DUPLICATE_FILING") {
          setError(t("filings_new.conflict_duplicate"));
          return;
        }
        if (err.code === "STATE_ERROR") {
          setError(t("filings_new.conflict_state", { message: err.message }));
          return;
        }
      }
      setError(formatApiError(err, t("filings_new.submit_error")));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("filings_new.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("filings_new.description")}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{t("filings_new.negative_hint")}</p>
      {!obligationId ? (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {t("filings_new.missing_obligation")}{" "}
          <Link className="underline" href="/overview">
            {t("filings_new.go_to_overview")}
          </Link>
        </p>
      ) : null}
      {obligationId ? (
        <div className="mt-4 rounded border border-[var(--border)] bg-slate-50 p-3 text-sm">
          <p>
            {t("filings_new.obligation_context")}: <span className="font-medium">{obligationId}</span>
          </p>
          {obligationQuery.data ? (
            <p className="mt-1 text-[var(--muted)]">
              {formatPeriod(obligationQuery.data.tax_period_start, obligationQuery.data.tax_period_end)} | {t("obligations.due_date")}:{" "}
              {formatDateOnly(obligationQuery.data.due_date)}
            </p>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="mt-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
          <section className="space-y-3">
            <h3 className="text-lg font-medium">{t("filings_new.section_domestic")}</h3>
            <AmountField label={t("filings_new.output_vat")} value={outputVat} onChange={setOutputVat} />
            <AmountField label={t("filings_new.input_vat")} value={inputVat} onChange={setInputVat} />
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium">{t("filings_new.section_trade_abroad")}</h3>
            <AmountField label={t("filings_new.reverse_goods_vat")} value={reverseGoodsVat} onChange={setReverseGoodsVat} />
            <AmountField label={t("filings_new.reverse_services_vat")} value={reverseServicesVat} onChange={setReverseServicesVat} />
            <AmountField rubrik="A" label={t("filings_new.rubrik_a_goods")} value={rubrikAGoods} onChange={setRubrikAGoods} />
            <AmountField rubrik="A" label={t("filings_new.rubrik_a_services")} value={rubrikAServices} onChange={setRubrikAServices} />
            <AmountField rubrik="B" label={t("filings_new.rubrik_b_goods_reported")} value={rubrikBGoodsReported} onChange={setRubrikBGoodsReported} />
            <AmountField rubrik="B" label={t("filings_new.rubrik_b_goods_not_reported")} value={rubrikBGoodsNotReported} onChange={setRubrikBGoodsNotReported} />
            <AmountField rubrik="B" label={t("filings_new.rubrik_b_services")} value={rubrikBServices} onChange={setRubrikBServices} />
            <AmountField rubrik="C" label={t("filings_new.rubrik_c")} value={rubrikC} onChange={setRubrikC} />
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium">{t("filings_new.section_energy_refund")}</h3>
            <AmountField label={t("filings_new.energy_oil_gas")} value={energyOilGas} onChange={setEnergyOilGas} />
            <AmountField label={t("filings_new.energy_electricity")} value={energyElectricity} onChange={setEnergyElectricity} />
          </section>

          <button
            className="rounded bg-action px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={!obligationId}
          >
            {t("filings_new.submit")}
          </button>
        </form>

        <aside aria-labelledby="filing-summary-title" className="h-fit rounded border border-[var(--border)] bg-slate-50 p-4">
          <h3 id="filing-summary-title" className="text-base font-semibold">
            {t("filings_new.summary_title")}
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Stage 1</dt>
              <dd>{formatVatAmount(stageSummary.stage1)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Stage 2</dt>
              <dd>{formatVatAmount(stageSummary.stage2)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Stage 3</dt>
              <dd>{formatVatAmount(stageSummary.stage3)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <dt>Stage 4</dt>
              <dd>{formatVatAmount(stageSummary.stage4)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-2">
              <dt>{t("assessments_claims.result")}</dt>
              <dd>{stageSummary.result}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t("assessments_claims.amount")}</dt>
              <dd>{formatVatAmount(stageSummary.claimAmount)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
