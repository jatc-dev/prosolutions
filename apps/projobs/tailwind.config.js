/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}", "../../packages/ui/dist/**/*.js"],
  darkMode: "class",
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
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
          400: "#34d399", 500: "#047857", 600: "#065f46", 700: "#064e3b",
          800: "#022c22", 900: "#022c22", 950: "#111210"
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
        }
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "Inter", "-apple-system", "BlinkMacSystemFont", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
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
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        float: "float 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
