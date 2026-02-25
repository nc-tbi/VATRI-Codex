"use client";

import { FormEvent, useState } from "react";
import { getCadencePolicy } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";

export default function AdminCadencePage(): JSX.Element {
  const { user } = useAuth();
  const [turnover, setTurnover] = useState("50000");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const payload = await getCadencePolicy(Number(turnover), user ?? undefined);
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kadenceopslag fejlede");
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold">Admin: Kadence</h2>
      <p className="mt-2 text-[var(--muted)]">Beregn gældende kadence fra omsætning.</p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => void onSubmit(e)}>
        <input className="w-full max-w-sm rounded border px-3 py-2" value={turnover} onChange={(e) => setTurnover(e.target.value)} />
        <button className="rounded bg-action px-4 py-2 text-white" type="submit">Beregn</button>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {result ? <pre className="mt-4 overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}

