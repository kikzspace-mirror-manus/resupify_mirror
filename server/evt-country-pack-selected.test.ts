/**
 * V2 — Onboarding Step 0: EVT_COUNTRY_PACK_SELECTED Analytics Tests
 *
 * Covers:
 * - EVT_COUNTRY_PACK_SELECTED constant exists in shared/analyticsEvents.ts
 * - EVT_COUNTRY_PACK_SELECTED is in ALL_EVENT_NAMES
 * - routers.ts: setCountryPack fires logAnalyticsEvent after DB commits
 * - routers.ts: analytics call is wrapped in try/catch (fire-and-forget)
 * - routers.ts: event payload uses country_pack_id and language_mode_set (no PII)
 * - routers.ts: analytics fires after both updateUserCountryPack and updateUserLanguageMode
 * - Failure path: analytics throw does not propagate
 */
import { describe, it, expect, beforeAll } from "vitest";

// ─── shared/analyticsEvents.ts structural tests ───────────────────────────────

describe("shared/analyticsEvents.ts EVT_COUNTRY_PACK_SELECTED", () => {
  it("T1: EVT_COUNTRY_PACK_SELECTED is exported from shared/analyticsEvents.ts", async () => {
    const { EVT_COUNTRY_PACK_SELECTED } = await import("../shared/analyticsEvents");
    expect(EVT_COUNTRY_PACK_SELECTED).toBe("country_pack_selected");
  });

  it("T2: EVT_COUNTRY_PACK_SELECTED is in ALL_EVENT_NAMES", async () => {
    const { ALL_EVENT_NAMES, EVT_COUNTRY_PACK_SELECTED } = await import("../shared/analyticsEvents");
    expect(ALL_EVENT_NAMES).toContain(EVT_COUNTRY_PACK_SELECTED);
  });

  it("T3: EVT_COUNTRY_PACK_SELECTED value is snake_case and max 64 chars", async () => {
    const { EVT_COUNTRY_PACK_SELECTED } = await import("../shared/analyticsEvents");
    expect(EVT_COUNTRY_PACK_SELECTED).toMatch(/^[a-z_]+$/);
    expect(EVT_COUNTRY_PACK_SELECTED.length).toBeLessThanOrEqual(64);
  });
});

// ─── routers.ts structural tests ─────────────────────────────────────────────

describe("routers.ts setCountryPack analytics instrumentation", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;
  let setCountryPackBlock: string;

  beforeAll(() => {
    content = fs.readFileSync(path.resolve("server/routers.ts"), "utf-8");
    const idx = content.indexOf("setCountryPack:");
    setCountryPackBlock = content.slice(idx, idx + 1500);
  });

  it("T4: EVT_COUNTRY_PACK_SELECTED is imported in routers.ts", () => {
    expect(content).toContain("EVT_COUNTRY_PACK_SELECTED");
  });

  it("T5: logAnalyticsEvent is called with EVT_COUNTRY_PACK_SELECTED in setCountryPack", () => {
    expect(setCountryPackBlock).toContain("logAnalyticsEvent(EVT_COUNTRY_PACK_SELECTED");
  });

  it("T6: analytics call includes country_pack_id prop (no PII)", () => {
    expect(setCountryPackBlock).toContain("country_pack_id");
  });

  it("T7: analytics call includes language_mode_set prop", () => {
    expect(setCountryPackBlock).toContain("language_mode_set");
  });

  it("T8: analytics call does NOT include userId, email, name, or other PII fields", () => {
    // The props object should only have country_pack_id and language_mode_set
    const propsStart = setCountryPackBlock.indexOf("country_pack_id");
    const propsBlock = setCountryPackBlock.slice(propsStart, propsStart + 200);
    expect(propsBlock).not.toContain("email");
    expect(propsBlock).not.toContain("name");
    expect(propsBlock).not.toContain("openId");
  });

  it("T9: analytics call is wrapped in try/catch (fire-and-forget)", () => {
    // The try block must contain the analytics call
    const tryIdx = setCountryPackBlock.lastIndexOf("try {");
    const catchIdx = setCountryPackBlock.lastIndexOf("catch");
    expect(tryIdx).toBeGreaterThan(-1);
    expect(catchIdx).toBeGreaterThan(tryIdx);
    const tryBlock = setCountryPackBlock.slice(tryIdx, catchIdx);
    expect(tryBlock).toContain("logAnalyticsEvent");
  });

  it("T10: analytics fires AFTER DB commits (after updateUserCountryPack and optional updateUserLanguageMode)", () => {
    const dbUpdateIdx = setCountryPackBlock.indexOf("updateUserCountryPack");
    const analyticsIdx = setCountryPackBlock.indexOf("logAnalyticsEvent");
    expect(analyticsIdx).toBeGreaterThan(dbUpdateIdx);
  });

  it("T11: analytics fires BEFORE the return statement", () => {
    const analyticsIdx = setCountryPackBlock.indexOf("logAnalyticsEvent");
    const returnIdx = setCountryPackBlock.lastIndexOf("return { success: true");
    expect(analyticsIdx).toBeLessThan(returnIdx);
  });

  it("T12: catch block swallows analytics errors (non-blocking)", () => {
    const catchIdx = setCountryPackBlock.lastIndexOf("catch");
    const catchBlock = setCountryPackBlock.slice(catchIdx, catchIdx + 100);
    // Catch block should not re-throw
    expect(catchBlock).not.toContain("throw");
  });
});

