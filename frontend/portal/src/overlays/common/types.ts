import type { UserRole } from "@/core/auth/types";

export interface OverlayContract {
  overlay_id: string;
  locale: string;
  currency: string;
  labels: Record<string, string>;
  status_dictionary: Record<string, string>;
  disclaimer_blocks: Record<string, string>;
  routes: string[];
  allowsRole: (pathname: string, role: UserRole) => boolean;
}

