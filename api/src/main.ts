import "reflect-metadata";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { isProduction, loadEnv } from "@vitasoft/config";
import { createLogger } from "@vitasoft/logger";
import {
  LoggingInterceptor,
  ProblemExceptionFilter,
} from "@vitasoft/http-kit";
import {
  startObservability,
  type ObservabilityHandle,
} from "@vitasoft/observability";
import { AppModule } from "./app.module.js";

/** Global URI version prefix — all routes live under `/v1` (ARCHITECTURE.md §6.2). */
const API_VERSION_PREFIX = "v1";

/**
 * Default port for the core API when `PORT` is not set. Supplied as a config
 * override so the value flows through `@vitasoft/config` validation instead of
 * being read from `process.env` at the call site (QA finding F-03). The shared
 * schema default (3000) is for frontends; the API owns 3001.
 */
const DEFAULT_API_PORT = "3001";

async function bootstrap(): Promise<void> {
  // Apply the API's port default at the config boundary: only when PORT is unset
  // in the environment does the override take effect (loadEnv merges it under
  // process.env, so a real PORT still wins).
  const env = loadEnv(
    process.env.PORT ? undefined : { PORT: DEFAULT_API_PORT },
  );
  const logger = createLogger({ service: env.SERVICE_NAME });

  // Start OpenTelemetry BEFORE NestFactory so auto-instrumentation can patch the
  // HTTP/Fastify/Prisma modules. Missing OTLP endpoint => console spans, no crash.
  const observability: ObservabilityHandle = startObservability({
    serviceName: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
  // Flush telemetry on shutdown before the process exits (SIGTERM from GKE).
  const flushTelemetry = () => {
    void observability.shutdown();
  };
  process.once("SIGTERM", flushTelemetry);
  process.once("SIGINT", flushTelemetry);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );

  app.setGlobalPrefix(API_VERSION_PREFIX);
  app.useGlobalFilters(new ProblemExceptionFilter(app.get(HttpAdapterHost)));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.enableShutdownHooks();

  if (!isProduction(env)) {
    const config = new DocumentBuilder()
      .setTitle("Vitasoft Core API")
      .setDescription("Core backend API (Clean Architecture + CQRS).")
      .setVersion("1.0")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "api listening");
}

bootstrap().catch((error: unknown) => {
  // Surface boot failures loudly — a silent exit here is the worst failure mode.
  console.error("API failed to start", error);
  process.exit(1);
});
