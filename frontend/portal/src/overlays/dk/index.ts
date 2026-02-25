import { canAccess } from "@/core/rbac/route-guards";
import type { OverlayContract } from "@/overlays/common/types";

export const dkOverlay: OverlayContract = {
  overlay_id: "dk",
  locale: "da-DK",
  currency: "DKK",
  labels: {
    login_title: "Log ind til momsportalen",
    overview_title: "Overblik",
    obligations_title: "Momsforpligtelser",
    filings_title: "Momsangivelse",
    amendments_title: "Ændringsangivelse",
    submissions_title: "Indsendelser",
    assessments_claims_title: "Vurderinger og krav",
  },
  status_dictionary: {
    draft: "Kladde",
    submitted: "Indsendt",
    superseded: "Erstattet",
    overdue: "Forfalden",
    payable: "Til betaling",
    refund: "Til udbetaling",
    zero: "Nulresultat",
    claim_queued: "Krav i kø",
    claim_sent: "Krav sendt",
    claim_acked: "Krav modtaget",
    claim_failed: "Krav fejlet",
    claim_dead_letter: "Krav i fejlpostkasse",
  },
  disclaimer_blocks: {
    legal: "Beregning og juridisk afgørelse sker i back-end. Portalens validering er vejledende.",
  },
  routes: [
    "/overview",
    "/obligations",
    "/filings/new",
    "/amendments/new",
    "/submissions",
    "/assessments-claims",
    "/admin/taxpayers/new",
    "/admin/taxpayers",
    "/admin/cadence",
    "/admin/filings-alter",
    "/admin/amendments-alter",
  ],
  allowsRole: (pathname, role) => canAccess(pathname, role),
};

