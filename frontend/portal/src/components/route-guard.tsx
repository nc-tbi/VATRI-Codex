"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/core/auth/context";
import { canAccess, requiresAuth } from "@/core/rbac/route-guards";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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

  if (loading) return <p>IndlÃ¦ser session ...</p>;
  if (requiresAuth(pathname) && !user) return <p>Omdirigerer til login ...</p>;
  return <>{children}</>;
}


