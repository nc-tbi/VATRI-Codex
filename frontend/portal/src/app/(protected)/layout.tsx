"use client";

import { AppShell } from "@/components/app-shell";
import { RouteGuard } from "@/components/route-guard";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}


