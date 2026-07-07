import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // The SDK bootstrap (`observability.ts`) wires third-party OTel objects and
      // starts a process-wide SDK — exercised by the api smoke test, not unit
      // tests. The pure config/selection logic in `config.ts` is unit-tested.
      exclude: [
        "src/index.ts",
        "src/observability.ts",
        "src/**/*.test.ts",
      ],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
});
