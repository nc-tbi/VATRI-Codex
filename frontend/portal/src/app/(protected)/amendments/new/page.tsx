"use client";

import { FormEvent, useMemo, useState } from "react";
import { submitAmendment } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";

export default function NewAmendmentPage(): JSX.Element {
  const { user } = useAuth();
  const taxpayerId = useMemo(() => user?.taxpayer_scope ?? "TXP-12345678", [user]);
  const [originalFilingId, setOriginalFilingId] = useState("");
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
      setMessage(`Ændring indsendt. Amendment ID: ${String((result as { amendment?: { amendment_id?: string } }).amendment?.amendment_id ?? "ukendt")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indsendelse fejlede.");
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">Ny ændringsangivelse</h2>
      <p className="mt-2 text-[var(--muted)]">Vælg tidligere indsendelse og indtast korrektioner.</p>
      {message ? <p className="mt-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
        <label className="block"><span className="mb-1 block text-sm">Original filing ID</span><input className="w-full rounded border px-3 py-2" value={originalFilingId} onChange={(e) => setOriginalFilingId(e.target.value)} required /></label>
        <label className="block"><span className="mb-1 block text-sm">Nyt nettoresultat (DKK)</span><input className="w-full rounded border px-3 py-2" value={newNet} onChange={(e) => setNewNet(e.target.value)} /></label>
        <button className="col-span-full rounded bg-action px-4 py-2 text-white" type="submit">Indsend ændring</button>
      </form>
    </section>
  );
}

