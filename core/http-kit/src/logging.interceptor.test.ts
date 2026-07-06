import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { Logger } from "@vitasoft/logger";
import { of, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { LoggingInterceptor } from "./logging.interceptor.js";

function makeContext(
  request: Record<string, unknown>,
  statusCode = 200,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function fakeLogger(): { logger: Logger; info: ReturnType<typeof vi.fn> } {
  const info = vi.fn();
  return { logger: { info } as unknown as Logger, info };
}

describe("LoggingInterceptor", () => {
  it("logs method, url, status, duration and traceId on success", async () => {
    const { logger, info } = fakeLogger();
    const interceptor = new LoggingInterceptor(logger);
    const ctx = makeContext(
      { method: "GET", url: "/v1/orgs", headers: { "x-request-id": "trace-1" } },
      201,
    );
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({ complete: resolve });
    });

    expect(info).toHaveBeenCalledTimes(1);
    const [fields, msg] = info.mock.calls[0]!;
    expect(msg).toBe("request completed");
    expect(fields).toMatchObject({
      method: "GET",
      url: "/v1/orgs",
      statusCode: 201,
      traceId: "trace-1",
    });
    expect(typeof fields.durationMs).toBe("number");
  });

  it("logs even when the handler errors", async () => {
    const { logger, info } = fakeLogger();
    const interceptor = new LoggingInterceptor(logger);
    const ctx = makeContext({ method: "POST", url: "/v1/orgs", headers: {} }, 500);
    const next: CallHandler = {
      handle: () => throwError(() => new Error("boom")),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({ error: () => resolve() });
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0]![0]).toMatchObject({ method: "POST" });
  });

  it("takes the first value of a multi-valued trace header and tolerates missing fields", async () => {
    const { logger, info } = fakeLogger();
    const interceptor = new LoggingInterceptor(logger);
    const ctx = makeContext({ headers: { "x-request-id": ["a", "b"] } });
    const next: CallHandler = { handle: () => of(null) };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({ complete: resolve });
    });

    expect(info.mock.calls[0]![0]).toMatchObject({
      method: "UNKNOWN",
      url: "",
      traceId: "a",
    });
  });

  it("constructs a default logger when none is injected", () => {
    expect(() => new LoggingInterceptor()).not.toThrow();
  });
});
