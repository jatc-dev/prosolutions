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
  signInWithToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  validateSession: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "procv_auth";
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
    try {
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ accessToken }));
      api.setToken(accessToken);
      set({ user, accessToken, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },

  signInWithToken: async (accessToken) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ accessToken }));
    api.setToken(accessToken);
    try {
      const response = await fetch(IDENTITY_ME_URL, {
        method: "GET",
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      const user = data?.user ?? null;
      set({ user, accessToken, isAuthenticated: true });
    } catch {
      set({ accessToken, isAuthenticated: Boolean(accessToken) });
    }
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
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    api.setToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return;

    try {
      JSON.parse(stored);
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    try {
      const response = await fetchIdentity("/refresh");
      const { accessToken: newAccessToken } = await response.json();

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ accessToken: newAccessToken }));
      api.setToken(newAccessToken);

      const meResponse = await fetch(IDENTITY_ME_URL, {
        method: "GET",
        credentials: "include",
      });
      const meData = await meResponse.json();
      const user = meData?.user ?? null;

      set({ user, accessToken: newAccessToken, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  setAccessToken: (token) => {
    api.setToken(token);
    set({ accessToken: token, isAuthenticated: Boolean(token) });
  },

  validateSession: async () => {
    try {
      const response = await fetch(IDENTITY_ME_URL, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      const user = data?.user ?? null;
      const accessToken = localStorage.getItem(LOCAL_STORAGE_KEY)
        ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!).accessToken
        : null;
      set({ user, accessToken, isAuthenticated: true });
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      api.setToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },
}));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { validateSession, refreshToken, setAccessToken } = useAuthStore();

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      useAuthStore.setState({ loading: false });
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
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      useAuthStore.setState({ loading: false });
    }
  }, [validateSession, refreshToken, setAccessToken]);

  return children;
}

export function useAuth() {
  return useAuthStore();
}
