import { ApiError } from "@/core/api/http";

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const code = error.code ?? "UNKNOWN";
    const trace = error.traceId ? ` trace_id=${error.traceId}` : "";
    const base = `HTTP ${error.status} (${code}).`;
    const detail = error.message ? ` ${error.message}` : "";
    return `${base}${trace}${detail}`.trim();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
