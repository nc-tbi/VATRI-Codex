"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listAmendments, listFilings } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function SubmissionDetailsPage() {
  const params = useParams<{ filingId: string }>();
  const filingId = params?.filingId ?? "";
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);

  const filingQuery = useQuery({
    queryKey: ["submission", "filing", filingId, taxpayerId],
    queryFn: async () => {
      const filings = await listFilings(taxpayerId, undefined, user ?? undefined);
      return filings.find((entry) => entry.filing_id === filingId) ?? null;
    },
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
  const netVat = readNumber(filing?.output_vat_amount_domestic) + readNumber(filing?.reverse_charge_output_vat_goods_abroad_amount) + readNumber(filing?.reverse_charge_output_vat_services_abroad_amount) - readNumber(filing?.input_vat_deductible_amount_total) + readNumber(filing?.adjustments_amount);

  return (
    <section>
      <h2 className="text-2xl font-semibold">
        {t("submissions.filing_details")}: {filingId}
      </h2>
      <p className="mt-2 text-[var(--muted)]">{t("submissions.filing_details_description")}</p>
      {filingQuery.isLoading ? <p className="mt-4 text-sm">{t("shared.loading")}</p> : null}
      {filingQuery.error ? <p className="mt-4 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
      {filing ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="text-lg font-medium">{t("submissions.original_filing")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("submissions.original_read_only")}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>{t("filings_new.output_vat")}</dt>
                <dd>{String(filing.output_vat_amount_domestic ?? 0)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t("filings_new.input_vat")}</dt>
                <dd>{String(filing.input_vat_deductible_amount_total ?? 0)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2 font-medium">
                <dt>{t("submissions.net_vat_result")}</dt>
                <dd>{String(netVat)}</dd>
              </div>
            </dl>
          </article>
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="text-lg font-medium">{t("submissions.amendments_for_filing")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("submissions.amendments_description")}</p>
            {amendmentQuery.isLoading ? <p className="mt-3 text-sm">{t("shared.loading")}</p> : null}
            {amendmentQuery.error ? <p className="mt-3 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
            <ul className="mt-3 space-y-2 text-sm">
              {amendments.map((amendment) => (
                <li key={amendment.amendment_id} className="rounded border border-[var(--border)] p-3">
                  <p className="font-medium">{amendment.amendment_id}</p>
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
