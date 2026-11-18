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
    // Primaria (esmeralda técnica)
    primary: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#047857",
      600: "#065f46",
      700: "#064e3b",
      800: "#022c22",
      900: "#022c22",
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
      base: "#f4f5f3",
      elevated: "#ffffff",
      raised: "#eceeea",
      inset: "#e4e7e2",
      dark: "#111210",
      darkElevated: "#191a17",
      darkRaised: "#292b26",
      darkInset: "#22241f",
    },
    // Texto
    text: {
      primary: "#202520",
      secondary: "#505a51",
      muted: "#505a51",
      inverted: "#ffffff",
      onPrimary: "#ffffff",
      onSecondary: "#ffffff",
    },
    // Bordes
    border: {
      light: "#d9ddd7",
      medium: "#737b70",
      dark: "#737b70",
      darkSurface: "#777f73",
      focus: "#047857",
    },
    // Estados
    state: {
      success: "#047857",
      warning: "#854d0e",
      error: "#b42336",
      info: "#047857",
      successBg: "#d1fae5",
      warningBg: "#fff4db",
      errorBg: "#ffebef",
      infoBg: "#d1fae5",
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
    sm: "0 1px 2px rgba(25, 32, 25, 0.05), 0 1px 1px rgba(25, 32, 25, 0.03)",
    base: "0 1px 2px rgba(25, 32, 25, 0.05), 0 1px 1px rgba(25, 32, 25, 0.03)",
    md: "0 2px 4px rgba(25, 32, 25, 0.05), 0 8px 18px -12px rgba(25, 32, 25, 0.18)",
    lg: "0 4px 8px rgba(25, 32, 25, 0.06), 0 16px 32px -22px rgba(25, 32, 25, 0.25)",
    xl: "0 4px 8px rgba(25, 32, 25, 0.06), 0 16px 32px -22px rgba(25, 32, 25, 0.25)",
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
} as const;

export type TokenColor = keyof typeof tokens.color;
export type TokenFontSize = keyof typeof tokens.font.size;
export type TokenFontWeight = keyof typeof tokens.font.weight;
export type TokenRadius = keyof typeof tokens.border.radius;
export type TokenSpace = keyof typeof tokens.space;
export type TokenShadow = keyof typeof tokens.shadow;
export type TokenTransition = keyof typeof tokens.transition;
