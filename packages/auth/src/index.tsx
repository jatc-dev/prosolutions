import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import create from "zustand";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
  modules?: string[];
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

declare global {
  interface ImportMetaEnv {
    VITE_IDENTITY_URL?: string;
    VITE_IDENTITY_API_URL?: string;
  }
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const env = (import.meta as ImportMeta).env;

export const IDENTITY_URL =
  env.VITE_IDENTITY_URL ?? "https://identity.prosolutions.page";
export const IDENTITY_API_URL =
  env.VITE_IDENTITY_API_URL ?? `${IDENTITY_URL}/api/auth`;

export const authHttp: AxiosInstance = axios.create({
  baseURL: IDENTITY_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Access tokens are held in memory only; refresh credentials stay in HttpOnly cookies. */
let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) {
    authHttp.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete authHttp.defaults.headers.common["Authorization"];
  }
}

authHttp.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
    return config;
  },
  (error) => Promise.reject(error),
);

type AuthActions = {
  login: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,

  login: async (accessToken) => {
    setAuthToken(accessToken);
    set({ accessToken, loading: true });
    await get().validateSession();
  },

  logout: async () => {
    try {
      await authHttp.post("/logout");
    } catch {
      // Clear local authentication state even if Identity is unavailable.
    } finally {
      setAuthToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false, loading: false });
    }
  },

  validateSession: async () => {
    set({ loading: true });
    try {
      let token = get().accessToken;
      let response: AxiosResponse | undefined;

      if (token) {
        try {
          response = await authHttp.get("/me");
        } catch {
          response = undefined;
        }
      }

      // On a fresh page load (or an expired access token), exchange the
      // central HttpOnly refresh cookie for a short-lived in-memory token.
      if (!response?.data?.user) {
        const refreshResponse = await authHttp.post("/refresh");
        token = refreshResponse.data?.accessToken;
        if (!token) throw new Error("Identity did not return an access token");
        setAuthToken(token);
        set({ accessToken: token });
        response = await authHttp.get("/me");
      }

      const user = response.data?.user ?? null;
      if (!user) throw new Error("Identity did not return a user profile");
      set({ user, accessToken: token, isAuthenticated: true });
    } catch {
      setAuthToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },

  setAccessToken: (token) => {
    setAuthToken(token);
    set({
      accessToken: token,
      isAuthenticated: Boolean(token),
      ...(token ? {} : { user: null }),
    });
  },
}));

export interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, isAuthenticated, loading, validateSession } =
    useAuthStore();

  useEffect(() => {
    // Remove the legacy persisted bearer token; never restore it.
    try {
      window.localStorage.removeItem("procv_auth");
    } catch {
      // Storage may be unavailable in hardened browser contexts.
    }
    void validateSession();
  }, [validateSession]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${IDENTITY_URL}/login?redirect_uri=${redirectUri}`;
    return null;
  }

  return <>{children}</>;
}
