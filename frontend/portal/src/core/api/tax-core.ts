import type { UserClaims } from "@/core/auth/types";
import { apiGet, apiPatch, apiPost, apiPostWithMeta, apiPut } from "@/core/api/http";

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
  retry_count?: number;
  last_attempted_at?: string | null;
  next_retry_at?: string | null;
}

export interface RegistrationAddress {
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
}

export interface RegistrationContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface RegistrationBusinessProfile {
  legal_name?: string;
  trade_name?: string;
  effective_date?: string;
  status?: "active" | "pending" | "inactive";
}

export interface RegistrationPayload {
  taxpayer_id: string;
  cvr_number: string;
  annual_turnover_dkk: number;
  business_profile?: RegistrationBusinessProfile;
  contact?: RegistrationContact;
  address?: RegistrationAddress;
}

export interface SubmissionResult {
  status: 200 | 201;
  idempotent: boolean;
  trace_id: string;
  resource_id: string;
  body: Record<string, unknown>;
}

interface AssessmentCreateResponse {
  trace_id: string;
  assessment: Record<string, unknown>;
}

interface ClaimCreateResponse {
  trace_id: string;
  claim: Record<string, unknown>;
  idempotent?: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FILING_VAT_FIELDS = [
  "output_vat_amount_domestic",
  "reverse_charge_output_vat_goods_abroad_amount",
  "reverse_charge_output_vat_services_abroad_amount",
  "input_vat_deductible_amount_total",
  "adjustments_amount",
  "reimbursement_oil_and_bottled_gas_duty_amount",
  "reimbursement_electricity_duty_amount",
  "rubrik_a_goods_eu_purchase_value",
  "rubrik_a_services_eu_purchase_value",
  "rubrik_b_goods_eu_sale_value_reportable",
  "rubrik_b_goods_eu_sale_value_non_reportable",
  "rubrik_b_services_eu_sale_value",
  "rubrik_c_other_vat_exempt_supplies_value",
  "claim_amount",
] as const;
const AMENDMENT_VAT_FIELDS = ["delta_net_vat"] as const;
const ASSESSMENT_VAT_FIELDS = [
  "stage1_gross_output_vat",
  "stage2_total_deductible_input_vat",
  "stage3_pre_adjustment_net_vat",
  "stage4_net_vat",
  "claim_amount",
] as const;
const FILING_FLATTEN_FIELDS = [
  "filing_id",
  "taxpayer_id",
  "cvr_number",
  "tax_period_start",
  "tax_period_end",
  "filing_type",
  "state",
  "submission_timestamp",
  "trace_id",
  ...FILING_VAT_FIELDS,
] as const;
const AMENDMENT_FLATTEN_FIELDS = [
  "amendment_id",
  "original_filing_id",
  "taxpayer_id",
  "tax_period_end",
  "delta_classification",
  ...AMENDMENT_VAT_FIELDS,
] as const;

function assertDateOnlyField(record: Record<string, unknown>, field: string, context: string): void {
  const value = record[field];
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`Invalid contract response (${context}): ${field} must be YYYY-MM-DD string`);
  }
}

function assertNumberField(record: Record<string, unknown>, field: string, context: string): void {
  const value = record[field];
  if (value === undefined || value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid contract response (${context}): ${field} must be finite number`);
  }
}

function assertRequiredNumberField(record: Record<string, unknown>, field: string, context: string): void {
  const value = record[field];
  if (value === undefined || value === null) {
    throw new Error(`Invalid contract response (${context}): missing required numeric field ${field}`);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid contract response (${context}): ${field} must be finite number`);
  }
}

export function assertFilingContractShape(record: FilingRecord): FilingRecord {
  assertDateOnlyField(record, "tax_period_start", "filing");
  assertDateOnlyField(record, "tax_period_end", "filing");
  for (const field of FILING_VAT_FIELDS) {
    assertRequiredNumberField(record, field, "filing");
  }
  return record;
}

export function assertAmendmentContractShape(record: AmendmentRecord): AmendmentRecord {
  assertDateOnlyField(record, "tax_period_end", "amendment");
  for (const field of AMENDMENT_VAT_FIELDS) {
    assertRequiredNumberField(record, field, "amendment");
  }
  return record;
}

