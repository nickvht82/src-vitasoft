import Anthropic from "@anthropic-ai/sdk";

/**
 * @vitasoft/ai — shared Claude client for every Vitasoft product.
 *
 * All products (mind, marketing, homepage chat, ...) go through this package
 * so model choices, thinking config, and usage logging stay consistent.
 */

/** Current Claude model IDs (exact strings — never append date suffixes). */
export const MODELS = {
  /** Most demanding reasoning & long-horizon agentic work (premium pricing). */
  fable: "claude-fable-5",
  /** Default for production features — most capable Opus tier. */
  opus: "claude-opus-4-8",
  /** High-volume workloads at lower cost. */
  sonnet: "claude-sonnet-5",
  /** Fast, cheap classification / routing tasks. */
  haiku: "claude-haiku-4-5",
} as const;

export type ModelAlias = keyof typeof MODELS;

let client: Anthropic | undefined;

/**
 * Shared client. Credentials resolve from ANTHROPIC_API_KEY or an
 * `ant auth login` profile — never hardcode keys.
 */
export function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export interface CompleteOptions {
  system?: string;
  model?: ModelAlias;
  maxTokens?: number;
  /** "low" | "medium" | "high" | "max" — thinking/output depth. */
  effort?: "low" | "medium" | "high" | "max";
}

/** Single-shot completion with adaptive thinking. Returns the text answer. */
export async function complete(prompt: string, options: CompleteOptions = {}): Promise<string> {
  const response = await getClient().messages.create({
    model: MODELS[options.model ?? "opus"],
    max_tokens: options.maxTokens ?? 16000,
    thinking: { type: "adaptive" },
    ...(options.effort ? { output_config: { effort: options.effort } } : {}),
    ...(options.system ? { system: options.system } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Streaming completion — use for anything user-facing or long-form.
 * Calls onText for each delta; resolves with the final full message.
 */
export async function streamText(
  prompt: string,
  onText: (delta: string) => void,
  options: CompleteOptions = {},
): Promise<Anthropic.Message> {
  const stream = getClient().messages.stream({
    model: MODELS[options.model ?? "opus"],
    max_tokens: options.maxTokens ?? 64000,
    thinking: { type: "adaptive" },
    ...(options.effort ? { output_config: { effort: options.effort } } : {}),
    ...(options.system ? { system: options.system } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  stream.on("text", onText);
  return stream.finalMessage();
}

// Tool-use: define tools with betaZodTool and run agentic loops with
// client.beta.messages.toolRunner — re-exported here so products don't
// import the SDK directly.
export { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
export type { Message, MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
export { default as Anthropic } from "@anthropic-ai/sdk";
