/**
 * Tokens de diseño compartidos del ecosistema ProSolutions.
 *
 * Sirven como fuente única de verdad para colores semánticos, superficies,
 * texto, bordes, tipografía, espaciado, radios, sombras, foco y transiciones.
 * Los valores están pensados para usarse tanto en CSS (variables CSS) como
 * directamente en componentes TypeScript.
 */
export const tokens = {
    // ---------------------------------------------------------------------------
    // Colores semánticos
    // ---------------------------------------------------------------------------
    color: {
        // Primaria (azul índigo principal de la marca)
        primary: {
            50: "#eff6ff",
            100: "#dbe5ff",
            200: "#b7cbff",
            300: "#8db3ff",
            400: "#648aff",
            500: "#3f6ff5",
            600: "#2e5bf0",
            700: "#244bd9",
            800: "#1c3db3",
            900: "#132f8c",
        },
        // Secundaria (cian acento)
        secondary: {
            50: "#e0f7ff",
            100: "#b8e9ff",
            200: "#83d8ff",
            300: "#4ec6ff",
            400: "#22b7ff",
            500: "#00a4e4",
            600: "#008cc0",
            700: "#0073a3",
            800: "#005b84",
            900: "#004367",
        },
        // Superficies
        surface: {
            base: "#ffffff",
            elevated: "#f8fafc",
            raised: "#f1f5f9",
            inset: "#f0f2f5",
            dark: "#0f172a",
            darkElevated: "#0b1120",
            darkRaised: "#0c1526",
            darkInset: "#0a0f1c",
        },
        // Texto
        text: {
            primary: "#0f172a",
            secondary: "#475569",
            muted: "#64748b",
            inverted: "#ffffff",
            onPrimary: "#ffffff",
            onSecondary: "#ffffff",
        },
        // Bordes
        border: {
            light: "#e2e8f0",
            medium: "#cbd5e1",
            dark: "#94a3b8",
            darkSurface: "#1e293b",
            focus: "#3f6ff5",
        },
        // Estados
        state: {
            success: "#10b981",
            warning: "#f59e0b",
            error: "#ef4444",
            info: "#3f6ff5",
            successBg: "#ecfdf5",
            warningBg: "#fffbeb",
            errorBg: "#fef2f2",
            infoBg: "#eff6ff",
        },
    },
    // ---------------------------------------------------------------------------
    // Tipografía
    // ---------------------------------------------------------------------------
    font: {
        family: {
            sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
        },
        size: {
            xs: "0.75rem",
            sm: "0.875rem",
            base: "1rem",
            lg: "1.125rem",
            xl: "1.25rem",
            "2xl": "1.5rem",
            "3xl": "1.875rem",
            "4xl": "2.25rem",
        },
        weight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
        },
        lineHeight: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
        },
        letterSpacing: {
            tight: "-0.025em",
            normal: "0em",
            wide: "0.05em",
        },
    },
    // ---------------------------------------------------------------------------
    // Espaciado
    // ---------------------------------------------------------------------------
    space: {
        0: "0",
        xs: "0.25rem",
        sm: "0.5rem",
        md: "0.75rem",
        base: "1rem",
        lg: "1.25rem",
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem",
        "4xl": "3rem",
    },
    // ---------------------------------------------------------------------------
    // Bordes y radios
    // ---------------------------------------------------------------------------
    border: {
        radius: {
            none: "0",
            sm: "0.25rem",
            md: "0.375rem",
            lg: "0.5rem",
            xl: "0.75rem",
            "2xl": "1rem",
            "3xl": "1.5rem",
            full: "9999px",
        },
        width: {
            thin: "1px",
            medium: "2px",
            thick: "3px",
        },
    },
    // ---------------------------------------------------------------------------
    // Sombras
    // ---------------------------------------------------------------------------
    shadow: {
        sm: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
        base: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)",
        md: "0 4px 6px -1px rgb(15 23 42 / 0.1), 0 2px 4px -2px rgb(15 23 42 / 0.1)",
        lg: "0 10px 15px -3px rgb(15 23 42 / 0.1), 0 4px 6px -4px rgb(15 23 42 / 0.1)",
        xl: "0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.1)",
    },
    // ---------------------------------------------------------------------------
    // Transiciones
    // ---------------------------------------------------------------------------
    transition: {
        fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
        base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
        slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    },
    // ---------------------------------------------------------------------------
    // Z-index
    // ---------------------------------------------------------------------------
    zIndex: {
        hide: -1,
        base: 0,
        docked: 10,
        dropdown: 100,
        sticky: 200,
        modal: 300,
        popover: 400,
        toast: 500,
    },
};
