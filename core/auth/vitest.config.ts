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
      // The better-auth factory (`auth.ts`) is thin configuration wiring around a
      // third-party library — exercised by the api smoke tests against a real DB,
      // not unit-tested here. Guards/decorators/roles carry the testable logic.
      exclude: [
        "src/index.ts",
        "src/auth.ts",
        // Thin Nest param-decorator wrapper — its extraction factory is not
        // unit-addressable; covered end-to-end by api /v1/auth/me tests.
        "src/current-user.decorator.ts",
        "src/**/*.{test,spec}.ts",
      ],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
});
