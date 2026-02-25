"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiLanguage = "native" | "en";
type OverlayId = "dk";

const STORAGE_KEY = "vatri.portal.ui.language";
const ACTIVE_OVERLAY: OverlayId = "dk";

type Dict = Record<string, string>;

const dictionaries: Record<OverlayId, Record<UiLanguage, Dict>> = {
  dk: {
    native: {
      "app.title": "VATRI Portal",
      "app.country": "Danmark",
      "role.admin": "administrator",
      "role.taxpayer": "skatteyder",
      "role.guest": "gæst",
      "button.logout": "Log ud",
      "language.label": "Sprog",
      "language.native": "Dansk",
      "language.en": "Engelsk",
      "route.overview": "Overblik",
      "route.obligations": "Forpligtelser",
      "route.filings_new": "Ny momsangivelse",
      "route.amendments_new": "Ny ændringsangivelse",
      "route.submissions": "Indsendelser",
      "route.assessments_claims": "Vurderinger og krav",
      "route.admin_taxpayers_new": "Registrer skatteyder",
      "route.admin_taxpayers": "Søg skatteyder",
      "route.admin_cadence": "Fastsæt indberetningskadence",
      "route.admin_filings_alter": "Ret indsendelser",
      "route.admin_amendments_alter": "Ret ændringer",
      "guard.loading": "Indlæser session ...",
      "guard.redirect": "Sender dig til log ind ...",
      "login.title": "Log ind",
      "login.username": "Brugernavn",
      "login.password": "Adgangskode",
      "login.submit": "Log ind",
      "login.error": "Log ind mislykkedes. Kontroller brugernavn og adgangskode.",
      "overview.title": "Overblik",
      "overview.description": "Viser kommende forpligtelser og seneste indsendelser.",
      "overview.next_due": "Næste frist",
      "overview.current_status": "Aktuel status",
      "overview.latest_claim": "Seneste krav",
      "obligations.title": "Forpligtelser",
      "obligations.description": "Kvartalsvise momsforpligtelser og forfaldsdatoer.",
      "shared.taxpayer_id": "Skatteyder-id",
      "shared.loading": "Indlæser ...",
      "shared.fetch_error": "Kunne ikke hente data.",
      "obligations.period": "Periode",
      "obligations.due_date": "Forfaldsdato",
      "obligations.cadence": "Kadence",
      "obligations.status": "Status",
      "submissions.title": "Indsendelser",
      "submissions.filings": "Momsangivelser",
      "submissions.amendments": "Ændringsangivelser",
      "shared.unknown": "ukendt",
      "assessments_claims.title": "Vurderinger og krav",
      "assessments_claims.assessment": "Vurdering",
      "assessments_claims.result": "Resultat",
      "assessments_claims.amount": "Beløb",
      "assessments_claims.no_explanation": "Ingen forklaring modtaget.",
      "assessments_claims.claims": "Krav",
      "filings_new.title": "Ny momsangivelse",
      "filings_new.description": "Udfyld og indsend momsangivelsen.",
      "filings_new.output_vat": "Udgående moms (DKK)",
      "filings_new.input_vat": "Fradragsberettiget indgående moms (DKK)",
      "filings_new.submit": "Indsend momsangivelse",
      "filings_new.submitted": "Indsendt. Momsangivelses-id: {id} (sporings-id: {trace})",
      "filings_new.replayed": "Allerede indsendt. Viser eksisterende momsangivelse: {id} (sporings-id: {trace})",
      "filings_new.conflict_duplicate": "Konflikt: denne momsangivelse findes allerede med andet indhold.",
      "filings_new.conflict_state": "Tilstandsfejl: {message}",
      "filings_new.submit_error": "Indsendelse fejlede.",
      "amendments_new.title": "Ny ændringsangivelse",
      "amendments_new.description": "Vælg tidligere indsendelse og indtast korrektioner.",
      "amendments_new.original_filing_id": "Originalt momsangivelses-id",
      "amendments_new.new_net_result": "Nyt nettoresultat (DKK)",
      "amendments_new.submit": "Indsend ændringsangivelse",
      "amendments_new.submitted": "Indsendt. Ændrings-id: {id} (sporings-id: {trace})",
      "amendments_new.replayed": "Allerede indsendt. Viser eksisterende ændring: {id} (sporings-id: {trace})",
      "amendments_new.conflict_idempotency": "Konflikt: samme nøgle findes med andet ændringsindhold.",
      "amendments_new.conflict_state": "Tilstandsfejl: {message}",
      "amendments_new.submit_error": "Indsendelse fejlede.",
      "admin.taxpayers_new.title": "Registrer ny skatteyder",
      "admin.taxpayers_new.turnover": "Årlig omsætning (DKK)",
      "admin.taxpayers_new.create": "Opret registrering",
      "admin.taxpayers_new.success": "Registrering oprettet: {id}",
      "admin.taxpayers_new.error": "Kunne ikke oprette registrering.",
      "admin.taxpayers.title": "Søg skatteyder",
      "admin.taxpayers.description": "Søg registrering med registrerings-id.",
      "admin.taxpayers.lookup_placeholder": "Registrerings-id",
      "admin.taxpayers.lookup": "Søg",
      "admin.taxpayers.error": "Søgning fejlede.",
      "admin.cadence.title": "Fastsæt indberetningskadence",
      "admin.cadence.description": "Beregn gældende kadence ud fra omsætning.",
      "admin.cadence.calculate": "Beregn",
      "admin.cadence.error": "Kadenceopslag fejlede.",
      "admin.filings_alter.title": "Ret, fortryd eller gendan momsangivelse",
      "admin.amendments_alter.title": "Ret, fortryd eller gendan ændringsangivelse",
      "admin.shared.filing_id": "Momsangivelses-id",
      "admin.shared.amendment_id": "Ændrings-id",
      "admin.shared.field": "Felt",
      "admin.shared.value": "Værdi",
      "admin.shared.action_alter": "Ret",
      "admin.shared.action_undo": "Fortryd",
      "admin.shared.action_redo": "Gendan",
      "admin.shared.not_admin": "Adgang nægtet: rollen er ikke administrator.",
      "admin.shared.forbidden": "Adgang nægtet: kun administrator kan udføre denne handling.",
      "admin.shared.state_error": "Tilstandsfejl: {message}",
      "admin.shared.conflict": "Konflikt: handlingen kunne ikke gennemføres på grund af modstridende data.",
      "admin.shared.idempotency_conflict": "Konflikt: samme nøgle peger på andet indhold.",
      "admin.shared.action_failed": "Handling fejlede.",
      "status.submitted": "Indsendt",
      "status.claim_queued": "Krav i kø",
      "status.draft": "Kladde",
      "status.overdue": "Forfalden",
      "status.payable": "Til betaling",
      "status.refund": "Til udbetaling",
      "status.zero": "Nulresultat",
      "status.pending_dispatch": "Afventer afsendelse",
      "status.dispatched": "Afsendt",
      "status.confirmed": "Bekræftet",
      "status.dispatch_failed_retrying": "Afsendelse fejlede (forsøger igen)",
      "status.dispatch_failed_terminal": "Afsendelse fejlede (endelig fejl)",
      "status.requires_intervention": "Kræver manuel behandling",
      "status.superseded": "Erstattet af endelig indsendelse",
      "claims.retry_scheduled": "Nyt forsøg planlagt til {time}",
      "claims.retry_pending": "Nyt forsøg afventer planlægning",
      "claims.max_retries": "Maksimalt antal forsøg er nået.",
      "claims.last_attempt": "Seneste afsendelsesforsøg: {time}",
    },
    en: {
      "app.title": "VATRI Portal",
      "app.country": "Denmark",
      "role.admin": "administrator",
      "role.taxpayer": "taxpayer",
      "role.guest": "guest",
      "button.logout": "Log out",
      "language.label": "Language",
      "language.native": "Danish",
      "language.en": "English",
      "route.overview": "Overview",
      "route.obligations": "Obligations",
      "route.filings_new": "New VAT return",
      "route.amendments_new": "New amendment return",
      "route.submissions": "Submissions",
      "route.assessments_claims": "Assessments and claims",
      "route.admin_taxpayers_new": "Register taxpayer",
      "route.admin_taxpayers": "Find taxpayer",
      "route.admin_cadence": "Set filing cadence",
      "route.admin_filings_alter": "Edit filings",
      "route.admin_amendments_alter": "Edit amendments",
      "guard.loading": "Loading session ...",
      "guard.redirect": "Redirecting to sign in ...",
      "login.title": "Sign in",
      "login.username": "Username",
      "login.password": "Password",
      "login.submit": "Sign in",
      "login.error": "Sign in failed. Please check username and password.",
      "overview.title": "Overview",
      "overview.description": "Shows upcoming obligations and latest submissions.",
      "overview.next_due": "Next due date",
      "overview.current_status": "Current status",
      "overview.latest_claim": "Latest claim",
      "obligations.title": "Obligations",
      "obligations.description": "Quarterly VAT obligations and due dates.",
      "shared.taxpayer_id": "Taxpayer ID",
      "shared.loading": "Loading ...",
      "shared.fetch_error": "Could not fetch data.",
      "obligations.period": "Period",
      "obligations.due_date": "Due date",
      "obligations.cadence": "Cadence",
      "obligations.status": "Status",
      "submissions.title": "Submissions",
      "submissions.filings": "VAT returns",
      "submissions.amendments": "Amendment returns",
      "shared.unknown": "unknown",
      "assessments_claims.title": "Assessments and claims",
      "assessments_claims.assessment": "Assessment",
      "assessments_claims.result": "Result",
      "assessments_claims.amount": "Amount",
      "assessments_claims.no_explanation": "No explanation received.",
      "assessments_claims.claims": "Claims",
      "filings_new.title": "New VAT return",
      "filings_new.description": "Complete and submit the VAT return.",
      "filings_new.output_vat": "Output VAT (DKK)",
      "filings_new.input_vat": "Deductible input VAT (DKK)",
      "filings_new.submit": "Submit VAT return",
      "filings_new.submitted": "Submitted. Filing ID: {id} (trace ID: {trace})",
      "filings_new.replayed": "Already submitted. Showing existing filing: {id} (trace ID: {trace})",
      "filings_new.conflict_duplicate": "Conflict: this filing already exists with different content.",
      "filings_new.conflict_state": "State error: {message}",
      "filings_new.submit_error": "Submission failed.",
      "amendments_new.title": "New amendment return",
      "amendments_new.description": "Select a previous submission and enter corrections.",
      "amendments_new.original_filing_id": "Original filing ID",
      "amendments_new.new_net_result": "New net result (DKK)",
      "amendments_new.submit": "Submit amendment return",
      "amendments_new.submitted": "Submitted. Amendment ID: {id} (trace ID: {trace})",
      "amendments_new.replayed": "Already submitted. Showing existing amendment: {id} (trace ID: {trace})",
      "amendments_new.conflict_idempotency": "Conflict: the same key exists with different amendment content.",
      "amendments_new.conflict_state": "State error: {message}",
      "amendments_new.submit_error": "Submission failed.",
      "admin.taxpayers_new.title": "Register new taxpayer",
      "admin.taxpayers_new.turnover": "Annual turnover (DKK)",
      "admin.taxpayers_new.create": "Create registration",
      "admin.taxpayers_new.success": "Registration created: {id}",
      "admin.taxpayers_new.error": "Could not create registration.",
      "admin.taxpayers.title": "Find taxpayer",
      "admin.taxpayers.description": "Look up registration by registration ID.",
      "admin.taxpayers.lookup_placeholder": "Registration ID",
      "admin.taxpayers.lookup": "Search",
      "admin.taxpayers.error": "Lookup failed.",
      "admin.cadence.title": "Set filing cadence",
      "admin.cadence.description": "Calculate applicable cadence from turnover.",
      "admin.cadence.calculate": "Calculate",
      "admin.cadence.error": "Cadence lookup failed.",
      "admin.filings_alter.title": "Edit, undo, or redo filing",
      "admin.amendments_alter.title": "Edit, undo, or redo amendment",
      "admin.shared.filing_id": "Filing ID",
      "admin.shared.amendment_id": "Amendment ID",
      "admin.shared.field": "Field",
      "admin.shared.value": "Value",
      "admin.shared.action_alter": "Edit",
      "admin.shared.action_undo": "Undo",
      "admin.shared.action_redo": "Redo",
      "admin.shared.not_admin": "Access denied: role is not administrator.",
      "admin.shared.forbidden": "Access denied: only administrators can perform this action.",
      "admin.shared.state_error": "State error: {message}",
      "admin.shared.conflict": "Conflict: action could not be completed because data conflicts.",
      "admin.shared.idempotency_conflict": "Conflict: the same key points to different content.",
      "admin.shared.action_failed": "Action failed.",
      "status.submitted": "Submitted",
      "status.claim_queued": "Claim queued",
      "status.draft": "Draft",
      "status.overdue": "Overdue",
      "status.payable": "Payable",
      "status.refund": "Refund",
      "status.zero": "Zero",
      "status.pending_dispatch": "Pending dispatch",
      "status.dispatched": "Dispatched",
      "status.confirmed": "Confirmed",
      "status.dispatch_failed_retrying": "Dispatch failed (retry in progress)",
      "status.dispatch_failed_terminal": "Dispatch failed (terminal)",
      "status.requires_intervention": "Requires intervention",
      "status.superseded": "Superseded by final submission",
      "claims.retry_scheduled": "Retry scheduled for {time}",
      "claims.retry_pending": "Retry pending",
      "claims.max_retries": "Maximum retry count reached.",
      "claims.last_attempt": "Last dispatch attempt: {time}",
    },
  },
};

