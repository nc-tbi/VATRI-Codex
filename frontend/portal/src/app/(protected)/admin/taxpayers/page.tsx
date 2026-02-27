"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { formatApiError } from "@/core/api/error-display";
import { ApiError } from "@/core/api/http";
import {
  amendmentAlter,
  amendmentRedo,
  amendmentUndo,
  filingAlter,
  filingRedo,
  filingUndo,
  getLatestEffectiveRegistrationByTaxpayerId,
  getCadencePolicy,
  getRegistration,
  listAmendments,
  listFilings,
  updateRegistration,
} from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { formatDateOnly, formatPeriod } from "@/core/format/date";
import { useOverlayI18n } from "@/overlays/common/i18n";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BusinessStatus = "active" | "pending" | "inactive";

type RegistrationDraft = {
  taxpayerId: string;
  cvrNumber: string;
  annualTurnoverDkk: string;
  legalName: string;
  tradeName: string;
  effectiveDate: string;
  businessStatus: BusinessStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  countryCode: string;
};

const EMPTY_DRAFT: RegistrationDraft = {
  taxpayerId: "",
  cvrNumber: "",
  annualTurnoverDkk: "0",
  legalName: "",
  tradeName: "",
  effectiveDate: "",
  businessStatus: "active",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  countryCode: "DK",
};

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toBusinessStatus(value: unknown): BusinessStatus {
  return value === "pending" || value === "inactive" ? value : "active";
}

function toDraft(payload: Record<string, unknown>): RegistrationDraft {
  const businessProfile = readRecord(payload.business_profile);
  const contact = readRecord(payload.contact);
  const address = readRecord(payload.address);
  return {
    taxpayerId: readString(payload.taxpayer_id),
    cvrNumber: readString(payload.cvr_number),
    annualTurnoverDkk: String(readNumber(payload.annual_turnover_dkk)),
    legalName: readString(businessProfile?.legal_name),
    tradeName: readString(businessProfile?.trade_name),
    effectiveDate: formatDateOnly(businessProfile?.effective_date),
    businessStatus: toBusinessStatus(businessProfile?.status),
    contactName: readString(contact?.name),
    contactEmail: readString(contact?.email),
    contactPhone: readString(contact?.phone),
    addressLine1: readString(address?.line1),
    addressLine2: readString(address?.line2),
    postalCode: readString(address?.postal_code),
    city: readString(address?.city),
    countryCode: readString(address?.country_code) || "DK",
  };
}

