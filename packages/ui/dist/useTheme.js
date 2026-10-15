import { useCallback, useEffect, useState } from "react";
/** Clave y formato compartidos con apps/procv y apps/core para una preferencia unificada. */
const STORAGE_KEY = "theme-storage";
function readPreference() {
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { preference } }));
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