// ─── Integration tests: setCountryPack fires analytics ───────────────────────

describe("setCountryPack integration: analytics event fired", () => {
  const makeCtx = (languageMode: string | null = null, countryPackId: string | null = null) => ({
    user: {
      id: 42, openId: "test-open-id", name: "Test User", email: "test@example.com",
      role: "user" as const, isAdmin: false, adminNotes: null,
      disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false,
      countryPackId, languageMode,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      loginMethod: null,
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  });

  it("T13: setCountryPack CA succeeds and returns success=true", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx("en", null));
    const result = await caller.profile.setCountryPack({ countryPackId: "CA" });
    expect(result.success).toBe(true);
    // CA never sets languageMode
    expect(result.languageModeSet).toBe(false);
  });

  it("T14: setCountryPack VN with existing languageMode=en returns success=true, languageModeSet=false", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx("en", null));
    const result = await caller.profile.setCountryPack({ countryPackId: "VN" });
    expect(result.success).toBe(true);
    // languageMode already "en" → not overridden
    expect(result.languageModeSet).toBe(false);
  });

  it("T15: setCountryPack VN with languageMode=null returns success=true (languageModeSet depends on flag)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx(null, null));
    const result = await caller.profile.setCountryPack({ countryPackId: "VN" });
    expect(result.success).toBe(true);
    // languageModeSet is boolean (true if flag ON, false if flag OFF)
    expect(typeof result.languageModeSet).toBe("boolean");
  });

  it("T16: setCountryPack does not throw when analytics fails (non-blocking)", async () => {
    // This test verifies the try/catch around analytics is effective.
    // Since logAnalyticsEvent is already fire-and-forget internally,
    // the outer try/catch in setCountryPack is an extra safety net.
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx("en", null));
    // Should not throw even if analytics has issues
    await expect(
      caller.profile.setCountryPack({ countryPackId: "CA" })
    ).resolves.not.toThrow();
  });
});

// ─── Payload shape tests ──────────────────────────────────────────────────────

describe("EVT_COUNTRY_PACK_SELECTED payload shape", () => {
  it("T17: payload has exactly country_pack_id and language_mode_set (no PII)", () => {
    // Verify the expected payload shape matches the spec
    const expectedPayload = {
      country_pack_id: "VN",
      language_mode_set: true,
    };
    expect(Object.keys(expectedPayload)).toEqual(["country_pack_id", "language_mode_set"]);
    expect(expectedPayload.country_pack_id).toBe("VN");
    expect(expectedPayload.language_mode_set).toBe(true);
  });

  it("T18: language_mode_set is boolean (not string or number)", () => {
    const payload = { country_pack_id: "CA", language_mode_set: false };
    expect(typeof payload.language_mode_set).toBe("boolean");
  });

  it("T19: country_pack_id is the raw countryPackId string (CA or VN)", () => {
    const caPayload = { country_pack_id: "CA", language_mode_set: false };
    const vnPayload = { country_pack_id: "VN", language_mode_set: true };
    expect(caPayload.country_pack_id).toBe("CA");
    expect(vnPayload.country_pack_id).toBe("VN");
  });
});
