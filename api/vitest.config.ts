import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

/**
 * SWC transforms tests so NestJS decorator metadata (`emitDecoratorMetadata`)
 * is present — the DI container needs it for type-based constructor injection.
 */
export default defineConfig({
  plugins: [swc.vite()],
  // SWC owns the transform; disable Vitest's built-in Oxc so it doesn't run a
  // second, decorator-metadata-less pass over the same files.
  oxc: false,
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/main.ts",
        "src/**/*.module.ts",
        "src/**/*.{test,spec}.ts",
        "src/**/index.ts",
      ],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
});
