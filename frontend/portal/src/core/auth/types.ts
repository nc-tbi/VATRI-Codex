export type UserRole = "admin" | "taxpayer";

export interface UserClaims {
  subject_id: string;
  role: UserRole;
  taxpayer_scope: string | null;
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse {
  trace_id: string;
  session_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserClaims;
}

