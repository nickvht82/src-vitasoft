import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { loadEnv } from "@vitasoft/config";
import { AUTH_INSTANCE, createAuth, RolesGuard } from "@vitasoft/auth";
import { PrismaService } from "../../infrastructure/database/prisma.service.js";
import { AuthController } from "./auth.controller.js";
import { MeController } from "./me.controller.js";

/**
 * Resolve the base URL better-auth uses to build cookie/callback URLs.
 * Derived from PORT so local dev and containers stay consistent.
 */
function resolveBaseUrl(): string {
  const { PORT } = loadEnv();
  return process.env.BETTER_AUTH_URL ?? `http://localhost:${PORT}`;
}

/**
 * Resolve the session-signing secret, failing fast when absent — auth cannot be
 * secure without it (mirrors the DATABASE_URL fail-fast in PrismaService).
 */
function resolveSecret(): string {
  const { BETTER_AUTH_SECRET } = loadEnv();
  if (!BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is required for @vitasoft/api (min 32 chars). " +
        "Set it in the environment (see api/.env.example).",
    );
  }
  return BETTER_AUTH_SECRET;
}

/**
 * Auth feature module. Provides the shared better-auth instance under
 * {@link AUTH_INSTANCE}, mounts the `/v1/auth/*` handler + `/v1/auth/me`, and
 * registers {@link RolesGuard} globally (it is a no-op unless a route declares
 * `@Roles()`). `AuthGuard` is applied per-route via `@UseGuards` where needed.
 */
@Global()
@Module({
  controllers: [AuthController, MeController],
  providers: [
    {
      provide: AUTH_INSTANCE,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        createAuth({
          // better-auth manages its own tables and must span tenants (creates
          // users at sign-up before any org exists) — use the un-scoped client.
          prisma: prisma.unscoped,
          secret: resolveSecret(),
          baseURL: resolveBaseUrl(),
          basePath: "/v1/auth",
          trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS?.split(",").map((o) =>
            o.trim(),
          ),
        }),
    },
    // Global RolesGuard: gates only routes annotated with @Roles(); harmless
    // everywhere else. AuthGuard stays per-route so public routes remain public.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AUTH_INSTANCE],
})
export class AuthModule {}
