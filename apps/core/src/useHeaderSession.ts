import { useCallback, useEffect, useState } from "react";
import { identityAuthApiUrl } from "./identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();
const ACCESS_TOKEN_KEY = "pro_identity_token";
const SESSION_REQUEST_TIMEOUT_MS = 10000;

export interface HeaderUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  modules?: string[];
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SESSION_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchCurrentUser(token: string): Promise<Response> {
  return fetchWithTimeout(`${IDENTITY_API_URL}/me`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Optional session for public pages: shows the account menu when the visitor
 * is signed in (SSO refresh cookie), and the login link otherwise. Never
 * redirects; public pages work the same for anonymous visitors.
 */
export function useHeaderSession() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        let response = token ? await fetchCurrentUser(token) : null;

        if (!response?.ok) {
          const refresh = await fetchWithTimeout(`${IDENTITY_API_URL}/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          if (!refresh.ok) {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            if (active) setUser(null);
            return;
          }
          const refreshed = await refresh.json().catch(() => ({}));
          token = refreshed?.accessToken;
          if (!token) {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            if (active) setUser(null);
            return;
          }
          sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
          response = await fetchCurrentUser(token);
        }

        if (!response?.ok) {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          if (active) setUser(null);
          return;
        }

        const result = await response.json().catch(() => ({}));
        if (active) setUser(result?.user ?? null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch(`${IDENTITY_API_URL}/logout`, { method: "POST", credentials: "include" });
    } catch {
      // Clear the local UI even if the Identity service is temporarily unavailable.
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setUser(null);
      window.location.assign("/");
    }
  }, []);

  return { user, authLoading, signOut };
}
