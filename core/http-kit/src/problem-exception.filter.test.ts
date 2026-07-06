import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { PROBLEM_JSON_CONTENT_TYPE } from "./problem-details.js";
import {
  ProblemExceptionFilter,
  toProblemDetails,
} from "./problem-exception.filter.js";

describe("toProblemDetails", () => {
  it("maps a NestJS HttpException (object response) to a problem document", () => {
    const problem = toProblemDetails(
      new NotFoundException("Organization not found"),
      "/v1/organizations/x",
    );
    // NestJS wraps the message in { statusCode, error, message }, so the RFC 7807
    // title comes from `error` and the detail from `message`.
    expect(problem).toMatchObject({
      status: HttpStatus.NOT_FOUND,
      title: "Not Found",
      detail: "Organization not found",
      instance: "/v1/organizations/x",
      type: "about:blank",
    });
  });

  it("maps a string-response HttpException using the string as the title", () => {
    const problem = toProblemDetails(
      new HttpException("Teapot", HttpStatus.I_AM_A_TEAPOT),
      "/v1/x",
    );
    expect(problem.title).toBe("Teapot");
    expect(problem.status).toBe(HttpStatus.I_AM_A_TEAPOT);
  });

  it("lifts object responses into title/detail and keeps extensions", () => {
    const exception = new BadRequestException({
      error: "Validation Failed",
      message: "bad body",
      errors: [{ path: "name", message: "Required" }],
    });
    const problem = toProblemDetails(exception, "/v1/organizations");
    expect(problem.title).toBe("Validation Failed");
    expect(problem.detail).toBe("bad body");
    expect(problem.errors).toEqual([{ path: "name", message: "Required" }]);
    expect(problem).not.toHaveProperty("statusCode");
  });

  it("joins array messages into a single detail string", () => {
    const exception = new BadRequestException({
      message: ["a required", "b required"],
    });
    const problem = toProblemDetails(exception, "/v1/x");
    expect(problem.detail).toBe("a required; b required");
  });

  it("falls back to the exception message when no error field is present", () => {
    const exception = new HttpException(
      { message: "boom" },
      HttpStatus.CONFLICT,
    );
    const problem = toProblemDetails(exception, "/v1/x");
    expect(problem.status).toBe(HttpStatus.CONFLICT);
    expect(problem.title).toBe(exception.message);
  });

  it("never lets a response-body `status` field clobber the numeric HTTP status", () => {
    // Mirrors @nestjs/terminus, which puts `status: "error"` in the 503 body.
    const exception = new HttpException(
      { status: "error", details: { database: { status: "down" } } },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    const problem = toProblemDetails(exception, "/v1/health/ready");
    expect(problem.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(typeof problem.status).toBe("number");
    // Non-reserved members survive as extensions; the reserved `status` is dropped.
    expect(problem.details).toEqual({ database: { status: "down" } });
  });

  it("renders unknown throws as a generic 500 without leaking internals", () => {
    const problem = toProblemDetails(new Error("secret stack"), "/v1/x");
    expect(problem).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      instance: "/v1/x",
    });
  });
});

describe("ProblemExceptionFilter", () => {
  it("writes the problem body with the RFC 7807 content type and status", () => {
    const httpAdapter = {
      getRequestUrl: vi.fn().mockReturnValue("/v1/orgs/1"),
      setHeader: vi.fn(),
      reply: vi.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({ res: true }),
      }),
    };
    const filter = new ProblemExceptionFilter({
      httpAdapter,
    } as unknown as HttpAdapterHost);

    filter.catch(new NotFoundException("nope"), host as never);

    expect(httpAdapter.setHeader).toHaveBeenCalledWith(
      { res: true },
      "Content-Type",
      PROBLEM_JSON_CONTENT_TYPE,
    );
    expect(httpAdapter.reply).toHaveBeenCalledWith(
      { res: true },
      expect.objectContaining({
        status: HttpStatus.NOT_FOUND,
        title: "Not Found",
        detail: "nope",
      }),
      HttpStatus.NOT_FOUND,
    );
  });

  it("defaults instance to empty string when the adapter returns no url", () => {
    const httpAdapter = {
      getRequestUrl: vi.fn().mockReturnValue(undefined),
      setHeader: vi.fn(),
      reply: vi.fn(),
    };
    const host = {
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    };
    const filter = new ProblemExceptionFilter({
      httpAdapter,
    } as unknown as HttpAdapterHost);

    filter.catch(new Error("x"), host as never);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ instance: "" }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
