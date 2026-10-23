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

const SESSION_STORAGE_KEY = "procv_auth";
const LEGACY_LOCAL_STORAGE_KEY = "procv_auth";
const IDENTITY_AUTH_URL = identityAuthApiUrl();
const IDENTITY_ME_URL = `${IDENTITY_AUTH_URL}/me`;

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

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken }));
    api.setToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },


  logout: async () => {
    try {
      await fetchIdentity("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${get().accessToken}` },
      });
    } catch {
      // Ignore errors during logout
    }
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    api.setToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed?.accessToken) throw new Error("Stored session does not contain an access token");
      } catch {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        api.setToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      }
    }

    // Bootstrap this origin's token from the shared HttpOnly cookie instead of URL tokens.
    try {
      const response = await fetchIdentity("/refresh", { method: "POST" });
      if (!response.ok) {
        throw new Error("Session refresh failed");
      }

      const { accessToken: newAccessToken } = await response.json();
      if (!newAccessToken) {
        throw new Error("Refresh response did not include an access token");
      }

      const meResponse = await fetch(IDENTITY_ME_URL, {
        method: "GET",
        credentials: "include",
        headers: { Authorization: `Bearer ${newAccessToken}` },
      });
      if (!meResponse.ok) {
        throw new Error("Unable to validate the refreshed access token");
      }

      const meData = await meResponse.json();
      const user = meData?.user ?? null;
      if (!user) {
        throw new Error("Identity response did not include a user");
      }

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken: newAccessToken }));
      api.setToken(newAccessToken);
      set({ user, accessToken: newAccessToken, isAuthenticated: true });
    } catch {
      await get().logout();
    }
  },

  setAccessToken: (token) => {
    api.setToken(token);
    set({ accessToken: token, isAuthenticated: Boolean(token) });
  },

  validateSession: async () => {
    const accessToken = get().accessToken;
    if (!accessToken) {
      throw new Error("No access token is available to validate");
    }

    const response = await fetch(IDENTITY_ME_URL, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("Session validation failed");
    }

    const data = await response.json();
    const user = data?.user ?? null;
    if (!user) {
      throw new Error("Identity response did not include a user");
    }

    set({ user, accessToken, isAuthenticated: true });
  },
}));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { validateSession, refreshToken, setAccessToken } = useAuthStore();

  useEffect(() => {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      refreshToken().catch(() => {}).finally(() => useAuthStore.setState({ loading: false }));
      return;
    }
    try {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) {
        setAccessToken(accessToken);
        validateSession()
          .catch(() => refreshToken().catch(() => {}))
          .finally(() => useAuthStore.setState({ loading: false }));
      } else {
        useAuthStore.setState({ loading: false });
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      useAuthStore.setState({ loading: false });
    }
  }, [validateSession, refreshToken, setAccessToken]);

  return children;
}

export function useAuth() {
  return useAuthStore();
}
