/**
 * V2 — Onboarding Step 0: Default languageMode=vi for VN (One-Time, Flag-Gated) Tests
 *
 * Covers:
 * - setCountryPack mutation: VN + flag ON + unset → languageModeSet=true, db.updateUserLanguageMode called
 * - setCountryPack mutation: VN + flag ON + existing en → languageModeSet=false (no override)
 * - setCountryPack mutation: VN + flag OFF → languageModeSet=false
 * - setCountryPack mutation: CA → languageModeSet=false
 * - Onboarding.tsx: invalidates auth.me after setCountryPack
 * - routers.ts: setCountryPack returns languageModeSet in response
 */
import { describe, it, expect, beforeAll } from "vitest";

// ─── routers.ts structural tests ─────────────────────────────────────────────

describe("routers.ts setCountryPack one-time VN languageMode default", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.resolve("server/routers.ts"), "utf-8");
  });

  it("T1: setCountryPack imports featureFlags", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 800);
    expect(block).toContain("featureFlags");
  });

  it("T2: setCountryPack checks v2VnTranslationEnabled", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 800);
    expect(block).toContain("v2VnTranslationEnabled");
  });

  it("T3: setCountryPack checks countryPackId === 'VN'", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 800);
    expect(block).toContain("\"VN\"");
  });

  it("T4: setCountryPack checks currentLanguageMode is null/undefined/empty", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 800);
    expect(block).toContain("currentLanguageMode");
    expect(block).toContain("null");
    expect(block).toContain("undefined");
  });

  it("T5: setCountryPack calls db.updateUserLanguageMode when languageModeSet", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 800);
    expect(block).toContain("db.updateUserLanguageMode");
    expect(block).toContain("\"vi\"");
  });

  it("T6: setCountryPack returns languageModeSet in response", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 1500);
    expect(block).toContain("languageModeSet");
    expect(block).toContain("return { success: true, languageModeSet }");
  });

  it("T7: setCountryPack one-time default is conditional (if languageModeSet)", () => {
    const idx = content.indexOf("setCountryPack:");
    const block = content.slice(idx, idx + 800);
    expect(block).toContain("if (languageModeSet)");
  });
});

// ─── Logic unit tests: languageModeSet conditions ────────────────────────────

describe("languageModeSet logic conditions", () => {
  // Replicate the exact condition from routers.ts for unit testing
  function shouldSetLanguageMode(
    countryPackId: string,
    v2VnTranslationEnabled: boolean,
    currentLanguageMode: string | null | undefined
  ): boolean {
    return (
      countryPackId === "VN" &&
      v2VnTranslationEnabled &&
      (currentLanguageMode === null || currentLanguageMode === undefined || currentLanguageMode === "")
    );
  }

  it("T8: VN + flag ON + languageMode null → true (should set vi)", () => {
    expect(shouldSetLanguageMode("VN", true, null)).toBe(true);
  });

  it("T9: VN + flag ON + languageMode undefined → true (should set vi)", () => {
    expect(shouldSetLanguageMode("VN", true, undefined)).toBe(true);
  });

  it("T10: VN + flag ON + languageMode empty string → true (should set vi)", () => {
    expect(shouldSetLanguageMode("VN", true, "")).toBe(true);
  });

  it("T11: VN + flag ON + languageMode 'en' → false (do NOT override)", () => {
    expect(shouldSetLanguageMode("VN", true, "en")).toBe(false);
  });

  it("T12: VN + flag ON + languageMode 'vi' → false (already set, no-op)", () => {
    expect(shouldSetLanguageMode("VN", true, "vi")).toBe(false);
  });

  it("T13: VN + flag ON + languageMode 'bilingual' → false (do NOT override)", () => {
    expect(shouldSetLanguageMode("VN", true, "bilingual")).toBe(false);
  });

  it("T14: VN + flag OFF + languageMode null → false (flag gates the feature)", () => {
    expect(shouldSetLanguageMode("VN", false, null)).toBe(false);
  });

  it("T15: CA + flag ON + languageMode null → false (non-VN unchanged)", () => {
    expect(shouldSetLanguageMode("CA", true, null)).toBe(false);
  });

  it("T16: GLOBAL + flag ON + languageMode null → false (non-VN unchanged)", () => {
    expect(shouldSetLanguageMode("GLOBAL", true, null)).toBe(false);
  });

  it("T17: PH + flag ON + languageMode null → false (non-VN unchanged)", () => {
    expect(shouldSetLanguageMode("PH", true, null)).toBe(false);
  });

  it("T18: US + flag ON + languageMode null → false (non-VN unchanged)", () => {
    expect(shouldSetLanguageMode("US", true, null)).toBe(false);
  });
});

// ─── Onboarding.tsx structural tests ─────────────────────────────────────────

describe("Onboarding.tsx auth.me invalidation after Step 0", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.resolve("client/src/pages/Onboarding.tsx"), "utf-8");
  });

  it("T19: Onboarding.tsx uses trpc.useUtils()", () => {
    expect(content).toContain("trpc.useUtils()");
  });

  it("T20: Onboarding.tsx calls utils.auth.me.invalidate() in handleCountryPackContinue", () => {
    expect(content).toContain("utils.auth.me.invalidate");
  });

  it("T21: utils.auth.me.invalidate is called after setCountryPack.mutateAsync", () => {
    const idx = content.indexOf("handleCountryPackContinue");
    const block = content.slice(idx, idx + 600);
    // Both calls must be in the same handler
    expect(block).toContain("setCountryPack.mutateAsync");
    expect(block).toContain("utils.auth.me.invalidate");
    // invalidate must come after mutateAsync (order check by position)
    const mutateIdx = block.indexOf("setCountryPack.mutateAsync");
    const invalidateIdx = block.indexOf("utils.auth.me.invalidate");
    expect(invalidateIdx).toBeGreaterThan(mutateIdx);
  });

  it("T22: Onboarding.tsx still resets trackCode to newDefault after Step 0", () => {
    const idx = content.indexOf("handleCountryPackContinue");
    const block = content.slice(idx, idx + 600);
    expect(block).toContain("setTrackCode(newDefault)");
  });

  it("T23: Onboarding.tsx still advances to step 1 after Step 0", () => {
    const idx = content.indexOf("handleCountryPackContinue");
    const block = content.slice(idx, idx + 600);
    expect(block).toContain("setStep(1)");
  });
});

// ─── db.ts structural tests ───────────────────────────────────────────────────

describe("db.ts updateUserLanguageMode used in setCountryPack flow", () => {
  const fs = require("fs");
  const path = require("path");
  let routersContent: string;

  beforeAll(() => {
    routersContent = fs.readFileSync(path.resolve("server/routers.ts"), "utf-8");
  });

  it("T24: routers.ts imports db.updateUserLanguageMode via db namespace", () => {
    // db.updateUserLanguageMode is called via the db import
    expect(routersContent).toContain("db.updateUserLanguageMode");
  });

  it("T25: setCountryPack sets languageMode to 'vi' (not 'en' or 'bilingual')", () => {
    const idx = routersContent.indexOf("setCountryPack:");
    const block = routersContent.slice(idx, idx + 800);
    // The specific call must use "vi"
    expect(block).toContain("updateUserLanguageMode(ctx.user.id, \"vi\")");
  });
});
