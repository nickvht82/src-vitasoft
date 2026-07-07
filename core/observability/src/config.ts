/**
 * Inputs that decide how observability is wired. Kept separate from the SDK
 * bootstrap so the *decision* (which exporter, what resource) is pure and
 * unit-testable without constructing OpenTelemetry objects.
 */
export interface ObservabilityConfig {
  /** Logical service name — becomes the `service.name` resource attribute. */
  readonly serviceName: string;
  /** Service version, when known. */
  readonly serviceVersion?: string;
  /** Deployment environment, e.g. `development` | `staging` | `production`. */
  readonly environment?: string;
  /**
   * OTLP endpoint. When unset, telemetry is not exported to a collector — spans
   * fall back to the console in dev and metrics are simply not shipped, so a
   * missing collector never crashes the app.
   */
  readonly otlpEndpoint?: string;
}

/** How telemetry should be emitted, derived from {@link ObservabilityConfig}. */
export type ExporterMode = "otlp" | "console";

/**
 * Decide the exporter mode: OTLP when an endpoint is configured, otherwise the
 * console (dev-friendly, dependency-free). This is the single branch that all of
 * observability's "don't crash without a collector" behaviour hinges on.
 *
 * @param config - The resolved observability config.
 * @returns `"otlp"` when an endpoint is set, else `"console"`.
 */
export function selectExporterMode(config: ObservabilityConfig): ExporterMode {
  return config.otlpEndpoint && config.otlpEndpoint.trim().length > 0
    ? "otlp"
    : "console";
}

/**
 * Build the resource attribute bag for the OTel SDK. Only defined values are
 * included so we never emit empty attributes.
 *
 * @param config - The resolved observability config.
 * @returns A plain attribute map keyed by semantic-convention names.
 */
export function buildResourceAttributes(
  config: ObservabilityConfig,
): Record<string, string> {
  const attributes: Record<string, string> = {
    "service.name": config.serviceName,
  };
  if (config.serviceVersion) {
    attributes["service.version"] = config.serviceVersion;
  }
  if (config.environment) {
    attributes["deployment.environment.name"] = config.environment;
  }
  return attributes;
}
