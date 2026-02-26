import type { LoginResponse, UserClaims } from "./types";

const ACCESS_KEY = "vatri.portal.access_token";
const REFRESH_KEY = "vatri.portal.refresh_token";
const USER_KEY = "vatri.portal.user";

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_USE_PROXY_ROUTES === "1") {
    return "/proxy/auth";
  }
  return (
    process.env.NEXT_PUBLIC_AUTH_SERVICE_BASE_URL ||
    process.env.NEXT_PUBLIC_PORTAL_API_BASE_URL ||
    process.env.PORTAL_API_BASE_URL ||
    "http://localhost:3009"
  );
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return loginWithOptions(username, password, { persist: true });
}

export async function loginWithOptions(
  username: string,
  password: string,
  options: { persist?: boolean } = {}
): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error("Login failed");
  }
  const payload = (await res.json()) as LoginResponse;
  const shouldPersist = options.persist ?? true;
  if (shouldPersist && !payload.password_change_required) {
    persistSession(payload);
  }
  return payload;
}

export async function completeFirstLoginPasswordCreation(args: {
  accessToken: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { accessToken, currentPassword, newPassword } = args;
  const body = JSON.stringify({ current_password: currentPassword, new_password: newPassword });
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${accessToken}`,
  };

  const candidatePaths = ["/auth/change-password", "/auth/password"];
  let lastError: Error | null = null;
  for (const path of candidatePaths) {
    try {
      const res = await fetch(`${baseUrl()}${path}`, { method: "POST", headers, body });
      if (res.ok) return;
      lastError = new Error(`Password setup failed (${res.status})`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Password setup failed");
    }
  }
  throw lastError ?? new Error("Password setup failed");
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

