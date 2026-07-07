import { z } from "zod";

/**
 * Centralized, type-safe environment configuration for all Vitasoft services.
 * Secrets are injected at runtime (Google Secret Manager in K8s, .env locally)
 * and validated here — a service fails fast on boot if config is invalid.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  SERVICE_NAME: z.string().default("vitasoft"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Database (optional until a service needs it)
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  // Auth — better-auth session signing secret (optional until a service enables
  // auth; the API enforces it at its own boundary). Min length mirrors
  // better-auth's requirement so a too-short secret fails fast here.
  BETTER_AUTH_SECRET: z.string().min(32).optional(),

  // OpenTelemetry — OTLP endpoint; unset means log spans to console (no crash).
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  // AI — resolved by the Anthropic SDK from env or `ant auth login` profile
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(overrides?: Partial<Record<keyof Env, string>>): Env {
  if (cached && !overrides) return cached;
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (!overrides) cached = parsed.data;
  return parsed.data;
}

export function isProduction(env: Env = loadEnv()): boolean {
  return env.NODE_ENV === "production";
}
