"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { listAssessments, listClaims } from "@/core/api/tax-core";
import { useAuth } from "@/core/auth/context";

export default function AssessmentsClaimsPage() {
  const { user } = useAuth();
  const [taxpayerInput, setTaxpayerInput] = useState(user?.taxpayer_scope ?? "");
  const taxpayerId = useMemo(() => (user?.role === "taxpayer" ? (user.taxpayer_scope ?? "") : taxpayerInput), [taxpayerInput, user]);

  const [assessmentQuery, claimQuery] = useQueries({
    queries: [
      {
        queryKey: ["assessments", taxpayerId],
        queryFn: () => listAssessments(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
      {
        queryKey: ["claims", taxpayerId],
        queryFn: () => listClaims(taxpayerId, undefined, user ?? undefined),
        enabled: Boolean(taxpayerId),
      },
    ],
  });

  return (
    <section>
      <h2 className="text-2xl font-semibold">Vurderinger og krav</h2>
      {user?.role === "admin" ? (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-sm">Taxpayer ID</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerInput} onChange={(e) => setTaxpayerInput(e.target.value)} />
        </label>
      ) : null}
      <div className="mt-6 space-y-4">
        {(assessmentQuery.data ?? []).map((entry, idx) => (
          <article className="rounded border p-4" key={`${idx}-${String(entry.assessment?.filing_id ?? "")}`}>
            <h3 className="font-medium">Assessment {String(entry.assessment?.assessment_id ?? "")}</h3>
            <p className="mt-1 text-sm">Resultat: {String(entry.transparency?.result_type ?? "ukendt")}</p>
            <p className="mt-1 text-sm">BelÃ¸b: {String(entry.transparency?.claim_amount ?? "-")}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{entry.transparency?.explanation ?? "Ingen forklaring modtaget."}</p>
          </article>
        ))}
        <article className="rounded border p-4">
          <h3 className="font-medium">Krav</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(claimQuery.data ?? []).map((claim) => (
              <li key={String(claim.claim_id)}>{String(claim.claim_id)} - {String(claim.status)}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}


