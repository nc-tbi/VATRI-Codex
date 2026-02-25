import type { UserClaims } from "@/core/auth/types";
import { apiGet, apiPost } from "@/core/api/http";

export interface ObligationRecord {
  obligation_id: string;
  taxpayer_id: string;
  tax_period_start: string;
  tax_period_end: string;
  due_date: string;
  cadence: string;
  state: string;
  filing_id?: string;
}

export interface FilingRecord extends Record<string, unknown> {
  filing_id: string;
  taxpayer_id?: string;
  tax_period_end?: string;
  state?: string;
}

export interface AmendmentRecord extends Record<string, unknown> {
  amendment_id: string;
  original_filing_id: string;
  taxpayer_id: string;
  tax_period_end: string;
  delta_classification: string;
}

export interface AssessmentEnvelope {
  assessment: Record<string, unknown>;
  transparency?: {
    explanation?: string;
    result_type?: string;
    claim_amount?: number;
    rule_version_id?: string;
    calculation_stages?: Array<{ stage: string; label: string; value: number }>;
  };
}

export interface ClaimRecord extends Record<string, unknown> {
  claim_id: string;
  filing_id: string;
  status: string;
  claim_amount: number;
}

export async function listObligations(taxpayerId: string, user?: UserClaims): Promise<ObligationRecord[]> {
  const payload = await apiGet<{ obligations: ObligationRecord[] }>("obligation", `/obligations?taxpayer_id=${encodeURIComponent(taxpayerId)}`, user);
  return payload.obligations ?? [];
}

export async function listFilings(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<FilingRecord[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ filings: FilingRecord[] }>("filing", `/vat-filings?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return payload.filings ?? [];
}

export async function submitFiling(body: Record<string, unknown>, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("filing", "/vat-filings", body, user);
}

export async function listAmendments(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<AmendmentRecord[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ amendments: AmendmentRecord[] }>("amendment", `/amendments?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return payload.amendments ?? [];
}

export async function submitAmendment(body: Record<string, unknown>, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("amendment", "/amendments", body, user);
}

export async function listAssessments(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<AssessmentEnvelope[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ assessments: AssessmentEnvelope[] }>("assessment", `/assessments?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return payload.assessments ?? [];
}

export async function listClaims(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<ClaimRecord[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ claims: ClaimRecord[] }>("claim", `/claims?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return payload.claims ?? [];
}

export async function createRegistration(body: { taxpayer_id: string; cvr_number: string; annual_turnover_dkk: number }, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("registration", "/registrations", body, user);
}

export async function getRegistration(registrationId: string, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>("registration", `/registrations/${encodeURIComponent(registrationId)}`, user);
}

export async function getCadencePolicy(turnoverDkk: number, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>("registration", `/registrations/cadence-policy?turnover_dkk=${encodeURIComponent(String(turnoverDkk))}`, user);
}

export async function filingAlter(filingId: string, fieldDeltas: Record<string, unknown>, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("filing", `/vat-filings/${encodeURIComponent(filingId)}/alter`, { field_deltas: fieldDeltas }, user);
}

export async function filingUndo(filingId: string, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("filing", `/vat-filings/${encodeURIComponent(filingId)}/undo`, {}, user);
}

export async function filingRedo(filingId: string, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("filing", `/vat-filings/${encodeURIComponent(filingId)}/redo`, {}, user);
}

export async function amendmentAlter(amendmentId: string, fieldDeltas: Record<string, unknown>, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("amendment", `/amendments/${encodeURIComponent(amendmentId)}/alter`, { field_deltas: fieldDeltas }, user);
}

export async function amendmentUndo(amendmentId: string, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("amendment", `/amendments/${encodeURIComponent(amendmentId)}/undo`, {}, user);
}

export async function amendmentRedo(amendmentId: string, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("amendment", `/amendments/${encodeURIComponent(amendmentId)}/redo`, {}, user);
}

