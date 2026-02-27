"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFiling, listAmendments } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { formatVatAmount } from "@/core/format/amount";
import { formatPeriod } from "@/core/format/date";
import { useOverlayI18n } from "@/overlays/common/i18n";

type VatField = {
  key: string;
  labelKey: string;
  rubrik?: string;
};

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

export default function SubmissionDetailsPage() {
  const params = useParams<{ filingId: string }>();
  const filingId = params?.filingId ?? "";
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);

  const filingQuery = useQuery({
    queryKey: ["submission", "filing", filingId, taxpayerId],
    queryFn: () => getFiling(filingId, user ?? undefined),
    enabled: Boolean(filingId && taxpayerId),
  });

  const amendmentQuery = useQuery({
    queryKey: ["submission", "amendments", filingId, taxpayerId],
    queryFn: async () => {
      const amendments = await listAmendments(taxpayerId, undefined, user ?? undefined);
      return amendments.filter((entry) => entry.original_filing_id === filingId);
    },
    enabled: Boolean(filingId && taxpayerId),
  });

  const filing = filingQuery.data;
  const amendments = amendmentQuery.data ?? [];
  const period = formatPeriod(filing?.tax_period_start, filing?.tax_period_end);

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("shared.vat_return_period", { period })}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("submissions.filing_details_description")}</p>
      {filingQuery.isLoading ? <p className="mt-4 text-sm">{t("shared.loading")}</p> : null}
      {filingQuery.error ? <p className="mt-4 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
      {filing ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="text-lg font-medium">{t("submissions.original_filing")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("submissions.original_read_only")}</p>
            <div className="mt-4 space-y-6">
              {SECTION_FIELDS.map((section) => (
                <section key={section.titleKey} className="space-y-3">
                  <h4 className="text-base font-medium">{t(section.titleKey)}</h4>
                  {section.fields.map((field) => (
                    <div key={field.key} className="grid grid-cols-[1fr_140px_36px] items-center gap-3 rounded border border-[var(--border)] px-3 py-2 text-sm">
                      <span>
                        {field.rubrik ? <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{field.rubrik}</span> : null}
                        {t(field.labelKey)}
                      </span>
                      <span className="rounded border border-[var(--border)] bg-slate-50 px-3 py-2 text-right">
                        {formatVatAmount(filing[field.key])}
                      </span>
                      <span className="text-[var(--muted)]">kr.</span>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </article>

          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="text-lg font-medium">{t("submissions.amendments_for_filing")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("submissions.amendments_description")}</p>
            {amendmentQuery.isLoading ? <p className="mt-3 text-sm">{t("shared.loading")}</p> : null}
            {amendmentQuery.error ? <p className="mt-3 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
            <ul className="mt-3 space-y-2 text-sm">
              {amendments.map((amendment) => (
                <li key={amendment.amendment_id} className="rounded border border-[var(--border)] p-3">
                  <p className="font-medium">
                    {t("shared.amendment_period", { period: formatPeriod(undefined, amendment.tax_period_end) })}
                  </p>
                  <p className="text-[var(--muted)]">{String(amendment.delta_classification)}</p>
                </li>
              ))}
            </ul>
            <Link className="mt-4 inline-block rounded bg-action px-4 py-2 text-sm text-white" href={`/amendments/new?original_filing_id=${encodeURIComponent(filingId)}`}>
              {t("submissions.create_amendment")}
            </Link>
          </article>
        </div>
      ) : null}
    </section>
  );
}
