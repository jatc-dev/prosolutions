/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../../packages/ui/src/**/*.{ts,tsx}", "./node_modules/@prosolutions/ui/dist/**/*.js"],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e5edff",
          100: "#dce8ff",
          200: "#b9d0ff",
          400: "#73a0ff",
          500: "#3563e9",
          600: "#264fc7",
          700: "#203f9f"
        },
        procv: {
          50: "#e5edff",
          100: "#dce8ff",
          200: "#b9d0ff",
          300: "#93b5ff",
          400: "#73a0ff",
          500: "#3563e9",
          600: "#264fc7",
          700: "#203f9f",
          800: "#1d347d",
          950: "#111827"
        },
        projobs: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          950: "#022c22"
        }
      },
      borderRadius: {
        card: "0.875rem",
        panel: "1rem"
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.06)",
        panel: "0 10px 24px -16px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};
