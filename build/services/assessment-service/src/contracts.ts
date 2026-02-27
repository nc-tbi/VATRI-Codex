const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_ONLY_FIELDS = new Set([
  "tax_period_start",
  "tax_period_end",
  "due_date",
  "effective_date",
]);

const NUMERIC_FIELDS = new Set([
  "assessment_version",
  "stage1_gross_output_vat",
  "stage2_total_deductible_input_vat",
  "stage3_pre_adjustment_net_vat",
  "stage4_net_vat",
  "claim_amount",
]);

function toDateOnlyString(value: unknown, field: string): string {
  if (typeof value === "string") {
    if (DATE_ONLY_PATTERN.test(value)) return value;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  throw new Error(`Contract violation: ${field} must be date-only string (YYYY-MM-DD)`);
}

function toNumberValue(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Contract violation: ${field} must be a finite number`);
}

export function normalizeAssessmentRecordContract(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue;
    if (DATE_ONLY_FIELDS.has(key)) {
      normalized[key] = toDateOnlyString(value, key);
      continue;
    }
    if (NUMERIC_FIELDS.has(key)) {
      normalized[key] = toNumberValue(value, key);
    }
  }
  return normalized;
}
