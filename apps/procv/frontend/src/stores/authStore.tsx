import create from "zustand";
import { useEffect } from "react";
import { api } from "../services/api";
import React from "react";
import { identityAuthApiUrl } from "../lib/identityUrl";

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
  modules?: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresVerification?: boolean } | void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  validateSession: () => Promise<void>;
}

const LEGACY_STORAGE_KEY = "procv_auth";
const SESSION_STORAGE_KEY = "procv_access_token";
const IDENTITY_AUTH_URL = identityAuthApiUrl();
const IDENTITY_ME_URL = `${IDENTITY_AUTH_URL}/me`;

function readSessionAccessToken(): string | null {
  const sessionToken = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionToken) return sessionToken;

  // One-time migration from the old persistent localStorage representation.
  // Tokens now live only for this browser tab; the refresh credential remains
  // in the shared HttpOnly cookie and is never readable by JavaScript.
  const legacyValue = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyValue) return null;
  try {
    const parsed = JSON.parse(legacyValue) as { accessToken?: unknown };
    if (typeof parsed.accessToken === "string" && parsed.accessToken) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, parsed.accessToken);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return parsed.accessToken;
    }
  } catch {
    // Remove malformed legacy state below.
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return null;
}

function storeSessionAccessToken(token: string | null) {
  if (token) sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function readTokenModules(token: string): string[] | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { modules?: unknown };
    return Array.isArray(payload.modules) && payload.modules.every((value) => typeof value === "string")
      ? payload.modules
      : null;
  } catch {
    return null;
  }
}

function sameModuleSet(token: string, modules: unknown): boolean {
  const tokenModules = readTokenModules(token);
  if (!tokenModules || !Array.isArray(modules)) return false;
  const current = modules.filter((value): value is string => typeof value === "string");
  if (current.length !== modules.length || current.length !== tokenModules.length) return false;
  const tokenSet = new Set(tokenModules);
  return tokenSet.size === tokenModules.length && current.every((module) => tokenSet.has(module));
}

async function fetchIdentity(path: string, options: RequestInit = {}) {
  return fetch(`${IDENTITY_AUTH_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,

  login: async (email, password) => {
    const response = await fetchIdentity("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403) {
        return { requiresVerification: true };
      }
      throw new Error(errorData.message || "Login failed");
    }

    const { accessToken, user } = await response.json();
    if (!accessToken || !user) {
      throw new Error("Login response did not include an access token and user");
    }

    storeSessionAccessToken(accessToken);
    api.setToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await fetchIdentity("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${get().accessToken || ""}` },
      });
    } catch {
      // Local cleanup must still complete if Identity is temporarily unavailable.
    }
    storeSessionAccessToken(null);
    api.setToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    try {
      const response = await fetchIdentity("/refresh", { method: "POST" });
      if (!response.ok) throw new Error("Session refresh failed");

      const { accessToken: newAccessToken } = await response.json();
      if (!newAccessToken) throw new Error("Refresh response did not include an access token");

      const meResponse = await fetch(IDENTITY_ME_URL, {
        method: "GET",
        credentials: "include",
        headers: { Authorization: `Bearer ${newAccessToken}` },
      });
      if (!meResponse.ok) throw new Error("Unable to validate the refreshed access token");

      const meData = await meResponse.json();
      const user = meData?.user ?? null;
      if (!user) throw new Error("Identity response did not include a user");

      storeSessionAccessToken(newAccessToken);
      api.setToken(newAccessToken);
      set({ user, accessToken: newAccessToken, isAuthenticated: true });
    } catch {
      storeSessionAccessToken(null);
      api.setToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },

  setAccessToken: (token) => {
    storeSessionAccessToken(token);
    api.setToken(token);
    set({ accessToken: token, isAuthenticated: Boolean(token) });
  },

  validateSession: async () => {
    const accessToken = get().accessToken || readSessionAccessToken();
    if (!accessToken) {
      throw new Error("No access token is available to validate");
    }

    const response = await fetch(IDENTITY_ME_URL, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error("Session validation failed");

    const data = await response.json();
    const user = data?.user ?? null;
    if (!user) throw new Error("Identity response did not include a user");
    // The /me response reflects current database grants, while the JWT may be
    // older. Force one refresh on bootstrap if a module grant changed.
    if (!sameModuleSet(accessToken, user.modules)) {
      throw new Error("Identity module grants changed; refreshing the token");
    }

    storeSessionAccessToken(accessToken);
    api.setToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },
}));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { validateSession, refreshToken, setAccessToken } = useAuthStore();

  useEffect(() => {
    const stored = readSessionAccessToken();
    if (!stored) {
      // Each module bootstraps its own short-lived access token from the same
      // HttpOnly refresh cookie; this also supports fresh tabs and SSO.
      refreshToken().finally(() => useAuthStore.setState({ loading: false }));
      return;
    }

    setAccessToken(stored);
    validateSession()
      .catch(() => refreshToken())
      .finally(() => useAuthStore.setState({ loading: false }));
  }, [validateSession, refreshToken, setAccessToken]);

  return children;
}

export function useAuth() {
  return useAuthStore();
}
