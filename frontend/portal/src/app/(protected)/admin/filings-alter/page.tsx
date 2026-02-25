"use client";

import { FormEvent, useState } from "react";
import { filingAlter, filingRedo, filingUndo } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { ApiError } from "@/core/api/http";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function AdminFilingsAlterPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [filingId, setFilingId] = useState("");
  const [field, setField] = useState("contact_reference");
  const [value, setValue] = useState("admin-adjusted");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "alter" | "undo" | "redo", e: FormEvent): Promise<void> => {
    e.preventDefault();
    setResult(null);
    setError(null);
    if (user?.role !== "admin") {
      setError(t("admin.shared.not_admin"));
      return;
    }
    try {
      const payload =
        action === "alter"
          ? await filingAlter(filingId, { [field]: value }, user ?? undefined)
          : action === "undo"
            ? await filingUndo(filingId, user ?? undefined)
            : await filingRedo(filingId, user ?? undefined);
      setResult(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 || err.code === "FORBIDDEN") {
          setError(t("admin.shared.forbidden"));
          return;
        }
        if (err.status === 409) {
          if (err.code === "STATE_ERROR") {
            setError(t("admin.shared.state_error", { message: err.message }));
            return;
          }
          if (err.code === "DUPLICATE_FILING" || err.code === "IDEMPOTENCY_CONFLICT") {
            setError(t("admin.shared.conflict"));
            return;
          }
        }
      }
      setError(err instanceof Error ? err.message : t("admin.shared.action_failed"));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("admin.filings_alter.title")}</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" placeholder={t("admin.shared.filing_id")} value={filingId} onChange={(e) => setFilingId(e.target.value)} />
        <input className="rounded border px-3 py-2" placeholder={t("admin.shared.field")} value={field} onChange={(e) => setField(e.target.value)} />
        <input className="rounded border px-3 py-2" placeholder={t("admin.shared.value")} value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="col-span-full flex gap-2">
          <button className="rounded bg-action px-4 py-2 text-white" onClick={(e) => void run("alter", e)}>
            {t("admin.shared.action_alter")}
          </button>
          <button className="rounded bg-slate-700 px-4 py-2 text-white" onClick={(e) => void run("undo", e)}>
            {t("admin.shared.action_undo")}
          </button>
          <button className="rounded bg-slate-700 px-4 py-2 text-white" onClick={(e) => void run("redo", e)}>
            {t("admin.shared.action_redo")}
          </button>
        </div>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {result ? <pre className="mt-4 overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}
