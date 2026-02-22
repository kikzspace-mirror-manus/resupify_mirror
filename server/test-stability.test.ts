/**
 * Patch: Test Stability — Assertion Tests
 *
 * A) ENV.LLM_PROVIDER resolves to "manus" during vitest (setup override active)
 * B) OPENAI_API_KEY is undefined during vitest (cleared by setup)
 * C) The llmProvider module routes to invokeLLM (Manus), not OpenAI SDK
 */
import { describe, it, expect, vi } from "vitest";

describe("Patch: Test Stability — LLM_PROVIDER forced to manus", () => {
  // A) ENV.LLM_PROVIDER resolves to "manus"
  it("A: ENV.LLM_PROVIDER is 'manus' during vitest (setup override active)", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.LLM_PROVIDER).toBe("manus");
  });

  // B) OPENAI_API_KEY is cleared
  it("B: OPENAI_API_KEY is undefined during vitest (cleared by setup)", () => {
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
  });

  // C) callLLM routes to invokeLLM (Manus), not OpenAI
  it("C: callLLM uses Manus provider (invokeLLM) and does not call OpenAI SDK", async () => {
    const mockInvokeLLM = vi.fn().mockResolvedValue({
      choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop", index: 0 }],
    });
    const mockOpenAICreate = vi.fn();

    vi.doMock("./_core/llm", () => ({ invokeLLM: mockInvokeLLM }));
    vi.doMock("openai", () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create: mockOpenAICreate } },
      })),
    }));

    vi.resetModules();
    const { callLLM } = await import("./llmProvider");
    await callLLM({ messages: [{ role: "user" as const, content: "test" }] });

    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    expect(mockOpenAICreate).not.toHaveBeenCalled();

    vi.doUnmock("./_core/llm");
    vi.doUnmock("openai");
  });
});
