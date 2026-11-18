import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Referencia directa al código fuente del paquete del monorepo:
      // funciona en builds aislados (Render) aunque packages/ui/dist no exista.
      "@prosolutions/ui": fileURLToPath(new URL("../../../packages/ui/src/index.ts", import.meta.url)),
    },
  },
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
      "/identity-api": {
        target: "https://proidentity-qa-v2.onrender.com",
        changeOrigin: true,
        cookieDomainRewrite: "",
        rewrite: (path) => path.replace(/^\/identity-api/, ""),
        configure(proxy) {
          // QA does not allow localhost origins; the dev proxy keeps browser
          // requests same-origin and forwards them without an Origin header.
          proxy.on("proxyReq", (proxyRequest) => {
            proxyRequest.removeHeader("origin");
          });
          proxy.on("proxyRes", (proxyResponse) => {
            const setCookie = proxyResponse.headers["set-cookie"];
            if (!setCookie) return;

            // QA cookies are issued for HTTPS production hosts. Rewrite only
            // the local proxy response so the browser can keep the session on
            // http://localhost during development.
            proxyResponse.headers["set-cookie"] = setCookie.map((cookie) =>
              cookie
                .replace(/;\s*Secure/gi, "")
                .replace(/;\s*SameSite=None/gi, "; SameSite=Lax"),
            );
          });
        },
      },
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
