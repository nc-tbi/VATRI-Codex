"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearSession,
  completeFirstLoginPasswordCreation,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  loginWithOptions,
  logout as doLogout,
  me,
  persistSession,
} from "./service";
import type { LoginResponse, UserClaims } from "./types";

interface AuthContextValue {
  user: UserClaims | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  completeFirstLogin: (session: LoginResponse, currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async (): Promise<void> => {
      const token = getAccessToken();
      const storedUser = getStoredUser();
      if (!token || !storedUser) {
        setLoading(false);
        return;
      }
      try {
        const verified = await me(token);
        setUser(verified);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (username: string, password: string) => {
        const payload = await loginWithOptions(username, password, { persist: true });
        if (!payload.password_change_required) {
          setUser(payload.user);
        }
        return payload;
      },
      completeFirstLogin: async (session: LoginResponse, currentPassword: string, newPassword: string) => {
        await completeFirstLoginPasswordCreation({
          accessToken: session.access_token,
          currentPassword,
          newPassword,
        });
        persistSession(session);
        setUser(session.user);
      },
      logout: async () => {
        await doLogout(getRefreshToken());
        setUser(null);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}


