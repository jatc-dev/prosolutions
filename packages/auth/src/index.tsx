import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import create from "zustand";

/*──────────────────────────────────────────────────────────────
  1. Tipos
──────────────────────────────────────────────────────────────*/

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

/*──────────────────────────────────────────────────────────────
  2. Configuración de entorno
──────────────────────────────────────────────────────────────*/

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

/*──────────────────────────────────────────────────────────────
  3. Cliente HTTP preconfigurado (credentials: 'include')
──────────────────────────────────────────────────────────────*/

export const authHttp: AxiosInstance = axios.create({
  baseURL: IDENTITY_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* Inject Bearer token from Zustand store on every request */
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
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/*──────────────────────────────────────────────────────────────
  4. Zustand store
──────────────────────────────────────────────────────────────*/

const LOCAL_STORAGE_KEY = "procv_auth";

export const useAuthStore = create<AuthState & {
  login: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,

  login: async (accessToken) => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ accessToken }),
    );
    setAuthToken(accessToken);
    set({ accessToken, isAuthenticated: true });

    await get().validateSession();
  },

  logout: async () => {
    try {
      await authHttp.post("/logout");
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setAuthToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  validateSession: async () => {
    try {
      const response = await authHttp.get("/me");
      const data = response.data;
      const user = data?.user ?? null;
      set({ user, isAuthenticated: true });
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setAuthToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },

  setAccessToken: (token) => {
    setAuthToken(token);
    set({ accessToken: token, isAuthenticated: Boolean(token) });
  },
}));

/*──────────────────────────────────────────────────────────────
  5. React Context (AuthProvider)
──────────────────────────────────────────────────────────────*/

const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(
  null,
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { accessToken, validateSession, setAccessToken } =
    useAuthStore();

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      setAccessToken(null);
      return;
    }
    try {
      const { accessToken: storedToken } = JSON.parse(stored);
      if (storedToken) {
        setAccessToken(storedToken);
        validateSession().catch(() => {});
      }
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setAccessToken(null);
    }
  }, [validateSession, setAccessToken]);

  return (
    <AuthContext.Provider value={useAuthStore()}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

/*──────────────────────────────────────────────────────────────
  6. ProtectedRoute
──────────────────────────────────────────────────────────────*/

export function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
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
    const identityUrl =
      import.meta.env.VITE_IDENTITY_URL ??
      "https://identity.prosolutions.page";
    window.location.href = `${identityUrl}/login?redirect_uri=${redirectUri}`;
    return null;
  }

  return <>{children}</>;
}

/*──────────────────────────────────────────────────────────────
  7. Index exports
──────────────────────────────────────────────────────────────*/

export {
  authHttp,
  setAuthToken,
  IDENTITY_URL,
  IDENTITY_API_URL,
  useAuthStore,
  AuthProvider,
  useAuth,
  ProtectedRoute,
};
export type { UserProfile, AuthState };
