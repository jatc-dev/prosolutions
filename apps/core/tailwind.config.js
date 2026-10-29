/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}", "../node_modules/@prosolutions/ui/dist/**/*.js"],
  darkMode: "class",
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
        }
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "Inter", "-apple-system", "BlinkMacSystemFont", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
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
