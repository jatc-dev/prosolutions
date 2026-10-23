import { createContext, useContext, useEffect, type ReactNode } from "react";
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import create from "zustand";

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
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
    VITE_PROSOLUTIONS_URL?: string;
  }
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const env = (import.meta as ImportMeta).env;

export const IDENTITY_URL = env.VITE_IDENTITY_URL ?? "https://identity.prosolutions.page";
export const IDENTITY_API_URL = env.VITE_IDENTITY_API_URL ?? `${IDENTITY_URL}/api/auth`;
export const PROSOLUTIONS_URL = env.VITE_PROSOLUTIONS_URL ?? "https://prosolutions.page";

const SESSION_STORAGE_KEY = "pro_identity_token";
const LEGACY_LOCAL_STORAGE_KEY = "procv_auth";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

function storeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  else sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

async function refreshFromSharedCookie(): Promise<string | null> {
  const response = await fetch(`${IDENTITY_API_URL.replace(/\/+$/, "")}/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) return null;
  const result = await response.json().catch(() => ({}));
  return typeof result?.accessToken === "string" ? result.accessToken : null;
}

export const authHttp: AxiosInstance = axios.create({
  baseURL: IDENTITY_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) authHttp.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete authHttp.defaults.headers.common.Authorization;
}

authHttp.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
    return config;
  },
  (error) => Promise.reject(error),
);

type AuthStore = AuthState & {
  login: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,

  login: async (accessToken) => {
    storeToken(accessToken);
    setAuthToken(accessToken);
    set({ accessToken, isAuthenticated: true, loading: true });
    await get().validateSession();
  },

  logout: async () => {
    try {
      await authHttp.post("/logout");
    } catch {
      // Clear this module's local state even when the network is unavailable.
    } finally {
      storeToken(null);
      setAuthToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false, loading: false });
    }
  },

  validateSession: async () => {
    set({ loading: true });
    let token = getStoredToken();
    if (token) setAuthToken(token);

    try {
      let response: { data: { user?: UserProfile | null } } | null = null;
      if (token) {
        try {
          response = await authHttp.get("/me");
        } catch {
          token = null;
          storeToken(null);
          setAuthToken(null);
        }
      }

      // A module can bootstrap SSO from the HttpOnly refresh cookie even when
      // sessionStorage is empty or a previous short-lived access token expired.
      if (!response) {
        token = await refreshFromSharedCookie();
        if (!token) throw new Error("No active ProIdentity session");
        storeToken(token);
        setAuthToken(token);
        response = await authHttp.get("/me");
      }

      if (!response) throw new Error("ProIdentity returned no response");
      const user = response.data?.user ?? null;
      if (!user) throw new Error("ProIdentity returned no user profile");

      set({ user, accessToken: token, isAuthenticated: true });
    } catch {
      storeToken(null);
      setAuthToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },

  setAccessToken: (token) => {
    storeToken(token);
    setAuthToken(token);
    set({ accessToken: token, isAuthenticated: Boolean(token) });
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
  const { user, accessToken, isAuthenticated, loading, validateSession } = useAuthStore();

  useEffect(() => {
    // Remove the old durable ProCV token once. New module sessions are tab-scoped
    // and re-created from the shared HttpOnly refresh cookie when required.
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    void validateSession();
  }, [validateSession]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", PROSOLUTIONS_URL);
    loginUrl.searchParams.set("redirect_uri", window.location.href);
    window.location.assign(loginUrl.toString());
    return null;
  }

  return <>{children}</>;
}
