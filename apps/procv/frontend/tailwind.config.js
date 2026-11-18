/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../../packages/ui/src/**/*.{ts,tsx}", "./node_modules/@prosolutions/ui/dist/**/*.js"],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f4f5f3", 100: "#eceeea", 200: "#d9ddd7", 300: "#c4c9c1",
          400: "#92998f", 500: "#737b70", 600: "#505a51", 700: "#3b403a",
          800: "#292b26", 900: "#191a17", 950: "#111210"
        },
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#047857",
          600: "#065f46",
          700: "#064e3b",
          800: "#022c22",
          900: "#022c22"
        },
        blue: {
          50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
          400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
          800: "#1e40af", 900: "#1e3a8a", 950: "#172554"
        },
        ui: {
          bg: "var(--ui-bg)",
          surface: "var(--ui-surface)",
          soft: "var(--ui-surface-soft)",
          raised: "var(--ui-surface-raised)",
          floating: "var(--ui-surface-floating)",
          border: "var(--ui-border)",
          text: "var(--ui-text)",
          muted: "var(--ui-text-muted)",
          accent: "var(--ui-accent)"
        },
        procv: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#047857",
          600: "#065f46",
          700: "#064e3b",
          800: "#022c22",
          950: "#111210"
        },
        projobs: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#059669",
          600: "#047857",
          700: "#065f46",
          800: "#064e3b",
          950: "#111210"
        }
      },
      borderRadius: {
        card: "0.875rem",
        panel: "1rem"
      },
      boxShadow: {
        sm: "var(--ui-shadow-sm)",
        md: "var(--ui-shadow-md)",
        lg: "var(--ui-shadow-floating)",
        xl: "var(--ui-shadow-floating)",
        "2xl": "0 8px 20px rgba(25, 32, 25, 0.16)",
        card: "var(--ui-shadow-sm)",
        panel: "var(--ui-shadow-md)",
        floating: "var(--ui-shadow-floating)"
      }
    }
  },
  plugins: []
};
