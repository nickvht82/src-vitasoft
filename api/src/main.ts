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
import { AppModule } from "./app.module.js";

/** Global URI version prefix — all routes live under `/v1` (ARCHITECTURE.md §6.2). */
const API_VERSION_PREFIX = "v1";

/** Default port for the core API when `PORT` is not set in the environment. */
const DEFAULT_API_PORT = 3001;

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger({ service: env.SERVICE_NAME });

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

  const port = process.env.PORT ? env.PORT : DEFAULT_API_PORT;
  await app.listen({ port, host: "0.0.0.0" });
  logger.info({ port, env: env.NODE_ENV }, "api listening");
}

bootstrap().catch((error: unknown) => {
  // Surface boot failures loudly — a silent exit here is the worst failure mode.
  console.error("API failed to start", error);
  process.exit(1);
});
