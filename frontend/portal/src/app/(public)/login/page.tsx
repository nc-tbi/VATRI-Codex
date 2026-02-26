"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/auth/context";
import type { LoginResponse } from "@/core/auth/types";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pendingSession, setPendingSession] = useState<LoginResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { login, completeFirstLogin } = useAuth();
  const { t } = useOverlayI18n();
  const router = useRouter();
  const firstTimeDone =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("first_time") === "done";
  const nextPath =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/overview"
      : "/overview";

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      const payload = await login(username, password);
      if (payload.password_change_required) {
        setPendingSession(payload);
        return;
      }
      router.push(nextPath);
    } catch {
      setError(t("login.error"));
    }
  };

  const onCompleteFirstLogin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!pendingSession) return;
    if (newPassword.length < 12) {
      setError(t("login.password_setup_length_error"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t("login.password_setup_mismatch"));
      return;
    }
    try {
      await completeFirstLogin(pendingSession, password, newPassword);
      router.push(nextPath);
    } catch {
      setError(t("login.password_setup_error"));
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="mb-2 text-2xl font-semibold">{pendingSession ? t("login.password_setup_title") : t("login.title")}</h2>
      {firstTimeDone ? <div className="mb-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{t("login.first_time_done")}</div> : null}
      {error ? <div className="mb-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</div> : null}
      {pendingSession ? (
        <form onSubmit={(e) => void onCompleteFirstLogin(e)} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{t("login.password_setup_description")}</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t("login.password_setup_new_password")}</span>
            <input className="w-full rounded border border-[var(--border)] px-3 py-2" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t("login.password_setup_confirm_password")}</span>
            <input className="w-full rounded border border-[var(--border)] px-3 py-2" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
          </label>
          <button className="w-full rounded bg-action px-4 py-2 text-white" type="submit">
            {t("login.password_setup_submit")}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t("login.username")}</span>
            <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t("login.password")}</span>
            <input className="w-full rounded border border-[var(--border)] px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="w-full rounded bg-action px-4 py-2 text-white" type="submit">
            {t("login.submit")}
          </button>
          <Link className="block text-center text-sm text-action underline" href="/first-time-password">
            {t("login.first_time_taxpayer_button")}
          </Link>
          <p className="text-center text-xs text-[var(--muted)]">{t("login.first_time_taxpayer_note")}</p>
        </form>
      )}
    </div>
  );
}
