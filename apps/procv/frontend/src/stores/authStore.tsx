import create from "zustand";
import { useEffect } from "react";
import React from "react";
import { api } from "../services/api";
import { identityAuthApiUrl } from "../lib/identityUrl";
import { fetchWithTimeout, refreshAccessToken } from "../services/authRefresh";

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  emailVerified?: boolean;
  modules?: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

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

  logout: async () => {
    const token = get().accessToken;
    try {
      await fetchIdentity("/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Clear the local view even if Identity is temporarily unreachable.
    }
    api.setToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    const accessToken = await refreshAccessToken();
    const meResponse = await fetchWithTimeout(IDENTITY_ME_URL, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meResponse.ok) {
      api.setToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
      throw new Error("Identity session validation failed");
    }

    const data = await meResponse.json();
    const user = data?.user as UserProfile | null;
    if (!user) {
      api.setToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
      throw new Error("Identity did not return a user profile");
    }

    api.setToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },
}));

/**
 * ProCV never stores credentials or bearer tokens in localStorage.
 * On each fresh app load it exchanges the central HttpOnly refresh cookie
 * for a short-lived access token held only in memory.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refreshToken = useAuthStore((state) => state.refreshToken);

  useEffect(() => {
    let active = true;
    try {
      // Remove bearer tokens persisted by the retired ProCV login implementation.
      window.localStorage.removeItem("procv_auth");
    } catch {
      // Storage may be unavailable in hardened browser contexts.
    }
    refreshToken()
      .catch(() => {
        // No central session (guests) or Identity unreachable: stay signed out.
        // Expected on every guest visit, so it is not reported as an error.
        if (active) useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
      })
      .finally(() => {
        if (active) useAuthStore.setState({ loading: false });
      });
    return () => { active = false; };
  }, [refreshToken]);

  return children;
}

export function useAuth() {
  return useAuthStore();
}
