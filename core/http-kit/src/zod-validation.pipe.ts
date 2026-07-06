import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * A NestJS pipe that validates and parses input against a Zod schema at the
 * request boundary — fail fast, and hand a fully-typed value to the handler.
 *
 * Validation failures become a `400` whose problem document carries the
 * field-level issues under an `errors` extension.
 *
 * @example
 * ```ts
 * const CreateOrgSchema = z.object({ name: z.string().min(1) });
 * // @UsePipes(new ZodValidationPipe(CreateOrgSchema))
 * ```
 */
export class ZodValidationPipe<TOutput> implements PipeTransform {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    throw new BadRequestException({
      error: "Validation Failed",
      message: "Request payload failed validation.",
      errors,
    });
  }
}
