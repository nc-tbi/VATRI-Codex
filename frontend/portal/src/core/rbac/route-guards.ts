import type { UserRole } from "@/core/auth/types";

const ADMIN_ONLY = new Set([
  "/admin/taxpayers/new",
  "/admin/taxpayers",
  "/admin/cadence",
  "/admin/filings-alter",
  "/admin/amendments-alter",
]);

const AUTH_REQUIRED = new Set([
  "/overview",
  "/obligations",
  "/filings/new",
  "/amendments/new",
  "/submissions",
  "/assessments-claims",
  ...ADMIN_ONLY,
]);

export function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED.has(pathname);
}

export function canAccess(pathname: string, role: UserRole): boolean {
  if (ADMIN_ONLY.has(pathname)) {
    return role === "admin";
  }
  return true;
}

