import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import {
  PROBLEM_JSON_CONTENT_TYPE,
  type ProblemDetails,
} from "./problem-details.js";

/**
 * Convert a thrown value into an RFC 7807 problem document.
 *
 * Framework-agnostic and pure — extracted from the filter so it can be unit
 * tested without a live HTTP request.
 *
 * @param exception - The value thrown from a handler.
 * @param instance - The request path, used as the problem `instance`.
 * @returns A fully-populated {@link ProblemDetails}.
 */
export function toProblemDetails(
  exception: unknown,
  instance: string,
): ProblemDetails {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const { title, detail, extensions } = normalizeHttpResponse(
      response,
      exception.message,
    );
    // Extensions come first so the reserved RFC 7807 members below always win —
    // some framework exceptions (e.g. terminus) put their own `status` in the
    // response body, which must never clobber the numeric HTTP status.
    return {
      ...extensions,
      type: "about:blank",
      title,
      status,
      ...(detail ? { detail } : {}),
      instance,
    };
  }

  return {
    type: "about:blank",
    title: "Internal Server Error",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    instance,
  };
}

interface NormalizedResponse {
  readonly title: string;
  readonly detail?: string;
  readonly extensions: Record<string, unknown>;
}

/**
 * NestJS `HttpException.getResponse()` returns either a string or an object
 * (`{ statusCode, message, error, ... }`). Flatten both shapes into the parts a
 * problem document needs, preserving any extra members as RFC 7807 extensions.
 */
function normalizeHttpResponse(
  response: string | object,
  fallbackTitle: string,
): NormalizedResponse {
  if (typeof response === "string") {
    return { title: response, extensions: {} };
  }

  const {
    error,
    message,
    statusCode: _statusCode,
    status: _status,
    ...rest
  } = response as Record<string, unknown>;

  const title = typeof error === "string" ? error : fallbackTitle;
  const detail = formatDetail(message);
  return {
    title,
    ...(detail ? { detail } : {}),
    extensions: rest,
  };
}

function formatDetail(message: unknown): string | undefined {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join("; ");
  return undefined;
}

/**
 * Catch-all exception filter that renders every error as
 * `application/problem+json` (RFC 7807). Register it globally so both expected
 * `HttpException`s and unexpected throws produce a consistent error contract.
 */
@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const instance = httpAdapter.getRequestUrl(request) ?? "";
    const problem = toProblemDetails(exception, instance);

    httpAdapter.setHeader(response, "Content-Type", PROBLEM_JSON_CONTENT_TYPE);
    httpAdapter.reply(response, problem, problem.status);
  }
}
