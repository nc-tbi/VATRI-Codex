import type { UserRole } from "@/core/auth/types";

const ADMIN_ONLY = new Set([
  "/admin/taxpayers/new",
  "/admin/taxpayers",
  "/admin/cadence",
  "/admin/filings-alter",
  "/admin/amendments-alter",
]);

const EXACT_AUTH_REQUIRED = new Set([
  "/overview",
  "/obligations",
  "/filings/new",
  "/amendments/new",
  "/submissions",
  "/assessments-claims",
  ...ADMIN_ONLY,
]);

const AUTH_REQUIRED_PREFIXES = ["/submissions/"];

export function requiresAuth(pathname: string): boolean {
  if (EXACT_AUTH_REQUIRED.has(pathname)) {
    return true;
  }
  return AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function canAccess(pathname: string, role: UserRole): boolean {
  if (ADMIN_ONLY.has(pathname)) {
    return role === "admin";
  }
  if (pathname.startsWith("/admin/")) {
    return role === "admin";
  }
  return true;
}
