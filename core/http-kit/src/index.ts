/**
 * @vitasoft/http-kit — cross-cutting NestJS HTTP building blocks shared by every
 * backend: an RFC 7807 exception filter, a Zod validation pipe, and a structured
 * logging interceptor. Register them globally to get a consistent error contract,
 * boundary validation, and request logging across services.
 */
export {
  PROBLEM_JSON_CONTENT_TYPE,
  type ProblemDetails,
} from "./problem-details.js";
export {
  ProblemExceptionFilter,
  toProblemDetails,
} from "./problem-exception.filter.js";
export { ZodValidationPipe } from "./zod-validation.pipe.js";
export { LoggingInterceptor } from "./logging.interceptor.js";
