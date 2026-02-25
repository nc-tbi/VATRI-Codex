"use client";

import { FormEvent, useState } from "react";
import { filingAlter, filingRedo, filingUndo } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";
import { ApiError } from "@/core/api/http";

export default function AdminFilingsAlterPage() {
  const { user } = useAuth();
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
      setError("Adgang naegtet: rollen er ikke admin.");
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
          setError("Adgang naegtet: kun admin maa aendre/undo/redo filings.");
          return;
        }
        if (err.status === 409) {
          if (err.code === "STATE_ERROR") {
            setError(`Tilstandsfejl: ${err.message}`);
            return;
          }
          if (err.code === "DUPLICATE_FILING" || err.code === "IDEMPOTENCY_CONFLICT") {
            setError("Konflikt: handlingen kunne ikke gennemfoeres pga. modstridende data.");
            return;
          }
        }
      }
      setError(err instanceof Error ? err.message : "Handling fejlede");
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">Admin: Filing alter/undo/redo</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" placeholder="filing_id" value={filingId} onChange={(e) => setFilingId(e.target.value)} />
        <input className="rounded border px-3 py-2" placeholder="field" value={field} onChange={(e) => setField(e.target.value)} />
        <input className="rounded border px-3 py-2" placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="col-span-full flex gap-2">
          <button className="rounded bg-action px-4 py-2 text-white" onClick={(e) => void run("alter", e)}>Alter</button>
          <button className="rounded bg-slate-700 px-4 py-2 text-white" onClick={(e) => void run("undo", e)}>Undo</button>
          <button className="rounded bg-slate-700 px-4 py-2 text-white" onClick={(e) => void run("redo", e)}>Redo</button>
        </div>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {result ? <pre className="mt-4 overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}


