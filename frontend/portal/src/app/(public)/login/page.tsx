"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/auth/context";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { t } = useOverlayI18n();
  const router = useRouter();
  const nextPath =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/overview"
      : "/overview";

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      router.push(nextPath);
    } catch {
      setError(t("login.error"));
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="mb-2 text-2xl font-semibold">{t("login.title")}</h2>
      {error ? <div className="mb-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</div> : null}
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
      </form>
    </div>
  );
}
