import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Cover every source file by default; only exclude the generated Prisma
      // client and test files. Adding a new src file no longer silently escapes
      // the coverage gate (QA finding F-05).
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/**/*.test.ts"],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
});
