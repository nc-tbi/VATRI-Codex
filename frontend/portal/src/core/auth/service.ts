import type { LoginResponse, UserClaims } from "./types";

const ACCESS_KEY = "vatri.portal.access_token";
const REFRESH_KEY = "vatri.portal.refresh_token";
const USER_KEY = "vatri.portal.user";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_PORTAL_API_BASE_URL || process.env.PORTAL_API_BASE_URL || "http://localhost:3009";
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error("Login failed");
  }
  const payload = (await res.json()) as LoginResponse;
  persistSession(payload);
  return payload;
}

export async function me(accessToken: string): Promise<UserClaims> {
  const res = await fetch(`${baseUrl()}/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Session expired");
  }
  const payload = (await res.json()) as { user: UserClaims };
  return payload.user;
}

export async function logout(refreshToken: string | null): Promise<void> {
  await fetch(`${baseUrl()}/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  clearSession();
}

export function persistSession(payload: LoginResponse): void {
  localStorage.setItem(ACCESS_KEY, payload.access_token);
  localStorage.setItem(REFRESH_KEY, payload.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): UserClaims | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserClaims;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

