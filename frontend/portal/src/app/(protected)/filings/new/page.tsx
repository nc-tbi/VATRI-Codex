"use client";

import { FormEvent, useMemo, useState } from "react";
import { submitFiling } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { ApiError } from "@/core/api/http";

function uuid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function NewFilingPage() {
  const { user } = useAuth();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);
  const [outputVat, setOutputVat] = useState("0");
  const [inputVat, setInputVat] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const now = new Date();
      const payload = {
        filing_id: uuid(),
        taxpayer_id: taxpayerId,
        cvr_number: "12345678",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        filing_type: "regular",
        submission_timestamp: now.toISOString(),
        contact_reference: "portal-user",
        source_channel: "portal",
        rule_version_id: "DK-VAT-001|DK-VAT-002|DK-VAT-003|DK-VAT-004|DK-VAT-005|DK-VAT-006|DK-VAT-007",
        assessment_version: 1,
        prior_filing_id: null,
        output_vat_amount_domestic: Number(outputVat),
        reverse_charge_output_vat_goods_abroad_amount: 0,
        reverse_charge_output_vat_services_abroad_amount: 0,
        input_vat_deductible_amount_total: Number(inputVat),
        adjustments_amount: 0,
        rubrik_a_goods_eu_purchase_value: 0,
        rubrik_a_services_eu_purchase_value: 0,
        rubrik_b_goods_eu_sale_value: 0,
        rubrik_b_services_eu_sale_value: 0,
        rubrik_c_other_vat_exempt_supplies_value: 0,
      };
      const result = await submitFiling(payload, user ?? undefined);
      const replay = result.status === 200 && result.idempotent;
      setMessage(
        replay
          ? `Allerede indsendt. Eksisterende filing: ${result.resource_id} (trace_id: ${result.trace_id})`
          : `Indsendt. Filing ID: ${result.resource_id} (trace_id: ${result.trace_id})`
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === "DUPLICATE_FILING") {
          setError("Konflikt: denne filing_id findes allerede med andet indhold.");
          return;
        }
        if (err.code === "STATE_ERROR") {
          setError(`Tilstandsfejl: ${err.message}`);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Indsendelse fejlede.");
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">Ny momsangivelse</h2>
      <p className="mt-2 text-[var(--muted)]">DK overlay formular med indsendelse til filing-service.</p>
      {message ? <p className="mt-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
        <label className="block"><span className="mb-1 block text-sm">Output VAT (DKK)</span><input className="w-full rounded border px-3 py-2" value={outputVat} onChange={(e) => setOutputVat(e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm">Input VAT deductible (DKK)</span><input className="w-full rounded border px-3 py-2" value={inputVat} onChange={(e) => setInputVat(e.target.value)} /></label>
        <button className="col-span-full rounded bg-action px-4 py-2 text-white" type="submit">Indsend</button>
      </form>
    </section>
  );
}


