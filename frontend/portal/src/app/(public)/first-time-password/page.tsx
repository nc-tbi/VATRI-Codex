"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/auth/context";
import { setupTaxpayerFirstLoginPassword } from "@/core/auth/service";
import { useOverlayI18n } from "@/overlays/common/i18n";

export default function FirstTimePasswordPage() {
  const { t } = useOverlayI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [taxpayerId, setTaxpayerId] = useState("");
  const [cvrNumber, setCvrNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user?.role === "admin") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-2 text-2xl font-semibold">{t("first_time_password.title")}</h2>
        <p className="text-sm text-[var(--muted)]">{t("first_time_password.admin_not_applicable")}</p>
        <Link className="mt-4 inline-block text-sm text-action underline" href="/overview">
          {t("first_time_password.back_to_login")}
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 12) {
      setError(t("first_time_password.length_error"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("first_time_password.mismatch_error"));
      return;
    }

    try {
      await setupTaxpayerFirstLoginPassword({
        taxpayerId: taxpayerId.trim(),
        cvrNumber: cvrNumber.trim(),
        newPassword,
      });
      setMessage(t("first_time_password.success"));
      setTimeout(() => router.push("/login?first_time=done"), 700);
    } catch {
      setError(t("first_time_password.error"));
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="mb-2 text-2xl font-semibold">{t("first_time_password.title")}</h2>
      <p className="mb-4 text-sm text-[var(--muted)]">{t("first_time_password.description")}</p>
      {message ? <div className="mb-4 rounded border border-success bg-green-50 p-3 text-sm text-success">{message}</div> : null}
      {error ? <div className="mb-4 rounded border border-danger bg-red-50 p-3 text-sm text-danger">{error}</div> : null}
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t("first_time_password.taxpayer_id")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" value={taxpayerId} onChange={(e) => setTaxpayerId(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t("first_time_password.cvr_number")}</span>
          <input
            className="w-full rounded border border-[var(--border)] px-3 py-2"
            value={cvrNumber}
            onChange={(e) => setCvrNumber(e.target.value)}
            minLength={8}
            maxLength={8}
            inputMode="numeric"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t("first_time_password.new_password")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t("first_time_password.confirm_password")}</span>
          <input className="w-full rounded border border-[var(--border)] px-3 py-2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        <button className="w-full rounded bg-action px-4 py-2 text-white" type="submit">
          {t("first_time_password.submit")}
        </button>
      </form>
      <Link className="mt-4 inline-block text-sm text-action underline" href="/login">
        {t("first_time_password.back_to_login")}
      </Link>
    </div>
  );
}
