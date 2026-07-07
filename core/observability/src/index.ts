/**
 * @vitasoft/observability — OpenTelemetry bootstrap for Vitasoft services.
 *
 * @remarks
 * - `startObservability(...)` starts the Node SDK with auto-instrumentation
 *   (HTTP/Fastify/Prisma). Call it before creating the HTTP server; call the
 *   returned `shutdown()` on SIGTERM to flush.
 * - With no OTLP endpoint configured, spans log to the console and metrics are
 *   skipped — a missing collector never crashes the app.
 * - `getActiveTraceIds()` returns the current traceId/spanId for pino log↔trace
 *   correlation.
 */
export {
  startObservability,
  type ObservabilityHandle,
} from "./observability.js";
export {
  selectExporterMode,
  buildResourceAttributes,
  type ObservabilityConfig,
  type ExporterMode,
} from "./config.js";
export { getActiveTraceIds } from "./trace-context.js";
