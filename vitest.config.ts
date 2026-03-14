import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      include: [
        "server/**/*.ts",
        "client/src/**/*.ts",
        "client/src/**/*.tsx",
        "shared/**/*.ts",
      ],
      exclude: ["**/*.test.*", "**/*.spec.*", "client/src/components/ui/**"],
    },
  },
});
