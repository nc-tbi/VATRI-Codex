"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/core/auth/context";
import { canAccess, requiresAuth } from "@/core/rbac/route-guards";
import { useOverlayI18n } from "@/overlays/common/i18n";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useOverlayI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (requiresAuth(pathname) && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !canAccess(pathname, user.role)) {
      router.replace("/overview?error=forbidden");
    }
  }, [loading, pathname, router, user]);

  if (loading) return <p>{t("guard.loading")}</p>;
  if (requiresAuth(pathname) && !user) return <p>{t("guard.redirect")}</p>;
  return <>{children}</>;
}


