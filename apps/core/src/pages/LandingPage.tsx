import { ProFooter, ProHeader } from "@prosolutions/ui";
import { AdsSection } from "../components/AdsSection";
import { Hero } from "../components/Hero";
import { Modules } from "../components/Modules";
import { useCoreLocale } from "../i18n";
import { useCallback, useEffect, useState } from "react";
import { identityAuthApiUrl } from "../identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();
const ACCESS_TOKEN_KEY = "pro_identity_token";

interface LandingUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  modules?: string[];
}

async function fetchCurrentUser(token: string): Promise<Response> {
  return fetch(`${IDENTITY_API_URL}/me`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function LandingPage() {
  const { locale, setLocale } = useCoreLocale();
  const [user, setUser] = useState<LandingUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        let response = token ? await fetchCurrentUser(token) : null;

        if (!response?.ok) {
          const refresh = await fetch(`${IDENTITY_API_URL}/refresh`, {
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
    return () => { active = false; };
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch(`${IDENTITY_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Clear the local UI even if the Identity service is temporarily unavailable.
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setUser(null);
      window.location.assign("/");
    }
  }, []);

  return (
    <div className="ui-page flex min-h-screen flex-col">
      <ProHeader
        activeApp="core"
        locale={locale}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
        profile={user ? { name: user.name, email: user.email } : null}
        profileHref="/dashboard"
        securityHref="/security/sessions"
        onSignOut={user ? handleSignOut : undefined}
        loginHref="/login?returnTo=%2F"
        authLoading={authLoading}
      />
      <main className="flex-1">
        <Hero />
        <Modules />
        <AdsSection />
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
