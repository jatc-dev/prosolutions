import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@prosolutions/ui";
type ThemePreference = "light" | "dark" | "system";
import { useAuth, useAuthStore } from "../stores/authStore";
import { identityAuthApiUrl } from "../lib/identityUrl";

const IDENTITY_API = identityAuthApiUrl().replace(/\/api\/auth$/i, "");

export function GlobalPreferencesBootstrap() {
  const { accessToken, isAuthenticated, loading, refreshToken } = useAuth();
  const { setPreference } = useTheme();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    let active = true;
    const load = async () => {
      let token = accessToken;
      if (!token) return;
      const request = (bearer: string) => fetch(`${IDENTITY_API}/api/preferences/me`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${bearer}` },
      });
      let response = await request(token);
      if (response.status === 401) {
        await refreshToken();
        token = useAuthStore.getState().accessToken;
        if (!token) return;
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
  }, [accessToken, isAuthenticated, loading, i18n, refreshToken, setPreference]);

  return null;
}
