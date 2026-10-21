import create from "zustand";
import { useEffect } from "react";
import { api } from "../services/api";
import React from "react";

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
  register: (email: string, password: string, name?: string) => Promise<void>;
  signInWithToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  validateSession: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "procv_auth";
const IDENTITY_ME_URL =
  import.meta.env.VITE_IDENTITY_API_URL ||
  "https://identity.prosolutions.page/api/auth/me";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,

  login: async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { accessToken, user } = response.data;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ accessToken }));
      api.setToken(accessToken);
      set({ user, accessToken, isAuthenticated: true });
    } catch (error: any) {
      if (error.response?.status === 403) {
        return { requiresVerification: true };
      }
      throw error;
    }
  },
  register: async (email, password, name) => {
    // Registration never issues credentials anymore: the account must verify
    // its email first (login enforces it). Any tokens in the response are
    // deliberately ignored so an unverified session can never be created.
    await api.post("/auth/register", { email, password, name });
  },

  signInWithToken: async (accessToken) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ accessToken }));
    api.setToken(accessToken);
    const meResponse = await api.get("/auth/me");
    const user = meResponse.data?.user ?? null;
    set({ user, accessToken, isAuthenticated: true });
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
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
      const response = await api.post(
        "/auth/refresh",
        {},
        { _skipAuthRetry: true } as object
      );
      const { accessToken: newAccessToken } = response.data;

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ accessToken: newAccessToken }));
      api.setToken(newAccessToken);

      const meResponse = await api.get("/auth/me");
      const user = meResponse.data?.user ?? null;

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
      const response = await api.get(IDENTITY_ME_URL, { withCredentials: true });
      const data = response.data;
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
        // Validate session with identity service before considering authenticated
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
