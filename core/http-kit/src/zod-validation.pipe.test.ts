import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

const schema = z.object({
  name: z.string().min(1),
  count: z.number().int(),
});

describe("ZodValidationPipe", () => {
  it("returns the parsed, typed value on success", () => {
    const pipe = new ZodValidationPipe(schema);
    const out = pipe.transform({ name: "ok", count: 3 });
    expect(out).toEqual({ name: "ok", count: 3 });
  });

  it("throws a BadRequest carrying field-level errors on failure", () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ name: "", count: 1.5 });
      throw new Error("expected pipe to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        error: string;
        errors: { path: string; message: string }[];
      };
      expect(response.error).toBe("Validation Failed");
      const paths = response.errors.map((e) => e.path);
      expect(paths).toContain("name");
      expect(paths).toContain("count");
    }
  });
});