export default function AdminTaxpayersPage() {
  const { user } = useAuth();
  const { t } = useOverlayI18n();
  const [registrationInput, setRegistrationInput] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY_DRAFT);
  const [cadencePreview, setCadencePreview] = useState<string>("");
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [selectedFilingId, setSelectedFilingId] = useState("");
  const [filingField, setFilingField] = useState("contact_reference");
  const [filingValue, setFilingValue] = useState("admin-adjusted");
  const [selectedAmendmentId, setSelectedAmendmentId] = useState("");
  const [amendmentField, setAmendmentField] = useState("delta_classification");
  const [amendmentValue, setAmendmentValue] = useState("increase");
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageResult, setManageResult] = useState<Record<string, unknown> | null>(null);

  const taxpayerId = useMemo(() => draft.taxpayerId.trim(), [draft.taxpayerId]);

  const [filingsQuery, amendmentsQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin-taxpayer", "filings", taxpayerId],
        queryFn: () => listFilings(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["admin-taxpayer", "amendments", taxpayerId],
        queryFn: () => listAmendments(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
    ],
  });

  useEffect(() => {
    if (!selectedFilingId && filingsQuery.data && filingsQuery.data.length > 0) {
      setSelectedFilingId(filingsQuery.data[0].filing_id);
    }
  }, [filingsQuery.data, selectedFilingId]);

  useEffect(() => {
    if (!selectedAmendmentId && amendmentsQuery.data && amendmentsQuery.data.length > 0) {
      setSelectedAmendmentId(amendmentsQuery.data[0].amendment_id);
    }
  }, [amendmentsQuery.data, selectedAmendmentId]);

  const onLookup = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLookupError(null);
    setRegistrationError(null);
    setRegistrationMessage(null);
    setManageError(null);
    setManageMessage(null);
    setManageResult(null);
    const lookupValue = registrationInput.trim();
    if (!lookupValue) return;
    try {
      let payload: Record<string, unknown>;
      if (UUID_RE.test(lookupValue)) {
        payload = await getRegistration(lookupValue, user ?? undefined);
      } else {
        const latest = await getLatestEffectiveRegistrationByTaxpayerId(lookupValue, user ?? undefined);
        const resolvedRegistrationId = typeof latest.registration_id === "string" ? latest.registration_id : null;
        if (!resolvedRegistrationId) {
          setLookupError(t("admin.taxpayers.error"));
          return;
        }
        payload = await getRegistration(resolvedRegistrationId, user ?? undefined);
      }
      setResult(payload);
      const nextDraft = toDraft(payload);
      setDraft(nextDraft);
      setCadencePreview(readString(payload.cadence));
      setSelectedFilingId("");
      setSelectedAmendmentId("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && UUID_RE.test(lookupValue)) {
        try {
          const latest = await getLatestEffectiveRegistrationByTaxpayerId(lookupValue, user ?? undefined);
          const resolvedRegistrationId = typeof latest.registration_id === "string" ? latest.registration_id : null;
          if (!resolvedRegistrationId) {
            setLookupError(t("admin.taxpayers.error"));
            return;
          }
          const payload = await getRegistration(resolvedRegistrationId, user ?? undefined);
          setResult(payload);
          const nextDraft = toDraft(payload);
          setDraft(nextDraft);
          setCadencePreview(readString(payload.cadence));
          setSelectedFilingId("");
          setSelectedAmendmentId("");
          return;
        } catch {
          setLookupError(t("admin.taxpayers.error"));
          return;
        }
      }
      setLookupError(formatApiError(err, t("admin.taxpayers.error")));
    }
  };

  const refreshRegistrationByTaxpayer = async (targetTaxpayerId: string): Promise<Record<string, unknown> | null> => {
    const latest = await getLatestEffectiveRegistrationByTaxpayerId(targetTaxpayerId, user ?? undefined);
    const resolvedRegistrationId = typeof latest.registration_id === "string" ? latest.registration_id : null;
    if (!resolvedRegistrationId) return null;
    return getRegistration(resolvedRegistrationId, user ?? undefined);
  };

  const onCalculateCadence = async (): Promise<void> => {
    setRegistrationError(null);
    const turnover = Number(draft.annualTurnoverDkk);
    if (!Number.isFinite(turnover) || turnover < 0) {
      setRegistrationError(t("admin.taxpayers_new.error"));
      return;
    }
    try {
      const policy = await getCadencePolicy(turnover, user ?? undefined);
      setCadencePreview(readString(policy.cadence));
    } catch (err) {
      setRegistrationError(formatApiError(err, t("admin.cadence.error")));
    }
  };

  const onSaveRegistration = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setRegistrationError(null);
    setRegistrationMessage(null);
    const registrationId = readString(result?.registration_id);
    if (!registrationId) {
      setRegistrationError(t("admin.taxpayers_new.error"));
      return;
    }
    const normalizedTaxpayerId = draft.taxpayerId.trim();
    const normalizedCvr = draft.cvrNumber.trim();
    const turnover = Number(draft.annualTurnoverDkk);
    if (!normalizedTaxpayerId || !normalizedCvr || !Number.isFinite(turnover) || turnover < 0) {
      setRegistrationError(t("admin.taxpayers_new.error"));
      return;
    }
    try {
      const updateResult = await updateRegistration(
        registrationId,
        {
          taxpayer_id: normalizedTaxpayerId,
          cvr_number: normalizedCvr,
          annual_turnover_dkk: turnover,
          business_profile: {
            legal_name: draft.legalName.trim(),
            trade_name: draft.tradeName.trim(),
            ...(draft.effectiveDate ? { effective_date: draft.effectiveDate } : {}),
            status: draft.businessStatus,
          },
          contact: {
            name: draft.contactName.trim(),
            email: draft.contactEmail.trim(),
            phone: draft.contactPhone.trim(),
          },
          address: {
            line1: draft.addressLine1.trim(),
            line2: draft.addressLine2.trim(),
            postal_code: draft.postalCode.trim(),
            city: draft.city.trim(),
            country_code: draft.countryCode.trim().toUpperCase(),
          },
        },
        user ?? undefined,
      );

      const refreshed =
        typeof updateResult.registration_id === "string"
          ? await getRegistration(updateResult.registration_id, user ?? undefined)
          : await refreshRegistrationByTaxpayer(normalizedTaxpayerId);
      if (refreshed) {
        setResult(refreshed);
        setDraft(toDraft(refreshed));
        setCadencePreview(readString(refreshed.cadence));
      }
      setRegistrationMessage(t("admin.taxpayers_new.success", { id: String(updateResult.registration_id ?? t("shared.unknown")) }));
    } catch (err) {
      setRegistrationError(formatApiError(err, t("admin.taxpayers_new.error")));
    }
  };

  const runFilingAction = async (action: "alter" | "undo" | "redo"): Promise<void> => {
    setManageError(null);
    setManageMessage(null);
    setManageResult(null);
    if (user?.role !== "admin") {
      setManageError(t("admin.shared.not_admin"));
      return;
    }
    if (!selectedFilingId) {
      setManageError(t("admin.shared.action_failed"));
      return;
    }
    try {
      const payload =
        action === "alter"
          ? await filingAlter(selectedFilingId, { [filingField]: filingValue }, user ?? undefined)
          : action === "undo"
            ? await filingUndo(selectedFilingId, user ?? undefined)
            : await filingRedo(selectedFilingId, user ?? undefined);
      setManageResult(payload);
      setManageMessage(action === "alter" ? t("admin.shared.action_alter") : action === "undo" ? t("admin.shared.action_undo") : t("admin.shared.action_redo"));
      await filingsQuery.refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 || err.code === "FORBIDDEN") {
          setManageError(t("admin.shared.forbidden"));
          return;
        }
        if (err.status === 409) {
          if (err.code === "STATE_ERROR") {
            setManageError(t("admin.shared.state_error", { message: err.message }));
            return;
          }
          if (err.code === "DUPLICATE_FILING" || err.code === "IDEMPOTENCY_CONFLICT") {
            setManageError(t("admin.shared.conflict"));
            return;
          }
        }
      }
      setManageError(formatApiError(err, t("admin.shared.action_failed")));
    }
  };

  const runAmendmentAction = async (action: "alter" | "undo" | "redo"): Promise<void> => {
    setManageError(null);
    setManageMessage(null);
    setManageResult(null);
    if (user?.role !== "admin") {
      setManageError(t("admin.shared.not_admin"));
      return;
    }
    if (!selectedAmendmentId) {
      setManageError(t("admin.shared.action_failed"));
      return;
    }
    try {
      const payload =
        action === "alter"
          ? await amendmentAlter(selectedAmendmentId, { [amendmentField]: amendmentValue }, user ?? undefined)
          : action === "undo"
            ? await amendmentUndo(selectedAmendmentId, user ?? undefined)
            : await amendmentRedo(selectedAmendmentId, user ?? undefined);
      setManageResult(payload);
      setManageMessage(action === "alter" ? t("admin.shared.action_alter") : action === "undo" ? t("admin.shared.action_undo") : t("admin.shared.action_redo"));
      await amendmentsQuery.refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 || err.code === "FORBIDDEN") {
          setManageError(t("admin.shared.forbidden"));
          return;
        }
        if (err.status === 409) {
          if (err.code === "STATE_ERROR") {
            setManageError(t("admin.shared.state_error", { message: err.message }));
            return;
          }
          if (err.code === "IDEMPOTENCY_CONFLICT") {
            setManageError(t("admin.shared.idempotency_conflict"));
            return;
          }
        }
      }
      setManageError(formatApiError(err, t("admin.shared.action_failed")));
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("admin.taxpayers.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("admin.taxpayers.description")}</p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => void onLookup(e)}>
        <input
          className="w-full max-w-md rounded border px-3 py-2"
          value={registrationInput}
          onChange={(e) => setRegistrationInput(e.target.value)}
          placeholder={t("admin.taxpayers.lookup_placeholder")}
          required
        />
        <button className="rounded bg-action px-4 py-2 text-white" type="submit">
          {t("admin.taxpayers.lookup")}
        </button>
      </form>
      {lookupError ? <p className="mt-4 text-sm text-danger">{lookupError}</p> : null}

      {result ? (
        <div className="mt-6 space-y-4">
          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="font-medium">{t("admin.taxpayers.summary")}</h3>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSaveRegistration(e)}>
              <label>
                <span className="mb-1 block text-sm">{t("shared.taxpayer_id")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.taxpayerId} onChange={(e) => setDraft((prev) => ({ ...prev, taxpayerId: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">CVR</span>
                <input className="w-full rounded border px-3 py-2" value={draft.cvrNumber} onChange={(e) => setDraft((prev) => ({ ...prev, cvrNumber: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.turnover")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.annualTurnoverDkk} onChange={(e) => setDraft((prev) => ({ ...prev, annualTurnoverDkk: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.effective_date")}</span>
                <input className="w-full rounded border px-3 py-2" type="date" value={draft.effectiveDate} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveDate: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.legal_name")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.legalName} onChange={(e) => setDraft((prev) => ({ ...prev, legalName: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.trade_name")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.tradeName} onChange={(e) => setDraft((prev) => ({ ...prev, tradeName: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.status")}</span>
                <select className="w-full rounded border px-3 py-2" value={draft.businessStatus} onChange={(e) => setDraft((prev) => ({ ...prev, businessStatus: toBusinessStatus(e.target.value) }))}>
                  <option value="active">{t("admin.taxpayers_new.status_active")}</option>
                  <option value="pending">{t("admin.taxpayers_new.status_pending")}</option>
                  <option value="inactive">{t("admin.taxpayers_new.status_inactive")}</option>
                </select>
              </label>
              <div className="rounded border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm">
                <p>
                  {t("obligations.cadence")}: <span className="font-medium">{readString(result.cadence) || "-"}</span>
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  {t("admin.cadence.calculate")}: <span className="font-medium">{cadencePreview || "-"}</span>
                </p>
              </div>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.contact_name")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.contactName} onChange={(e) => setDraft((prev) => ({ ...prev, contactName: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.contact_email")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.contactEmail} onChange={(e) => setDraft((prev) => ({ ...prev, contactEmail: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.contact_phone")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.contactPhone} onChange={(e) => setDraft((prev) => ({ ...prev, contactPhone: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.address_line_1")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.addressLine1} onChange={(e) => setDraft((prev) => ({ ...prev, addressLine1: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.address_line_2")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.addressLine2} onChange={(e) => setDraft((prev) => ({ ...prev, addressLine2: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.postal_code")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.postalCode} onChange={(e) => setDraft((prev) => ({ ...prev, postalCode: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.city")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.city} onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))} />
              </label>
              <label>
                <span className="mb-1 block text-sm">{t("admin.taxpayers_new.country_code")}</span>
                <input className="w-full rounded border px-3 py-2" value={draft.countryCode} onChange={(e) => setDraft((prev) => ({ ...prev, countryCode: e.target.value }))} />
              </label>
              <div className="col-span-full flex flex-wrap gap-2">
                <button className="rounded bg-slate-700 px-4 py-2 text-white" type="button" onClick={() => void onCalculateCadence()}>
                  {t("admin.cadence.calculate")}
                </button>
                <button className="rounded bg-action px-4 py-2 text-white" type="submit">
                  Save registration changes
                </button>
              </div>
            </form>
            {registrationMessage ? <p className="mt-3 text-sm text-success">{registrationMessage}</p> : null}
            {registrationError ? <p className="mt-3 text-sm text-danger">{registrationError}</p> : null}
          </article>

          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="font-medium">{t("submissions.filings")}</h3>
            {filingsQuery.isLoading ? <p className="mt-2 text-sm">{t("shared.loading")}</p> : null}
            {filingsQuery.error ? <p className="mt-2 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
            <ul className="mt-3 space-y-2 text-sm">
              {(filingsQuery.data ?? []).map((filing) => (
                <li key={filing.filing_id} className="rounded border border-[var(--border)] p-3">
                  <p className="font-medium">
                    <Link className="underline" href={`/submissions/${encodeURIComponent(filing.filing_id)}`}>
                      {t("shared.vat_return_period", { period: formatPeriod(filing.tax_period_start, filing.tax_period_end) })}
                    </Link>
                  </p>
                  <p className="text-[var(--muted)]">
                    {t("obligations.status")}: {readString(filing.state) || t("shared.unknown")}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
              <select className="rounded border px-3 py-2" value={selectedFilingId} onChange={(e) => setSelectedFilingId(e.target.value)}>
                <option value="">{t("admin.shared.filing_id")}</option>
                {(filingsQuery.data ?? []).map((filing) => (
                  <option key={filing.filing_id} value={filing.filing_id}>
                    {filing.filing_id}
                  </option>
                ))}
              </select>
              <input className="rounded border px-3 py-2" placeholder={t("admin.shared.field")} value={filingField} onChange={(e) => setFilingField(e.target.value)} />
              <input className="rounded border px-3 py-2" placeholder={t("admin.shared.value")} value={filingValue} onChange={(e) => setFilingValue(e.target.value)} />
              <button className="rounded bg-action px-3 py-2 text-white" type="button" onClick={() => void runFilingAction("alter")}>
                {t("admin.shared.action_alter")}
              </button>
              <button className="rounded bg-slate-700 px-3 py-2 text-white" type="button" onClick={() => void runFilingAction("undo")}>
                {t("admin.shared.action_undo")}
              </button>
              <button className="rounded bg-slate-700 px-3 py-2 text-white" type="button" onClick={() => void runFilingAction("redo")}>
                {t("admin.shared.action_redo")}
              </button>
            </div>
          </article>

          <article className="rounded border border-[var(--border)] p-4">
            <h3 className="font-medium">{t("submissions.amendments")}</h3>
            {amendmentsQuery.isLoading ? <p className="mt-2 text-sm">{t("shared.loading")}</p> : null}
            {amendmentsQuery.error ? <p className="mt-2 text-sm text-danger">{t("shared.fetch_error")}</p> : null}
            <ul className="mt-3 space-y-2 text-sm">
              {(amendmentsQuery.data ?? []).map((amendment) => (
                <li key={amendment.amendment_id} className="rounded border border-[var(--border)] p-3">
                  <p className="font-medium">
                    {amendment.original_filing_id ? (
                      <Link className="underline" href={`/submissions/${encodeURIComponent(amendment.original_filing_id)}`}>
                        {t("shared.amendment_period", { period: formatPeriod(undefined, amendment.tax_period_end) })}
                      </Link>
                    ) : (
                      t("shared.amendment_period", { period: formatPeriod(undefined, amendment.tax_period_end) })
                    )}
                  </p>
                  <p className="text-[var(--muted)]">{String(amendment.delta_classification ?? t("shared.unknown"))}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
              <select className="rounded border px-3 py-2" value={selectedAmendmentId} onChange={(e) => setSelectedAmendmentId(e.target.value)}>
                <option value="">{t("admin.shared.amendment_id")}</option>
                {(amendmentsQuery.data ?? []).map((amendment) => (
                  <option key={amendment.amendment_id} value={amendment.amendment_id}>
                    {amendment.amendment_id}
                  </option>
                ))}
              </select>
              <input className="rounded border px-3 py-2" placeholder={t("admin.shared.field")} value={amendmentField} onChange={(e) => setAmendmentField(e.target.value)} />
              <input className="rounded border px-3 py-2" placeholder={t("admin.shared.value")} value={amendmentValue} onChange={(e) => setAmendmentValue(e.target.value)} />
              <button className="rounded bg-action px-3 py-2 text-white" type="button" onClick={() => void runAmendmentAction("alter")}>
                {t("admin.shared.action_alter")}
              </button>
              <button className="rounded bg-slate-700 px-3 py-2 text-white" type="button" onClick={() => void runAmendmentAction("undo")}>
                {t("admin.shared.action_undo")}
              </button>
              <button className="rounded bg-slate-700 px-3 py-2 text-white" type="button" onClick={() => void runAmendmentAction("redo")}>
                {t("admin.shared.action_redo")}
              </button>
            </div>
          </article>

          {manageMessage ? <p className="text-sm text-success">{manageMessage}</p> : null}
          {manageError ? <p className="text-sm text-danger">{manageError}</p> : null}
          {manageResult ? <pre className="overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(manageResult, null, 2)}</pre> : null}

          <details className="rounded border border-[var(--border)] p-4">
            <summary className="cursor-pointer font-medium">{t("admin.taxpayers.raw_payload")}</summary>
            <pre className="mt-4 overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
