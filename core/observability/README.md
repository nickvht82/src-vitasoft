# @vitasoft/observability

OpenTelemetry bootstrap for Vitasoft services — auto-instrumentation +
graceful shutdown + pino trace correlation.

## Usage

```ts
import { startObservability, getActiveTraceIds } from "@vitasoft/observability";

// BEFORE creating the HTTP server / NestFactory:
const otel = startObservability({
  serviceName: "api",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT, // unset => console spans
});
process.on("SIGTERM", () => otel.shutdown());

// Correlate logs with traces:
logger.info({ ...getActiveTraceIds() }, "handled request");
```

## Not in scope

- Custom/manual metrics (golden signals come from auto-instrumentation).
- Log shipping (pino → collector) and dashboards/alerts (Grafana Cloud, Phase 4).
- The OTLP collector itself.
