import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: {
        "@prosolutions/ui": fileURLToPath(new URL("./tests/mocks/prosolutionsUi.tsx", import.meta.url)),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
      clearMocks: true,
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  }),
);
