import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@creative-engine/schemas": `${root}packages/schemas/src/index.ts`,
      "@creative-engine/validators": `${root}packages/validators/src/index.ts`,
      "@creative-engine/provider-adapters": `${root}packages/provider-adapters/src/index.ts`,
    },
  },
  test: {
    coverage: { reporter: ["text", "json-summary"] },
    include: ["tests/**/*.test.ts"],
  },
});
