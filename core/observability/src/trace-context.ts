import { trace } from "@opentelemetry/api";

/**
 * The current OTLP trace/span ids for the active context, or undefined when
 * there is no recording span. Use to correlate pino logs with traces — attach
 * `traceId` to a log line and you can jump from log to trace in Grafana.
 *
 * @returns `{ traceId, spanId }` when a span is active, otherwise `undefined`.
 * @example
 * const ids = getActiveTraceIds();
 * logger.info({ ...ids }, "handled request");
 */
export function getActiveTraceIds():
  | { traceId: string; spanId: string }
  | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const context = span.spanContext();
  // A 32-zero trace id is OTel's "invalid" sentinel — treat as no trace.
  if (!context.traceId || /^0+$/.test(context.traceId)) return undefined;
  return { traceId: context.traceId, spanId: context.spanId };
}
