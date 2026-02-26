"use client";

import { FormEvent, useState } from "react";
import { formatApiError } from "@/core/api/error-display";
import { ApiError } from "@/core/api/http";
import { findRegistrationsByTaxpayerId, getRegistration } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

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
    const lookupValue = registrationId.trim();
    if (!lookupValue) return;
    try {
      const payload = await getRegistration(lookupValue, user ?? undefined);
      setResult(payload);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          const matches = await findRegistrationsByTaxpayerId(lookupValue, user ?? undefined);
          const first = matches[0];
          const resolvedRegistrationId = typeof first?.registration_id === "string" ? first.registration_id : null;
          if (!resolvedRegistrationId) {
            setError(formatApiError(err, t("admin.taxpayers.error")));
            return;
          }
          const payload = await getRegistration(resolvedRegistrationId, user ?? undefined);
          setResult(payload);
          return;
        } catch {
          setError(formatApiError(err, t("admin.taxpayers.error")));
          return;
        }
      }
      setError(formatApiError(err, t("admin.taxpayers.error")));
    }
  };

  const businessProfile = readRecord(result?.business_profile);
  const contact = readRecord(result?.contact);
  const address = readRecord(result?.address);

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
          required
        />
        <button className="rounded bg-action px-4 py-2 text-white" type="submit">
          {t("admin.taxpayers.lookup")}
        </button>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {result ? (
        <div className="mt-6 space-y-4">
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="font-medium">{t("admin.taxpayers.summary")}</h3>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">{t("shared.taxpayer_id")}</dt>
                <dd>{readString(result.taxpayer_id) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">CVR</dt>
                <dd>{readString(result.cvr_number) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.turnover")}</dt>
                <dd>{String(result.annual_turnover_dkk ?? "-")}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.effective_date")}</dt>
                <dd>{readString(businessProfile?.effective_date) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.status")}</dt>
                <dd>{readString(businessProfile?.status) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.legal_name")}</dt>
                <dd>{readString(businessProfile?.legal_name) || "-"}</dd>
              </div>
            </dl>
          </article>
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="font-medium">{t("admin.taxpayers.contact")}</h3>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.contact_name")}</dt>
                <dd>{readString(contact?.name) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.contact_email")}</dt>
                <dd>{readString(contact?.email) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.contact_phone")}</dt>
                <dd>{readString(contact?.phone) || "-"}</dd>
              </div>
            </dl>
          </article>
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="font-medium">{t("admin.taxpayers.address")}</h3>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.address_line_1")}</dt>
                <dd>{readString(address?.line1) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.address_line_2")}</dt>
                <dd>{readString(address?.line2) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.postal_code")}</dt>
                <dd>{readString(address?.postal_code) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.city")}</dt>
                <dd>{readString(address?.city) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("admin.taxpayers_new.country_code")}</dt>
                <dd>{readString(address?.country_code) || "-"}</dd>
              </div>
            </dl>
          </article>
          <details className="rounded border border-[var(--border)] p-4">
            <summary className="cursor-pointer font-medium">{t("admin.taxpayers.raw_payload")}</summary>
            <pre className="mt-4 overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
