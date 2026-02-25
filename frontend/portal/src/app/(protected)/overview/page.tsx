import { StatusChip } from "@/features/shared/status-chip";

export default function OverviewPage() {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Overblik</h2>
      <p className="mt-2 text-[var(--muted)]">Viser kommende forpligtelser og seneste indsendelser.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded border border-[var(--border)] p-4"><h3 className="font-medium">NÃ¦ste frist</h3><p className="text-sm">2026-03-31</p></article>
        <article className="rounded border border-[var(--border)] p-4"><h3 className="font-medium">Aktuel status</h3><StatusChip text="submitted" /></article>
        <article className="rounded border border-[var(--border)] p-4"><h3 className="font-medium">Seneste krav</h3><StatusChip text="claim_queued" /></article>
      </div>
    </section>
  );
}


