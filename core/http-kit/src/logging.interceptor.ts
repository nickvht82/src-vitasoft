import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { createLogger, type Logger } from "@vitasoft/logger";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

/** Header carrying a correlation id from the edge/load balancer, if present. */
const TRACE_HEADER = "x-request-id";

/**
 * Logs one structured line per HTTP request with method, path, status code,
 * duration in milliseconds, and a `traceId` for log↔trace correlation.
 *
 * Uses `@vitasoft/logger` (pino) so output matches every other Vitasoft service.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger({ service: "api" });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const response = http.getResponse<{ statusCode?: number }>();

    const start = Date.now();
    const method = request.method ?? "UNKNOWN";
    const url = request.url ?? "";
    const traceId = resolveTraceId(request.headers?.[TRACE_HEADER]);

    return next.handle().pipe(
      tap({
        next: () => this.log(method, url, response.statusCode, start, traceId),
        error: () => this.log(method, url, response.statusCode, start, traceId),
      }),
    );
  }

  private log(
    method: string,
    url: string,
    statusCode: number | undefined,
    start: number,
    traceId: string | undefined,
  ): void {
    this.logger.info(
      { method, url, statusCode, durationMs: Date.now() - start, traceId },
      "request completed",
    );
  }
}

function resolveTraceId(
  header: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(header)) return header[0];
  return header;
}
