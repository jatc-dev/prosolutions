import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// index.html references %VITE_ADSENSE_CLIENT%; keep the ecosystem default when unset.
process.env.VITE_ADSENSE_CLIENT ||= "ca-pub-3956322934366702";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Source alias: works in isolated Render builds even without packages/ui/dist.
      "@prosolutions/ui": fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/") || id.includes("react-router")) {
            return "vendor-react";
          }
          if (id.includes("lucide-react")) return "vendor-icons";
        },
      },
    },
  },
  server: {
    port: 5175,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
