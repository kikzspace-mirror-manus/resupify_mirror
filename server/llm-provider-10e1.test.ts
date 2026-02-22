/**
 * Phase 10E-1 — LLM Provider Wrapper Acceptance Tests
 *
 * A) Default provider is "manus" (invokeLLM called)
 * B) LLM_PROVIDER="openai" routes to OpenAI SDK
 * C) LLM_PROVIDER="openai" + missing OPENAI_API_KEY → ProviderConfigError (not 500)
 * D) ProviderConfigError has code "PROVIDER_CONFIG_ERROR"
 * E) Response shape is unchanged (same InvokeResult structure)
 * F) Provider + model are logged per request
 * G) LLM_PROVIDER="manus" explicitly still calls invokeLLM
 * H) ENV.LLM_PROVIDER defaults to "manus" when env var is unset
 * I) ENV.LLM_MODEL_OPENAI defaults to "gpt-4.1" when env var is unset
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockInvokeLLM, mockOpenAICreate } = vi.hoisted(() => {
  const mockInvokeLLM = vi.fn();
  const mockOpenAICreate = vi.fn();
  return { mockInvokeLLM, mockOpenAICreate };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: mockInvokeLLM,
}));

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SAMPLE_PARAMS = {
  messages: [
    { role: "system" as const, content: "You are a helpful assistant." },
    { role: "user" as const, content: "Hello" },
  ],
};

const SAMPLE_RESULT = {
  id: "chatcmpl-test",
  object: "chat.completion",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Hi there!" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Phase 10E-1: LLM Provider Wrapper", () => {
  let originalProvider: string | undefined;
  let originalOpenAIKey: string | undefined;
  let originalModel: string | undefined;

  beforeEach(() => {
    originalProvider = process.env.LLM_PROVIDER;
    originalOpenAIKey = process.env.OPENAI_API_KEY;
    originalModel = process.env.LLM_MODEL_OPENAI;
    vi.clearAllMocks();
    mockInvokeLLM.mockResolvedValue(SAMPLE_RESULT);
    mockOpenAICreate.mockResolvedValue(SAMPLE_RESULT);
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = originalProvider;
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAIKey;
    if (originalModel === undefined) delete process.env.LLM_MODEL_OPENAI;
    else process.env.LLM_MODEL_OPENAI = originalModel;
    // Reset module registry so ENV is re-evaluated on next import
    vi.resetModules();
  });

  // A) Default provider is "manus"
  it("A: default provider routes to invokeLLM (Manus)", async () => {
    delete process.env.LLM_PROVIDER;
    vi.resetModules();
    const { callLLM } = await import("./llmProvider");
    const result = await callLLM(SAMPLE_PARAMS);
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    expect(result).toEqual(SAMPLE_RESULT);
  });

  // B) LLM_PROVIDER="openai" routes to OpenAI SDK
  it("B: LLM_PROVIDER=openai routes to OpenAI SDK", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test-key-123";
    vi.resetModules();
    const { callLLM } = await import("./llmProvider");
    const result = await callLLM(SAMPLE_PARAMS);
    expect(mockInvokeLLM).not.toHaveBeenCalled();
    expect(mockOpenAICreate).toHaveBeenCalledOnce();
    expect(result).toEqual(SAMPLE_RESULT);
  });

  // C) LLM_PROVIDER="openai" + missing OPENAI_API_KEY → ProviderConfigError
  it("C: missing OPENAI_API_KEY with openai provider throws ProviderConfigError", async () => {
    process.env.LLM_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { callLLM, ProviderConfigError } = await import("./llmProvider");
    await expect(callLLM(SAMPLE_PARAMS)).rejects.toBeInstanceOf(ProviderConfigError);
  });

  // D) ProviderConfigError has the correct code
  it("D: ProviderConfigError.code is PROVIDER_CONFIG_ERROR", async () => {
    process.env.LLM_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { callLLM } = await import("./llmProvider");
    try {
      await callLLM(SAMPLE_PARAMS);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.code).toBe("PROVIDER_CONFIG_ERROR");
    }
  });

  // E) Response shape is unchanged
  it("E: response shape is the same InvokeResult structure for both providers", async () => {
    // Manus path
    delete process.env.LLM_PROVIDER;
    vi.resetModules();
    const { callLLM: callManus } = await import("./llmProvider");
    const manusResult = await callManus(SAMPLE_PARAMS);
    expect(manusResult).toHaveProperty("choices");
    expect(manusResult.choices[0]).toHaveProperty("message");

    // OpenAI path
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test-key-456";
    vi.resetModules();
    const { callLLM: callOpenAI } = await import("./llmProvider");
    const openaiResult = await callOpenAI(SAMPLE_PARAMS);
    expect(openaiResult).toHaveProperty("choices");
    expect(openaiResult.choices[0]).toHaveProperty("message");
  });

  // F) Provider + model are logged per request
  it("F: callLLM logs provider and model", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    delete process.env.LLM_PROVIDER;
    vi.resetModules();
    const { callLLM } = await import("./llmProvider");
    await callLLM(SAMPLE_PARAMS);
    const logCalls = consoleSpy.mock.calls.map((c) => c.join(" "));
    expect(logCalls.some((l) => l.includes("[LLM]") && l.includes("provider=manus"))).toBe(true);
    consoleSpy.mockRestore();
  });

  // G) Explicit LLM_PROVIDER="manus" still calls invokeLLM
  it("G: explicit LLM_PROVIDER=manus calls invokeLLM", async () => {
    process.env.LLM_PROVIDER = "manus";
    vi.resetModules();
    const { callLLM } = await import("./llmProvider");
    await callLLM(SAMPLE_PARAMS);
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    expect(mockOpenAICreate).not.toHaveBeenCalled();
  });

  // H) ENV.LLM_PROVIDER defaults to "manus"
  it("H: ENV.LLM_PROVIDER defaults to 'manus' when env var is unset", async () => {
    delete process.env.LLM_PROVIDER;
    vi.resetModules();
    const { ENV } = await import("./_core/env");
    expect(ENV.LLM_PROVIDER).toBe("manus");
  });

  // I) ENV.LLM_MODEL_OPENAI defaults to "gpt-4.1"
  it("I: ENV.LLM_MODEL_OPENAI defaults to 'gpt-4.1' when env var is unset", async () => {
    delete process.env.LLM_MODEL_OPENAI;
    vi.resetModules();
    const { ENV } = await import("./_core/env");
    expect(ENV.LLM_MODEL_OPENAI).toBe("gpt-4.1");
  });
});
