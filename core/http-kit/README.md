# @vitasoft/http-kit

Cross-cutting NestJS HTTP building blocks shared by every Vitasoft backend.

## Usage

```ts
import {
  ProblemExceptionFilter,
  ZodValidationPipe,
  LoggingInterceptor,
} from "@vitasoft/http-kit";

// In bootstrap: register globally.
app.useGlobalFilters(new ProblemExceptionFilter(app.get(HttpAdapterHost)));
app.useGlobalInterceptors(new LoggingInterceptor());
// Per-route: @UsePipes(new ZodValidationPipe(MySchema))
```

## What you get

- `ProblemExceptionFilter` — renders every error as RFC 7807 `application/problem+json`.
- `ZodValidationPipe` — validates request input at the boundary, fail-fast, typed output.
- `LoggingInterceptor` — one structured line per request (method, path, status,
  duration, `traceId`) via `@vitasoft/logger`.

## Not in scope

Rate limiting (`@nestjs/throttler`), idempotency keys, API versioning helpers,
secure headers — later increments.
