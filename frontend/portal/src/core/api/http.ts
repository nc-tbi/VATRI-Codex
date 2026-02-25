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

export async function apiGet<T>(service: ServiceName, path: string, user?: UserClaims): Promise<T> {
  const res = await fetch(`${serviceBaseUrl(service)}${path}`, { headers: buildHeaders(user), cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `GET ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(service: ServiceName, path: string, body: unknown, user?: UserClaims): Promise<T> {
  const res = await fetch(`${serviceBaseUrl(service)}${path}`, { method: "POST", headers: buildHeaders(user), body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `POST ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

