"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getAccessToken, getRefreshToken, getStoredUser, login as doLogin, logout as doLogout, me } from "./service";
import type { UserClaims } from "./types";

interface AuthContextValue {
  user: UserClaims | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
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
        const payload = await doLogin(username, password);
        setUser(payload.user);
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


