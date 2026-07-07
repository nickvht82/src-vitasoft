# @vitasoft/jobs

Thin, typed BullMQ wrappers for Vitasoft background jobs. The single seam for
queues — products never import `bullmq` directly.

## Usage

```ts
import { createQueue, createWorker } from "@vitasoft/jobs";

const queue = createQueue<{ text: string }, "echo">("ai-tasks", { redisUrl });
await queue.add("echo", { text: "hi" });

const worker = createWorker<{ text: string }, string, "echo">(
  "ai-tasks",
  async (job) => job.data.text,
  { redisUrl },
);
```

## Not in scope

- Dead-letter queues, scheduled/repeatable jobs, flow producers (added when a
  real background workload needs them).
- Running workers in a separate process (this increment runs the demo worker
  in-process; a dedicated worker deployment comes later).
- Calling `@vitasoft/ai` — the `ai-tasks` queue only proves produce/consume here.
```
