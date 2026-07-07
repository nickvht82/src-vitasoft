import { describe, expect, it } from "vitest";
import {
  buildResourceAttributes,
  selectExporterMode,
} from "./config.js";

describe("selectExporterMode", () => {
  it("chooses OTLP when an endpoint is configured", () => {
    expect(
      selectExporterMode({
        serviceName: "api",
        otlpEndpoint: "http://collector:4318",
      }),
    ).toBe("otlp");
  });

  it("falls back to console when no endpoint is set", () => {
    expect(selectExporterMode({ serviceName: "api" })).toBe("console");
  });

  it("treats a blank/whitespace endpoint as no endpoint", () => {
    expect(
      selectExporterMode({ serviceName: "api", otlpEndpoint: "   " }),
    ).toBe("console");
    expect(
      selectExporterMode({ serviceName: "api", otlpEndpoint: "" }),
    ).toBe("console");
  });
});

describe("buildResourceAttributes", () => {
  it("always includes the service name", () => {
    expect(buildResourceAttributes({ serviceName: "api" })).toEqual({
      "service.name": "api",
    });
  });

  it("includes version and environment when provided", () => {
    expect(
      buildResourceAttributes({
        serviceName: "api",
        serviceVersion: "1.2.3",
        environment: "production",
      }),
    ).toEqual({
      "service.name": "api",
      "service.version": "1.2.3",
      "deployment.environment.name": "production",
    });
  });

  it("omits undefined optional attributes", () => {
    const attrs = buildResourceAttributes({
      serviceName: "api",
      environment: "staging",
    });
    expect(attrs).not.toHaveProperty("service.version");
    expect(attrs["deployment.environment.name"]).toBe("staging");
  });
});
