"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/core/api/query-client";
import { AuthProvider } from "@/core/auth/context";
import { OverlayI18nProvider } from "@/overlays/common/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OverlayI18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </OverlayI18nProvider>
    </QueryClientProvider>
  );
}


