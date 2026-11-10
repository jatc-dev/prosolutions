import { useEffect } from "react";
import { useTheme } from "@prosolutions/ui";
type ThemePreference = "light" | "dark" | "system";
import { useCoreLocale } from "./i18n";
import { loadUserPreferences } from "./preferencesApi";

export function PreferencesBootstrap() {
  const { setPreference } = useTheme();
  const { setLocale } = useCoreLocale();

  useEffect(() => {
    let active = true;
    loadUserPreferences().then((preferences) => {
      if (!active) return;
      if (preferences.theme) setPreference(preferences.theme as ThemePreference);
      if (preferences.locale) setLocale(preferences.locale);
    }).catch(() => {
      // Anonymous visitors and expired sessions keep their local defaults.
    });
    return () => { active = false; };
  }, [setLocale, setPreference]);

  return null;
}
