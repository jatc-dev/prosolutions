import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, type ThemePreference } from "@prosolutions/ui";
import { useAuth } from "../stores/authStore";
import { identityAuthApiUrl } from "../lib/identityUrl";

const AUTH_API = identityAuthApiUrl();
const IDENTITY_API = AUTH_API.replace(/\/api\/auth$/i, "");
const TOKEN_KEY = "pro_identity_token";

export function GlobalPreferencesBootstrap() {
  const { isAuthenticated, loading } = useAuth();
  const { setPreference } = useTheme();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    let active = true;
    const load = async () => {
      let token = sessionStorage.getItem(TOKEN_KEY);
      const request = (bearer: string) => fetch(`${IDENTITY_API}/api/preferences/me`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!token) {
        const refresh = await fetch(`${AUTH_API}/refresh`, { method: "POST", credentials: "include" });
        if (!refresh.ok) return;
        const data = await refresh.json();
        token = data.accessToken;
        if (!token) return;
        sessionStorage.setItem(TOKEN_KEY, token);
      }
      let response = await request(token);
      if (response.status === 401) {
        const refresh = await fetch(`${AUTH_API}/refresh`, { method: "POST", credentials: "include" });
        if (!refresh.ok) return;
        const data = await refresh.json();
        token = data.accessToken;
        if (!token) return;
        sessionStorage.setItem(TOKEN_KEY, token);
        response = await request(token);
      }
      if (!response.ok) return;
      const data = await response.json();
      if (!active) return;
      if (data.preferences?.theme) setPreference(data.preferences.theme as ThemePreference);
      if (data.preferences?.locale === "es" || data.preferences?.locale === "en") {
        await i18n.changeLanguage(data.preferences.locale);
      }
    };
    void load().catch(() => undefined);
    return () => { active = false; };
  }, [isAuthenticated, loading, i18n, setPreference]);

  return null;
}
