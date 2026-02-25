"use client";

import { FormEvent, useState } from "react";
import { getRegistration } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function AdminTaxpayersPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [registrationId, setRegistrationId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onLookup = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setResult(null);
    setError(null);
    try {
      const payload = await getRegistration(registrationId, user ?? undefined);
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.taxpayers.error"));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("admin.taxpayers.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("admin.taxpayers.description")}</p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => void onLookup(e)}>
        <input
          className="w-full max-w-md rounded border px-3 py-2"
          value={registrationId}
          onChange={(e) => setRegistrationId(e.target.value)}
          placeholder={t("admin.taxpayers.lookup_placeholder")}
        />
        <button className="rounded bg-action px-4 py-2 text-white" type="submit">
          {t("admin.taxpayers.lookup")}
        </button>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {result ? <pre className="mt-4 overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}
