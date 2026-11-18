import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SessionInfo } from "../../server/src/contracts";
import { ApiError, apiRequest, type RequestOptions } from "./api";
import { IDENTITY_API_URL, loginUrl } from "./env";

interface Profile {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface SessionState {
  status: "loading" | "anonymous" | "authenticated";
  session: SessionInfo | null;
  profile: Profile | null;
  /** Authenticated request to the ProJobs API; refreshes the token once on 401. */
  request: <T>(path: string, options?: Omit<RequestOptions, "token">) => Promise<T>;
  refreshSession: () => Promise<void>;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

/** Access tokens live only in memory; the refresh credential stays in ProIdentity's HttpOnly cookie. */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${IDENTITY_API_URL}/refresh`, { method: "POST", credentials: "include" });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body?.accessToken === "string" ? body.accessToken : null;
  } catch {
    return null;
  }
}

async function loadProfile(token: string): Promise<Profile | null> {
  try {
    const response = await fetch(`${IDENTITY_API_URL}/me`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" });
    if (!response.ok) return null;
    const { user } = await response.json();
    return { name: user?.name ?? null, email: user?.email ?? "", avatarUrl: user?.professionalProfile?.avatarUrl ?? null };
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const renewToken = useCallback(async () => {
    // Deduplicate concurrent refreshes (several requests failing at once).
    refreshing.current ??= refreshAccessToken().finally(() => {
      refreshing.current = null;
    });
    tokenRef.current = await refreshing.current;
    return tokenRef.current;
  }, []);

  const request = useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, "token"> = {}): Promise<T> => {
      const token = tokenRef.current;
      try {
        return await apiRequest<T>(path, { ...options, token });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !token) throw error;
        const renewed = await renewToken();
        if (!renewed) {
          setStatus("anonymous");
          setSession(null);
          throw error;
        }
        return apiRequest<T>(path, { ...options, token: renewed });
      }
    },
    [renewToken],
  );

  const refreshSession = useCallback(async () => {
    const token = tokenRef.current ?? (await renewToken());
    if (!token) {
      setStatus("anonymous");
      setSession(null);
      setProfile(null);
      return;
    }
    try {
      const [info, identityProfile] = await Promise.all([
        request<SessionInfo>("/api/me"),
        loadProfile(tokenRef.current ?? token),
      ]);
      setSession(info);
      setProfile(identityProfile ?? { name: null, email: info.email ?? "", avatarUrl: null });
      setStatus("authenticated");
    } catch {
      tokenRef.current = null;
      setSession(null);
      setStatus("anonymous");
    }
  }, [renewToken, request]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(() => {
    window.location.href = loginUrl();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch(`${IDENTITY_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
        headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
      });
    } finally {
      tokenRef.current = null;
      setSession(null);
      setProfile(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo<SessionState>(
    () => ({ status, session, profile, request, refreshSession, signIn, signOut }),
    [status, session, profile, request, refreshSession, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
