export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
/** Tema unificado del ecosistema: preferencia persistente + seguimiento del SO. */
export declare function useTheme(): {
    theme: ResolvedTheme;
    preference: ThemePreference;
    setPreference: import("react").Dispatch<import("react").SetStateAction<ThemePreference>>;
    toggle: () => void;
};
