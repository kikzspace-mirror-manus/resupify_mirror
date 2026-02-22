/**
 * server/llmProvider.ts — Phase 10E-1
 *
 * Thin provider wrapper that routes LLM calls to either:
 *   - "manus"  (default) — uses the existing invokeLLM helper (Manus/Forge API)
 *   - "openai"           — uses the official OpenAI SDK with GPT-4.1
 *
 * The active provider is selected by the LLM_PROVIDER env var (default "manus").
 * When LLM_PROVIDER="openai", OPENAI_API_KEY must be set; if it is missing a
 * clean ProviderConfigError is thrown (not a 500).
 *
 * IMPORTANT: This file MUST NOT change any prompt strings, parsing logic,
 * or response shapes. It is a pure routing layer.
 */
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import type { InvokeParams, InvokeResult } from "./_core/llm";

// ─── Error type ───────────────────────────────────────────────────────────────
export class ProviderConfigError extends Error {
  readonly code = "PROVIDER_CONFIG_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

// ─── OpenAI call (lazy import to avoid loading SDK when not needed) ───────────
async function callOpenAI(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.OPENAI_API_KEY) {
    throw new ProviderConfigError(
      "LLM_PROVIDER is set to 'openai' but OPENAI_API_KEY is not configured. " +
      "Set OPENAI_API_KEY in your environment or switch LLM_PROVIDER back to 'manus'."
    );
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

  const model = ENV.LLM_MODEL_OPENAI || "gpt-4.1";

  // Convert messages to OpenAI-compatible format (same shape as Manus)
  const messages = params.messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((part: any) =>
            part.type === "text" ? { type: "text" as const, text: part.text } : part
          )
        : m.content,
  }));

  const requestParams: Parameters<typeof client.chat.completions.create>[0] = {
    model,
    messages: messages as any,
  };

  // Forward response_format if present (structured output)
  const rf = (params as any).response_format ?? (params as any).responseFormat;
  if (rf) {
    (requestParams as any).response_format = rf;
  }

  const completion = await client.chat.completions.create(requestParams);

  // Return in the same shape as invokeLLM (OpenAI-compatible response object)
  return completion as unknown as InvokeResult;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Drop-in replacement for invokeLLM that respects LLM_PROVIDER.
 * All call sites pass the same InvokeParams they previously passed to invokeLLM.
 */
export async function callLLM(params: InvokeParams): Promise<InvokeResult> {
  const provider = ENV.LLM_PROVIDER ?? "manus";

  console.log(
    `[LLM] provider=${provider} model=${
      provider === "openai" ? (ENV.LLM_MODEL_OPENAI || "gpt-4.1") : "gemini-2.5-flash"
    }`
  );

  if (provider === "openai") {
    return callOpenAI(params);
  }

  // Default: Manus provider
  return invokeLLM(params);
}
