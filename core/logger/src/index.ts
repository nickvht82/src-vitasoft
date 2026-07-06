import pino, { type Logger } from "pino";

export interface LoggerOptions {
  /** Service name attached to every log line — drives filtering in Cloud Logging. */
  service: string;
  level?: "debug" | "info" | "warn" | "error";
  /** Extra static fields (version, region, ...) merged into every entry. */
  base?: Record<string, unknown>;
}

/**
 * Structured JSON logger shared by every Vitasoft service.
 * Output is one JSON object per line — Fluentd/Cloud Logging ingest it directly,
 * and traceId/spanId fields correlate with distributed traces.
 */
export function createLogger(options: LoggerOptions): Logger {
  return pino({
    level: options.level ?? process.env.LOG_LEVEL ?? "info",
    base: {
      service: options.service,
      ...options.base,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

export type { Logger };
