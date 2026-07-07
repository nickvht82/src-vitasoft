import { trace } from "@opentelemetry/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getActiveTraceIds } from "./trace-context.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getActiveTraceIds", () => {
  it("returns undefined when there is no active span", () => {
    vi.spyOn(trace, "getActiveSpan").mockReturnValue(undefined);
    expect(getActiveTraceIds()).toBeUndefined();
  });

  it("returns the trace and span ids of the active span", () => {
    vi.spyOn(trace, "getActiveSpan").mockReturnValue({
      spanContext: () => ({
        traceId: "0af7651916cd43dd8448eb211c80319c",
        spanId: "b7ad6b7169203331",
        traceFlags: 1,
      }),
    } as never);
    expect(getActiveTraceIds()).toEqual({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
    });
  });

  it("treats the all-zero (invalid) trace id as no trace", () => {
    vi.spyOn(trace, "getActiveSpan").mockReturnValue({
      spanContext: () => ({
        traceId: "00000000000000000000000000000000",
        spanId: "0000000000000000",
        traceFlags: 0,
      }),
    } as never);
    expect(getActiveTraceIds()).toBeUndefined();
  });
});
