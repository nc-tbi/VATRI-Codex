"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { listAmendments, listFilings } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";

export default function SubmissionsPage(): JSX.Element {
  const { user } = useAuth();
  const [taxpayerInput, setTaxpayerInput] = useState(user?.taxpayer_scope ?? "");
  const taxpayerId = useMemo(() => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerInput), [taxpayerInput, user]);

  const [filingsQuery, amendmentsQuery] = useQueries({
    queries: [
      {
        queryKey: ["submissions", "filings", taxpayerId],
        queryFn: () => listFilings(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["submissions", "amendments", taxpayerId],
        queryFn: () => listAmendments(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
    ],
  });

  return (
    <section>
      <h2 className="text-2xl font-semibold">Indsendelser</h2>
      {user?.role === "admin" ? (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-sm">Taxpayer ID</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerInput} onChange={(e) => setTaxpayerInput(e.target.value)} />
        </label>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article>
          <h3 className="font-medium">Filings</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(filingsQuery.data ?? []).map((f) => (
              <li key={String(f.filing_id)} className="rounded border p-3">{String(f.filing_id)} - {String(f.state ?? "unknown")}</li>
            ))}
          </ul>
        </article>
        <article>
          <h3 className="font-medium">Amendments</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(amendmentsQuery.data ?? []).map((a) => (
              <li key={String(a.amendment_id)} className="rounded border p-3">{String(a.amendment_id)} - {String(a.delta_classification ?? "unknown")}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

