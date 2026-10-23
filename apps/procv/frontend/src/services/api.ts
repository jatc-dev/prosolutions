import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "react-hot-toast";
import { identityAuthApiUrl } from "../lib/identityUrl";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";
const IDENTITY_AUTH_URL = identityAuthApiUrl();

const MAX_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const RETRYABLE_STATUSES = new Set([429]);

type RequestConfig = InternalAxiosRequestConfig & {
  __retryCount?: number;
  _csrfRetried?: boolean;
  _retried?: boolean;
  _skipAuthRetry?: boolean;
  _skipErrorToast?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Only idempotent GETs retry, and never the auth/CSRF bootstrap endpoints
// (those have their own single retry and token refresh logic).
function isRetryableRequest(error: AxiosError): boolean {
  const config = error.config as RequestConfig | undefined;
  if (!config) return false;
  const method = (config.method ?? "get").toUpperCase();
  if (method !== "GET") return false;
  const url = config.url ?? "";
  if (url.includes("/auth/") || url.includes("/csrf-token")) return false;
  if (!error.response) return true; // network error, timeout or offline
  const status = error.response.status;
  return status >= 500 || RETRYABLE_STATUSES.has(status);
}

let csrfToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

export async function fetchCSRFToken(): Promise<string> {
  // Dedupe concurrent callers (app bootstrap + request interceptor): parallel
  // cookie-less requests would each mint a different server-side token and
  // desynchronize the cookie from the header ("CSRF token mismatch").
  if (!csrfFetchPromise) {
    csrfFetchPromise = (async () => {
      try {
        const response = await publicApi.get("/csrf-token");
        csrfToken = response.data.csrfToken || null;
        if (csrfToken) {
          publicApi.defaults.headers.common["X-CSRF-Token"] = csrfToken;
          instance.defaults.headers.common["X-CSRF-Token"] = csrfToken;
        }
        return csrfToken || "";
      } catch {
        return "";
      } finally {
        csrfFetchPromise = null;
      }
    })();
  }
  return csrfFetchPromise;
}

export function getCSRFToken(): string | null {
  return csrfToken;
}

// Public instance without authentication interceptors for public endpoints
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

publicApi.interceptors.request.use(
  async (config) => {
    const method = config.method?.toUpperCase();
    const isSafe = method === "GET" || method === "HEAD" || method === "OPTIONS";
    if (!isSafe) {
      if (!csrfToken) {
        await fetchCSRFToken();
      }
      if (csrfToken) {
        config.headers = config.headers ?? {};
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

instance.interceptors.request.use(
  async (config) => {
    const method = config.method?.toUpperCase();
    const isSafe = method === "GET" || method === "HEAD" || method === "OPTIONS";
    if (!isSafe && !config.headers?.["X-CSRF-Token"]) {
      if (!csrfToken) {
        await fetchCSRFToken();
      }
      if (csrfToken) {
        config.headers = config.headers ?? {};
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise: Promise<string | null> | null = null;

function redirectToLogin() {
  const centralLogin = `${import.meta.env.VITE_PROSOLUTIONS_URL || "https://prosolutions.page"}/login`;
  if (window.location.href !== centralLogin) {
    window.location.assign(centralLogin);
  }
}

async function doRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${IDENTITY_AUTH_URL}/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    const { accessToken } = await response.json();
    if (accessToken) {
      instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Transient failure retry: exponential backoff with jitter for safe GETs.
    if (isRetryableRequest(error) && (originalRequest.__retryCount ?? 0) < MAX_GET_RETRIES) {
      originalRequest.__retryCount = (originalRequest.__retryCount ?? 0) + 1;
      const backoff = RETRY_BASE_DELAY_MS * 2 ** (originalRequest.__retryCount - 1);
      await sleep(backoff + Math.random() * RETRY_BASE_DELAY_MS);
      return instance(originalRequest);
    }

    if (error.response?.status !== 401 && error.response?.status !== 403) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message ||
        "An error occurred";
      if (!originalRequest._skipErrorToast) {
        if (error.response?.status === 400) {
          return Promise.reject(error);
        }
        toast.error(message);
      }
      return Promise.reject(error);
    }

    // Handle 403 CSRF errors - fetch new token and retry once
    if (error.response?.status === 403 && !originalRequest._csrfRetried) {
      originalRequest._csrfRetried = true;
      await fetchCSRFToken();
      if (csrfToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers["X-CSRF-Token"] = csrfToken;
      }
      return instance(originalRequest);
    }

    if (originalRequest._skipAuthRetry) {
      instance.defaults.headers.common.Authorization = "";
      redirectToLogin();
      return Promise.reject(error);
    }

    if (originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    if (!refreshPromise) {
      refreshPromise = doRefresh();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (!newToken) {
      instance.defaults.headers.common.Authorization = "";
      redirectToLogin();
      return Promise.reject(error);
    }

    instance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return instance(originalRequest);
  }
);

export const api = {
  get: instance.get.bind(instance),
  post: instance.post.bind(instance),
  put: instance.put.bind(instance),
  delete: instance.delete.bind(instance),
  setToken: (token: string | null) => {
    if (token) {
      instance.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete instance.defaults.headers.common.Authorization;
    }
  },
};
