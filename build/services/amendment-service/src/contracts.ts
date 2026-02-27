const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_ONLY_FIELDS = new Set([
  "tax_period_start",
  "tax_period_end",
  "due_date",
  "effective_date",
]);

const NUMERIC_FIELDS = new Set([
  "prior_assessment_version",
  "new_assessment_version",
  "delta_net_vat",
]);

const AMENDMENT_VAT_TOP_LEVEL_FIELDS = ["delta_net_vat"] as const;

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

export function normalizeAmendmentRecordContract(
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
  for (const field of AMENDMENT_VAT_TOP_LEVEL_FIELDS) {
    if (normalized[field] === undefined || normalized[field] === null) {
      normalized[field] = 0;
    }
  }
  return normalized;
}
