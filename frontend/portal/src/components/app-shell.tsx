"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

const links = [
  "/overview",
  "/obligations",
  "/filings/new",
  "/amendments/new",
  "/submissions",
  "/assessments-claims",
];

const adminLinks = [
  "/admin/taxpayers/new",
  "/admin/taxpayers",
  "/admin/cadence",
  "/admin/filings-alter",
  "/admin/amendments-alter",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, labelForRoute, language, setLanguage } = useOverlayI18n();
  const roleLabel = t(`role.${user?.role ?? "guest"}`);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{t("app.title")}</h1>
            <p className="text-sm text-[var(--muted)]">{t("app.country")} ({roleLabel})</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--muted)]">
              {t("language.label")}
              <select
                className="ml-2 rounded border border-[var(--border)] bg-white px-2 py-1 text-sm text-slate-800"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "native" | "en")}
              >
                <option value="native">{t("language.native")}</option>
                <option value="en">{t("language.en")}</option>
              </select>
            </label>
            {user ? (
              <button className="rounded bg-action px-4 py-2 text-white" onClick={() => void logout()}>
                {t("button.logout")}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <nav className="space-y-2">
            {links.map((href) => (
              <Link key={href} href={href} className={`block rounded px-3 py-2 ${pathname === href ? "bg-action text-white" : "hover:bg-slate-100"}`}>
                {labelForRoute(href)}
              </Link>
            ))}
            {user?.role === "admin" ? <hr className="my-3" /> : null}
            {user?.role === "admin"
              ? adminLinks.map((href) => (
                  <Link key={href} href={href} className={`block rounded px-3 py-2 ${pathname === href ? "bg-action text-white" : "hover:bg-slate-100"}`}>
                    {labelForRoute(href)}
                  </Link>
                ))
              : null}
          </nav>
        </aside>
        <main className="rounded border border-[var(--border)] bg-[var(--surface)] p-6">{children}</main>
      </div>
    </div>
  );
}


