import { getAccessToken } from "@/core/auth/service";
import type { UserClaims } from "@/core/auth/types";

export type ServiceName = "auth" | "registration" | "obligation" | "filing" | "amendment" | "assessment" | "claim";

const SERVICE_DEFAULTS: Record<ServiceName, string> = {
  auth: "http://localhost:3009",
  registration: "http://localhost:3008",
  obligation: "http://localhost:3007",
  filing: "http://localhost:3001",
  amendment: "http://localhost:3005",
  assessment: "http://localhost:3004",
  claim: "http://localhost:3006",
};

function envName(service: ServiceName): string {
  return `NEXT_PUBLIC_${service.toUpperCase()}_SERVICE_BASE_URL`;
}

function serviceBaseUrl(service: ServiceName): string {
  if (process.env.NEXT_PUBLIC_USE_PROXY_ROUTES === "1") {
    return `/proxy/${service}`;
  }
  const sharedOrigin = process.env.NEXT_PUBLIC_PORTAL_API_BASE_URL || process.env.PORTAL_API_BASE_URL;
  if (sharedOrigin) {
    return sharedOrigin;
  }
  return process.env[envName(service)] || SERVICE_DEFAULTS[service];
}

function buildHeaders(user?: UserClaims): HeadersInit {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (user) {
    headers["x-user-role"] = user.role;
    headers["x-subject-id"] = user.subject_id;
  }
  return headers;
}

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "IDEMPOTENCY_CONFLICT"
  | "DUPLICATE_FILING"
  | "STATE_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: ApiErrorCode;
  trace_id: string;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  code?: ApiErrorCode;
  traceId?: string;
  body?: unknown;

  constructor(status: number, message: string, options?: { code?: ApiErrorCode; traceId?: string; body?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.traceId = options?.traceId;
    this.body = options?.body;
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function buildErrorMessage(status: number, fallback: string, body?: Partial<ApiErrorBody>): string {
  if (body?.message && body.trace_id) return `${body.message} (trace_id: ${body.trace_id})`;
  if (body?.message) return body.message;
  if (body?.trace_id) return `${fallback} (trace_id: ${body.trace_id})`;
  return fallback || `Request failed with ${status}`;
}

export async function apiGet<T>(service: ServiceName, path: string, user?: UserClaims): Promise<T> {
  const res = await fetch(`${serviceBaseUrl(service)}${path}`, { headers: buildHeaders(user), cache: "no-store" });
  if (!res.ok) {
    const parsed = (await parseJsonSafe(res)) as Partial<ApiErrorBody> | undefined;
    const text = parsed ? undefined : await res.text();
    throw new ApiError(
      res.status,
      buildErrorMessage(res.status, text || `GET ${path} failed with ${res.status}`, parsed),
      parsed ? { code: parsed.error, traceId: parsed.trace_id, body: parsed } : undefined
    );
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(service: ServiceName, path: string, body: unknown, user?: UserClaims): Promise<T> {
  const response = await apiPostWithMeta<T>(service, path, body, user);
  return response.data;
}

export async function apiPostWithMeta<T>(service: ServiceName, path: string, body: unknown, user?: UserClaims): Promise<{ status: number; data: T }> {
  const res = await fetch(`${serviceBaseUrl(service)}${path}`, { method: "POST", headers: buildHeaders(user), body: JSON.stringify(body) });
  if (!res.ok) {
    const parsed = (await parseJsonSafe(res)) as Partial<ApiErrorBody> | undefined;
    const text = parsed ? undefined : await res.text();
    throw new ApiError(
      res.status,
      buildErrorMessage(res.status, text || `POST ${path} failed with ${res.status}`, parsed),
      parsed ? { code: parsed.error, traceId: parsed.trace_id, body: parsed } : undefined
    );
  }
  return {
    status: res.status,
    data: (await res.json()) as T,
  };
}

