"use client";

import { FormEvent, useState } from "react";
import { formatApiError } from "@/core/api/error-display";
import { createRegistration } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function AdminTaxpayersNewPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [taxpayerId, setTaxpayerId] = useState("");
  const [cvr, setCvr] = useState("12345678");
  const [turnover, setTurnover] = useState("50000");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"active" | "pending" | "inactive">("active");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("DK");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await createRegistration(
        {
          taxpayer_id: taxpayerId,
          cvr_number: cvr,
          annual_turnover_dkk: Number(turnover),
          business_profile: {
            legal_name: legalName,
            trade_name: tradeName || undefined,
            effective_date: effectiveDate,
            status,
          },
          contact: {
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
          },
          address: {
            line1: addressLine1,
            line2: addressLine2 || undefined,
            postal_code: postalCode,
            city,
            country_code: countryCode,
          },
        },
        user ?? undefined
      );
      setMessage(t("admin.taxpayers_new.success", { id: String(res.registration_id ?? t("shared.unknown")) }));
    } catch (err) {
      setError(formatApiError(err, t("admin.taxpayers_new.error")));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("admin.taxpayers_new.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("admin.taxpayers_new.description")}</p>
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
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.legal_name")}</span>
          <input className="w-full rounded border px-3 py-2" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.trade_name")}</span>
          <input className="w-full rounded border px-3 py-2" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.effective_date")}</span>
          <input className="w-full rounded border px-3 py-2" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.status")}</span>
          <select className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as "active" | "pending" | "inactive")}>
            <option value="active">{t("admin.taxpayers_new.status_active")}</option>
            <option value="pending">{t("admin.taxpayers_new.status_pending")}</option>
            <option value="inactive">{t("admin.taxpayers_new.status_inactive")}</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.contact_name")}</span>
          <input className="w-full rounded border px-3 py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.contact_email")}</span>
          <input className="w-full rounded border px-3 py-2" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.contact_phone")}</span>
          <input className="w-full rounded border px-3 py-2" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.address_line_1")}</span>
          <input className="w-full rounded border px-3 py-2" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.address_line_2")}</span>
          <input className="w-full rounded border px-3 py-2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.postal_code")}</span>
          <input className="w-full rounded border px-3 py-2" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.city")}</span>
          <input className="w-full rounded border px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t("admin.taxpayers_new.country_code")}</span>
          <input className="w-full rounded border px-3 py-2" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} required />
        </label>
        <button className="col-span-full rounded bg-action px-4 py-2 text-white" type="submit">
          {t("admin.taxpayers_new.create")}
        </button>
      </form>
    </section>
  );
}
