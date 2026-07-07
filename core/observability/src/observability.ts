import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  buildResourceAttributes,
  type ObservabilityConfig,
  selectExporterMode,
} from "./config.js";

/** Handle returned by {@link startObservability} for graceful shutdown. */
export interface ObservabilityHandle {
  /** Flush and stop the SDK. Call on SIGTERM before the process exits. */
  shutdown(): Promise<void>;
}

/**
 * Start OpenTelemetry for this process: auto-instruments HTTP/Fastify/Prisma and
 * exports traces + metrics via OTLP when `otlpEndpoint` is set, or logs spans to
 * the console otherwise (a missing collector never crashes the app).
 *
 * Call this **before** importing/instantiating the HTTP framework so the
 * instrumentations can patch modules as they load.
 *
 * @param config - Service identity and OTLP endpoint.
 * @returns A handle whose `shutdown()` flushes pending telemetry.
 * @example
 * const otel = startObservability({ serviceName: "api", otlpEndpoint });
 * process.on("SIGTERM", () => otel.shutdown());
 */
export function startObservability(
  config: ObservabilityConfig,
): ObservabilityHandle {
  const resource = resourceFromAttributes(buildResourceAttributes(config));
  const mode = selectExporterMode(config);

  const traceExporter =
    mode === "otlp"
      ? new OTLPTraceExporter({ url: `${config.otlpEndpoint}/v1/traces` })
      : new ConsoleSpanExporter();

  // Metrics only ship when a collector is configured — there is no useful
  // "console metrics" default, so without an endpoint we omit the reader.
  const metricReader =
    mode === "otlp"
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${config.otlpEndpoint}/v1/metrics`,
          }),
        })
      : undefined;

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    ...(metricReader ? { metricReader } : {}),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is noisy and low-value for an HTTP service.
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  return {
    async shutdown() {
      // Swallow shutdown errors — failing to flush telemetry must never block
      // process exit or mask the real reason the app is shutting down.
      try {
        await sdk.shutdown();
      } catch {
        /* best-effort flush */
      }
    },
  };
}
