const DATE_PREFIX_RE = /^(\d{4}-\d{2}-\d{2})/;

export function formatDateOnly(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const prefixed = DATE_PREFIX_RE.exec(trimmed);
    if (prefixed) return prefixed[1];
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return trimmed;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

export function formatPeriod(start: unknown, end: unknown): string {
  const startText = formatDateOnly(start);
  const endText = formatDateOnly(end);
  if (startText && endText) return `${startText} - ${endText}`;
  if (endText) return endText;
  return "-";
}
