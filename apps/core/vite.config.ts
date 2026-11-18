import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Referencia directa al código fuente del paquete del monorepo:
      // funciona en builds aislados (Render) aunque packages/ui/dist no exista.
      "@prosolutions/ui": fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }

          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "https://proidentity-qa-v2.onrender.com",
        changeOrigin: true,
        cookieDomainRewrite: "",
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
    },
  },
});
