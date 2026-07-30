"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthBusiness {
  id: string;
  name: string;
  slug: string;
  email: string;
  whatsappPhoneNumberId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  business: AuthBusiness | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    business: { name: string; email: string; slug: string };
    user: { email: string; password: string };
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<AuthBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const me = await api<AuthUser>("/auth/me");
      const biz = await api<AuthBusiness>("/businesses/me");
      setUser(me);
      setBusiness(biz);
    } catch {
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await loadSession();
    },
    [loadSession],
  );

  const register = useCallback(
    async (input: {
      business: { name: string; email: string; slug: string };
      user: { email: string; password: string };
    }) => {
      await api<{ user: AuthUser; business: AuthBusiness }>("/auth/register", {
        method: "POST",
        body: input,
      });
      await loadSession();
    },
    [loadSession],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setBusiness(null);
    }
  }, []);

  const refreshBusiness = useCallback(async () => {
    const biz = await api<AuthBusiness>("/businesses/me");
    setBusiness(biz);
  }, []);

  return (
    <AuthContext.Provider value={{ user, business, loading, login, register, logout, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
