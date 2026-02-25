"use client";

import { StatusChip } from "@/features/shared/status-chip";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function OverviewPage() {
  const { t } = useOverlayI18n();

  return (
    <section>
      <h2 className="text-2xl font-semibold">{t("overview.title")}</h2>
      <p className="mt-2 text-[var(--muted)]">{t("overview.description")}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded border border-[var(--border)] p-4">
          <h3 className="font-medium">{t("overview.next_due")}</h3>
          <p className="text-sm">2026-03-31</p>
        </article>
        <article className="rounded border border-[var(--border)] p-4">
          <h3 className="font-medium">{t("overview.current_status")}</h3>
          <StatusChip text={t("status.submitted")} />
        </article>
        <article className="rounded border border-[var(--border)] p-4">
          <h3 className="font-medium">{t("overview.latest_claim")}</h3>
          <StatusChip text={t("status.claim_queued")} />
        </article>
      </div>
    </section>
  );
}