const routeKeyByPath: Record<string, string> = {
  "/overview": "route.overview",
  "/obligations": "route.obligations",
  "/filings/new": "route.filings_new",
  "/amendments/new": "route.amendments_new",
  "/submissions": "route.submissions",
  "/assessments-claims": "route.assessments_claims",
  "/admin/taxpayers/new": "route.admin_taxpayers_new",
  "/admin/taxpayers": "route.admin_taxpayers",
  "/admin/cadence": "route.admin_cadence",
  "/admin/filings-alter": "route.admin_filings_alter",
  "/admin/amendments-alter": "route.admin_amendments_alter",
};

interface OverlayI18nValue {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  labelForRoute: (pathname: string) => string;
}

const OverlayI18nContext = createContext<OverlayI18nValue | undefined>(undefined);

function format(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)), text);
}

export function OverlayI18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<UiLanguage>("native");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "native" || saved === "en") {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    document.documentElement.lang = language === "native" ? "da" : "en";
  }, [language]);

  const value = useMemo<OverlayI18nValue>(() => {
    const dict = dictionaries[ACTIVE_OVERLAY][language];
    const t = (key: string, vars?: Record<string, string | number>) => format(dict[key] ?? key, vars);
    const labelForRoute = (pathname: string) => t(routeKeyByPath[pathname] ?? pathname);
    return { language, setLanguage, t, labelForRoute };
  }, [language]);

  return <OverlayI18nContext.Provider value={value}>{children}</OverlayI18nContext.Provider>;
}

export function useOverlayI18n(): OverlayI18nValue {
  const ctx = useContext(OverlayI18nContext);
  if (!ctx) {
    throw new Error("useOverlayI18n must be used within OverlayI18nProvider");
  }
  return ctx;
}
