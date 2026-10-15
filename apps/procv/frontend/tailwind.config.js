/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca"
        },
        procv: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          950: "#1e1b4b"
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
