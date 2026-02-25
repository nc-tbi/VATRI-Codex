"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listObligations } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function ObligationsPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerIdInput, setTaxpayerIdInput] = useState(user?.taxpayer_scope ?? "");
  const taxpayerId = useMemo(() => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerIdInput), [taxpayerIdInput, user]);

  const query = useQuery({
    queryKey: ["obligations", taxpayerId],
    queryFn: () => listObligations(taxpayerId, user ?? undefined),
    enabled: Boolean(taxpayerId),
  });
  const statusLabel = (status: string): string => {
    const key = `status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("obligations.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("obligations.description")}</p>
      {user?.role === "admin" ? (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerIdInput} onChange={(e) => setTaxpayerIdInput(e.target.value)} />
        </label>
      ) : null}
      {query.isLoading ? <p className="mt-4 text-sm">{t("shared.loading")}</p> : null}
      {query.error ? <p className="mt-4 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">{t("obligations.period")}</th>
            <th className="py-2 text-left">{t("obligations.due_date")}</th>
            <th className="py-2 text-left">{t("obligations.cadence")}</th>
            <th className="py-2 text-left">{t("obligations.status")}</th>
          </tr>
        </thead>
        <tbody>
          {(query.data ?? []).map((obl) => (
            <tr className="border-b" key={obl.obligation_id}>
              <td className="py-2">
                {obl.tax_period_start} - {obl.tax_period_end}
              </td>
              <td className="py-2">{obl.due_date}</td>
              <td className="py-2">{obl.cadence}</td>
              <td className="py-2">{statusLabel(obl.state)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
