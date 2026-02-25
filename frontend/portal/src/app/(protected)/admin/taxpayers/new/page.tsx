"use client";

import { FormEvent, useState } from "react";
import { createRegistration } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function AdminTaxpayersNewPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerId, setTaxpayerId] = useState("");
  const [cvr, setCvr] = useState("12345678");
  const [turnover, setTurnover] = useState("50000");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await createRegistration({ taxpayer_id: taxpayerId, cvr_number: cvr, annual_turnover_dkk: Number(turnover) }, user ?? undefined);
      setMessage(t("admin.taxpayers_new.success", { id: String(res.registration_id ?? t("shared.unknown")) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.taxpayers_new.error"));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("admin.taxpayers_new.title")}</h2>
      {message ? <p className="mt-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
        <label>
          <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
          <input className="w-full rounded border px-3 py-2" value={taxpayerId} onChange={(e) => setTaxpayerId(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">CVR</span>
          <input className="w-full rounded border px-3 py-2" value={cvr} onChange={(e) => setCvr(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.turnover")}</span>
          <input className="w-full rounded border px-3 py-2" value={turnover} onChange={(e) => setTurnover(e.target.value)} required />
        </label>
        <button className="col-span-full rounded bg-action px-4 py-2 text-white" type="submit">
          {t("admin.taxpayers_new.create")}
        </button>
      </form>
    </section>
  );
}
