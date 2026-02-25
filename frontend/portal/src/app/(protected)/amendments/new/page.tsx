"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { submitAmendment } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { ApiError } from "@/core/api/http";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function NewAmendmentPage() {
  const searchParams = useSearchParams();
  const filingFromContext = searchParams.get("original_filing_id") ?? "";
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);
  const [originalFilingId, setOriginalFilingId] = useState(filingFromContext);
  const [newNet, setNewNet] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const now = new Date().toISOString();
      const body = {
        original_filing_id: originalFilingId,
        taxpayer_id: taxpayerId,
        original_assessment: {
          filing_id: originalFilingId,
          trace_id: "portal-amendment",
          rule_version_id: "DK-VAT-001",
          assessed_at: now,
          stage4_net_vat: 0,
          result_type: "zero",
          claim_amount: 0,
        },
        new_assessment: {
          filing_id: originalFilingId,
          trace_id: "portal-amendment",
          rule_version_id: "DK-VAT-001",
          assessed_at: now,
          stage4_net_vat: Number(newNet),
          result_type: Number(newNet) > 0 ? "payable" : Number(newNet) < 0 ? "refund" : "zero",
          claim_amount: Math.abs(Number(newNet)),
        },
      };
      const result = await submitAmendment(body, user ?? undefined);
      const replay = result.status === 200 && result.idempotent;
      setMessage(replay ? t("amendments_new.replayed", { id: result.resource_id, trace: result.trace_id }) : t("amendments_new.submitted", { id: result.resource_id, trace: result.trace_id }));
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
      setError(err instanceof Error ? err.message : t("amendments_new.submit_error"));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("amendments_new.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("amendments_new.description")}</p>
      {filingFromContext ? <p className="mt-4 rounded border border-[var(--border)] bg-slate-50 p-3 text-sm">{t("amendments_new.source_context", { id: filingFromContext })}</p> : null}
      {message ? <p className="mt-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
        <label className="block">
          <span className="mb-1 block text-sm">{t("amendments_new.original_filing_id")}</span>
          <input className="w-full rounded border px-3 py-2" value={originalFilingId} onChange={(e) => setOriginalFilingId(e.target.value)} required readOnly={Boolean(filingFromContext)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">{t("amendments_new.new_net_result")}</span>
          <input className="w-full rounded border px-3 py-2" value={newNet} onChange={(e) => setNewNet(e.target.value)} />
        </label>
        <button className="col-span-full rounded bg-action px-4 py-2 text-white" type="submit">
          {t("amendments_new.submit")}
        </button>
      </form>
    </section>
  );
}
