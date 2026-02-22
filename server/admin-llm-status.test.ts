/**
 * Patch: Admin LLM Status — Acceptance Tests
 *
 * A) Non-admin is blocked (FORBIDDEN)
 * B) Unauthenticated is blocked (UNAUTHORIZED)
 * C) Admin can access llmStatus.get
 * D) Returned fields are exactly { provider, openaiModel } — no secrets
 * E) provider reflects ENV.LLM_PROVIDER (default "manus")
 * F) openaiModel reflects ENV.LLM_MODEL_OPENAI (default "gpt-4.1")
 * G) OPENAI_API_KEY is NOT present in the response
 * H) forgeApiKey is NOT present in the response
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeAdminCtx() {
  return {
    user: { id: 1, email: "admin@test.com", name: "Admin", role: "admin" as const, isAdmin: true },
  } as any;
}

function makeUserCtx() {
  return {
    user: { id: 2, email: "user@test.com", name: "User", role: "user" as const, isAdmin: false },
  } as any;
}

function makeAnonCtx() {
  return { user: null } as any;
}

describe("Patch: Admin LLM Status", () => {
  // A) Non-admin is blocked
  it("A: non-admin user is blocked with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.admin.llmStatus.get()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // B) Unauthenticated is blocked
  it("B: unauthenticated request is blocked with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.admin.llmStatus.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // C) Admin can access
  it("C: admin can call llmStatus.get", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.llmStatus.get();
    expect(result).toBeDefined();
  });

  // D) Returned fields are exactly { provider, openaiModel }
  it("D: response contains exactly provider and openaiModel fields", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.llmStatus.get();
    const keys = Object.keys(result);
    expect(keys).toContain("provider");
    expect(keys).toContain("openaiModel");
    expect(keys.length).toBe(2);
  });

  // E) provider is a non-empty string (defaults to "manus")
  it("E: provider is a non-empty string", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.llmStatus.get();
    expect(typeof result.provider).toBe("string");
    expect(result.provider.length).toBeGreaterThan(0);
  });

  // F) openaiModel is a non-empty string (defaults to "gpt-4.1")
  it("F: openaiModel is a non-empty string", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.llmStatus.get();
    expect(typeof result.openaiModel).toBe("string");
    expect(result.openaiModel.length).toBeGreaterThan(0);
  });

  // G) OPENAI_API_KEY is NOT in the response
  it("G: OPENAI_API_KEY is not present in the response", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.llmStatus.get();
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain("OPENAI_API_KEY");
    expect(result).not.toHaveProperty("apiKey");
    expect(result).not.toHaveProperty("openaiApiKey");
  });

  // H) forgeApiKey is NOT in the response
  it("H: forgeApiKey / BUILT_IN_FORGE_API_KEY is not present in the response", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.llmStatus.get();
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain("forgeApiKey");
    expect(resultStr).not.toContain("BUILT_IN_FORGE");
    expect(result).not.toHaveProperty("forgeApiKey");
  });
});