export function assertAssessmentContractShape(record: Record<string, unknown>): Record<string, unknown> {
  assertDateOnlyField(record, "tax_period_end", "assessment");
  for (const field of ASSESSMENT_VAT_FIELDS) {
    assertNumberField(record, field, "assessment");
  }
  return record;
}

function assertUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${field} must be a UUID`);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function flattenFromCandidates<T extends Record<string, unknown>, K extends readonly string[]>(
  record: T,
  fields: K,
): T {
  const candidates = [asRecord(record.filing), asRecord(record.effective_state), asRecord(record.current_state), asRecord(record.payload), asRecord(record.snapshot)];
  const merged: Record<string, unknown> = { ...record };
  for (const field of fields) {
    if (merged[field] !== undefined && merged[field] !== null) continue;
    for (const candidate of candidates) {
      if (candidate && candidate[field] !== undefined && candidate[field] !== null) {
        merged[field] = candidate[field];
        break;
      }
    }
  }
  return merged as T;
}

function parseSubmissionResult(status: number, payload: unknown, nestedResourceKey: "filing" | "amendment", idField: "filing_id" | "amendment_id"): SubmissionResult {
  if (status !== 200 && status !== 201) {
    throw new Error(`Unexpected submission status: ${status}`);
  }
  const body = asRecord(payload);
  if (!body) {
    throw new Error("Invalid contract response: body is not an object");
  }
  const traceId = body.trace_id;
  const idempotent = body.idempotent;
  if (typeof traceId !== "string") {
    throw new Error("Invalid contract response: missing trace_id");
  }
  if (typeof idempotent !== "boolean") {
    throw new Error("Invalid contract response: missing idempotent boolean");
  }

  const nested = asRecord(body[nestedResourceKey]);
  const nestedId = nested ? nested[idField] : undefined;
  const topLevelId = body[idField];
  const resourceId = typeof topLevelId === "string" ? topLevelId : typeof nestedId === "string" ? nestedId : null;
  if (!resourceId) {
    throw new Error(`Invalid contract response: missing ${idField}`);
  }

  return {
    status,
    idempotent,
    trace_id: traceId,
    resource_id: resourceId,
    body,
  };
}

export async function listObligations(taxpayerId: string, user?: UserClaims): Promise<ObligationRecord[]> {
  const payload = await apiGet<{ obligations: ObligationRecord[] }>("obligation", `/obligations?taxpayer_id=${encodeURIComponent(taxpayerId)}`, user);
  return payload.obligations ?? [];
}

export async function listFilings(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<FilingRecord[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ filings: FilingRecord[] }>("filing", `/vat-filings?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return (payload.filings ?? []).map((record) => assertFilingContractShape(flattenFromCandidates(record, FILING_FLATTEN_FIELDS)));
}

export async function getFiling(filingId: string, user?: UserClaims): Promise<FilingRecord> {
  const payload = await apiGet<FilingRecord>("filing", `/vat-filings/${encodeURIComponent(filingId)}`, user);
  return assertFilingContractShape(flattenFromCandidates(payload, FILING_FLATTEN_FIELDS));
}

export async function submitFiling(body: Record<string, unknown>, user?: UserClaims): Promise<SubmissionResult> {
  const filingId = body.filing_id;
  if (typeof filingId !== "string") {
    throw new Error("filing_id is required");
  }
  assertUuid(filingId, "filing_id");
  const response = await apiPostWithMeta<Record<string, unknown>>("filing", "/vat-filings", body, user);
  return parseSubmissionResult(response.status, response.data, "filing", "filing_id");
}

