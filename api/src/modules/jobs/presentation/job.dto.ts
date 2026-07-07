import { z } from "zod";

/** Request body for `POST /v1/jobs/echo`. */
export const enqueueEchoSchema = z.object({
  text: z.string().min(1).max(10_000),
});

/** Validated echo-enqueue input. */
export type EnqueueEchoDto = z.infer<typeof enqueueEchoSchema>;
