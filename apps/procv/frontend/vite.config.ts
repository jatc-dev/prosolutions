import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Export dependencies are intentionally lazy-loaded and can exceed default warning thresholds.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          // Keep feature-heavy libraries isolated first.
          if (id.includes("html2pdf.js")) {
            return "vendor-export";
          }

          if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
            return "vendor-charts";
          }

          if (id.includes("@dnd-kit")) {
            return "vendor-dnd";
          }

          if (id.includes("i18next") || id.includes("react-i18next") || id.includes("i18next-browser-languagedetector")) {
            return "vendor-i18n";
          }

          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "vendor-router";
          }

          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }

          if (id.includes("zustand") || id.includes("axios")) {
            return "vendor-state-network";
          }

          if (id.includes("react-hot-toast") || id.includes("lucide-react") || id.includes("clsx") || id.includes("tailwind-merge")) {
            return "vendor-ui";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
