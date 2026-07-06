/**
 * An RFC 7807 `application/problem+json` payload.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */
export interface ProblemDetails {
  /** A URI reference identifying the problem type. `about:blank` when unspecified. */
  readonly type: string;
  /** A short, human-readable summary of the problem type. */
  readonly title: string;
  /** The HTTP status code. */
  readonly status: number;
  /** A human-readable explanation specific to this occurrence. */
  readonly detail?: string;
  /** A URI reference identifying the specific occurrence (usually the request path). */
  readonly instance?: string;
  /** Extension members — e.g. field-level validation errors. */
  readonly [key: string]: unknown;
}

/** Media type mandated by RFC 7807 for problem responses. */
export const PROBLEM_JSON_CONTENT_TYPE = "application/problem+json";
