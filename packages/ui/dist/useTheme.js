import { useCallback, useEffect, useState } from "react";
/** Clave y formato compartidos con apps/procv y apps/core para una preferencia unificada. */
const STORAGE_KEY = "theme-storage";
const THEME_COOKIE = "prosolutions_theme";
function readCookiePreference() {
    try {
        const entry = document.cookie.split("; ").find((part) => part.startsWith(THEME_COOKIE + "="));
        const value = entry?.split("=").slice(1).join("=");
        return value === "light" || value === "dark" ? value : null;
    }
    catch {
        return null;
    }
}
function persistPreference(preference) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { preference } }));
    }
    catch {
        /* ignore */
    }
    if (preference === "light" || preference === "dark") {
        document.cookie = THEME_COOKIE + "=" + preference + "; Domain=.prosolutions.page; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
    }
    else {
        document.cookie = THEME_COOKIE + "=; Domain=.prosolutions.page; Path=/; Max-Age=0; SameSite=Lax; Secure";
    }
}
function readPreference() {
    const cookiePreference = readCookiePreference();
    if (cookiePreference)
        return cookiePreference;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const stored = parsed?.state?.preference ?? parsed?.state?.theme;
            if (stored === "light" || stored === "dark")
                return stored;
        }
    }
    catch {
        /* ignore */
    }
    return "system";
}
function systemTheme() {
    if (typeof window === "undefined" || !window.matchMedia)
        return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(resolved) {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
}
/** Tema unificado del ecosistema: preferencia persistente + seguimiento del SO. */
export function useTheme() {
    const [preference, setPreference] = useState(() => typeof window === "undefined" ? "system" : readPreference());
    const [resolved, setResolved] = useState(() => typeof window === "undefined" ? "light" : preference === "system" ? systemTheme() : preference);
    useEffect(() => {
        const next = preference === "system" ? systemTheme() : preference;
        setResolved(next);
        applyTheme(next);
        try {
            persistPreference(preference);
        }
        catch {
            /* ignore */
        }
    }, [preference]);
    useEffect(() => {
        if (preference !== "system" || !window.matchMedia)
            return;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            const next = media.matches ? "dark" : "light";
            setResolved(next);
            applyTheme(next);
        };
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [preference]);
    const toggle = useCallback(() => {
        setPreference((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);
    return { theme: resolved, preference, setPreference, toggle };
}