export async function listAmendments(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<AmendmentRecord[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ amendments: AmendmentRecord[] }>("amendment", `/amendments?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return (payload.amendments ?? []).map((record) => assertAmendmentContractShape(flattenFromCandidates(record, AMENDMENT_FLATTEN_FIELDS)));
}

export async function submitAmendment(body: Record<string, unknown>, user?: UserClaims): Promise<SubmissionResult> {
  const response = await apiPostWithMeta<Record<string, unknown>>("amendment", "/amendments", body, user);
  return parseSubmissionResult(response.status, response.data, "amendment", "amendment_id");
}

export async function createAssessmentFromFiling(
  filing: Record<string, unknown>,
  ruleVersionId: string,
  user?: UserClaims,
): Promise<Record<string, unknown>> {
  const payload = await apiPost<AssessmentCreateResponse>("assessment", "/assessments", { filing, rule_version_id: ruleVersionId }, user);
  return payload.assessment;
}

export async function createClaimFromAssessment(
  body: {
    taxpayer_id: string;
    filing_id: string;
    tax_period_end: string;
    assessment_version: number;
    assessment: Record<string, unknown>;
  },
  user?: UserClaims,
): Promise<Record<string, unknown>> {
  assertUuid(body.filing_id, "filing_id");
  const payload = await apiPost<ClaimCreateResponse>("claim", "/claims", body, user);
  return payload.claim;
}

export async function listAssessments(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<AssessmentEnvelope[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ assessments: AssessmentEnvelope[] }>("assessment", `/assessments?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return (payload.assessments ?? []).map((entry) => ({
    ...entry,
    assessment: assertAssessmentContractShape(entry.assessment),
  }));
}

export async function listClaims(taxpayerId: string, taxPeriodEnd?: string, user?: UserClaims): Promise<ClaimRecord[]> {
  const suffix = taxPeriodEnd ? `&tax_period_end=${encodeURIComponent(taxPeriodEnd)}` : "";
  const payload = await apiGet<{ claims: ClaimRecord[] }>("claim", `/claims?taxpayer_id=${encodeURIComponent(taxpayerId)}${suffix}`, user);
  return payload.claims ?? [];
}

export async function createRegistration(body: RegistrationPayload, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>("registration", "/registrations", body, user);
}

export async function updateRegistration(
  registrationId: string,
  body: RegistrationPayload,
  user?: UserClaims,
): Promise<Record<string, unknown>> {
  return apiPut<Record<string, unknown>>("registration", `/registrations/${encodeURIComponent(registrationId)}`, body, user);
}

export async function patchRegistration(
  registrationId: string,
  body: Partial<RegistrationPayload>,
  user?: UserClaims,
): Promise<Record<string, unknown>> {
  return apiPatch<Record<string, unknown>>("registration", `/registrations/${encodeURIComponent(registrationId)}`, body, user);
}

export async function getRegistration(registrationId: string, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>("registration", `/registrations/${encodeURIComponent(registrationId)}`, user);
}

export async function findRegistrationsByTaxpayerId(taxpayerId: string, user?: UserClaims): Promise<Record<string, unknown>[]> {
  const payload = await apiGet<{ registrations?: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "registration",
    `/registrations?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
    user
  );
  if (Array.isArray(payload)) {
    return payload;
  }
  return Array.isArray(payload.registrations) ? payload.registrations : [];
}

export async function getLatestEffectiveRegistrationByTaxpayerId(
  taxpayerId: string,
  user?: UserClaims,
): Promise<Record<string, unknown>> {
  const payload = await apiGet<{ registration?: Record<string, unknown> } | Record<string, unknown>>(
    "registration",
    `/registrations/latest?taxpayer_id=${encodeURIComponent(taxpayerId)}`,
    user,
  );
  if (payload && typeof payload === "object" && "registration" in payload) {
    const envelope = payload as { registration?: Record<string, unknown> };
    if (envelope.registration && typeof envelope.registration === "object") {
      return envelope.registration;
    }
  }
  return payload as Record<string, unknown>;
}

export async function getCadencePolicy(turnoverDkk: number, user?: UserClaims): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>("registration", `/registrations/cadence-policy?turnover_dkk=${encodeURIComponent(String(turnoverDkk))}`, user);
}

export async function wipeUserDataPreservingAdmin(
  user?: UserClaims,
): Promise<{ trace_id: string; message: string; admins_preserved: number }> {
  return apiPost<{ trace_id: string; message: string; admins_preserved: number }>(
    "auth",
    "/auth/admin/wipe-user-data",
    {},
    user,
  );
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

export async function submitObligation(
  obligationId: string,
  filingId: string,
  user?: UserClaims,
): Promise<Record<string, unknown>> {
  assertUuid(filingId, "filing_id");
  return apiPost<Record<string, unknown>>(
    "obligation",
    `/obligations/${encodeURIComponent(obligationId)}/submit`,
    { filing_id: filingId },
    user,
  );
}

