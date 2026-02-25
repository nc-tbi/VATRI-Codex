"use client";

import { FormEvent, useState } from "react";
import { amendmentAlter, amendmentRedo, amendmentUndo } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";

export default function AdminAmendmentsAlterPage() {
  const { user } = useAuth();
  const [amendmentId, setAmendmentId] = useState("");
  const [field, setField] = useState("delta_classification");
  const [value, setValue] = useState("increase");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "alter" | "undo" | "redo", e: FormEvent): Promise<void> => {
    e.preventDefault();
    setResult(null);
    setError(null);
    try {
      const payload =
        action === "alter"
          ? await amendmentAlter(amendmentId, { [field]: value }, user ?? undefined)
          : action === "undo"
            ? await amendmentUndo(amendmentId, user ?? undefined)
            : await amendmentRedo(amendmentId, user ?? undefined);
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handling fejlede");
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">Admin: Amendment alter/undo/redo</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" placeholder="amendment_id" value={amendmentId} onChange={(e) => setAmendmentId(e.target.value)} />
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


