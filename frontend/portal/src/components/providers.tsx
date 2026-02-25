"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/core/api/query-client";
import { AuthProvider } from "@/core/auth/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}


