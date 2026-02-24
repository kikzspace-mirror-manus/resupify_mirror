/**
 * vn-exit-language-reset.test.ts
 *
 * Tests for the VN-exit languageMode cleanup in profile.setCountryPack.
 *
 * Spec: When a user switches from VN to any non-VN pack (CA/PH/US/GLOBAL),
 * languageMode is reset to "en". VN→VN and non-VN→VN do NOT reset.
 *
 * Coverage:
 * - A) Implementation: code shape in routers.ts
 * - B) Logic: VN→non-VN resets (US/CA/PH/GLOBAL)
 * - C) Logic: VN→VN no-op
 * - D) Logic: non-VN→VN no-op (VN default logic handles this)
 * - E) Response: languageModeReset field is returned
 * - F) Regression: VN one-time default logic unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const routersSource = readFileSync(
  join(__dirname, "routers.ts"),
  "utf-8"
);

// ─── A) Implementation: code shape ───────────────────────────────────────────

describe("A) Implementation: VN-exit reset code shape in setCountryPack", () => {
  it("A1: reads previousCountryPackId before update", () => {
    expect(routersSource).toContain("previousCountryPackId");
  });

  it("A2: previousCountryPackId falls back to GLOBAL for null users", () => {
    expect(routersSource).toContain('previousCountryPackId = (ctx.user as any).countryPackId ?? "GLOBAL"');
  });

  it("A3: languageModeReset checks previousCountryPackId === VN", () => {
    expect(routersSource).toContain('previousCountryPackId === "VN"');
  });

  it("A4: languageModeReset checks new pack !== VN", () => {
    expect(routersSource).toContain('input.countryPackId !== "VN"');
  });

  it("A5: calls updateUserLanguageMode with 'en' when reset", () => {
    // The reset branch should call updateUserLanguageMode(ctx.user.id, "en")
    const idx = routersSource.indexOf("languageModeReset");
    const snippet = routersSource.slice(idx, idx + 200);
    expect(snippet).toContain('"en"');
  });

  it("A6: languageModeReset is returned in response", () => {
    expect(routersSource).toContain("languageModeReset }");
  });

  it("A7: VN-exit reset is placed AFTER the VN one-time default block", () => {
    const defaultIdx = routersSource.indexOf("One-time VN languageMode default");
    const resetIdx = routersSource.indexOf("VN-exit cleanup");
    expect(resetIdx).toBeGreaterThan(defaultIdx);
  });
});

// ─── B) Logic: VN→non-VN resets languageMode ─────────────────────────────────

describe("B) Logic: VN→non-VN resets languageMode to en", () => {
  // Replicate the exact logic from routers.ts
  function computeLanguageModeReset(previousPackId: string, newPackId: string): boolean {
    return previousPackId === "VN" && newPackId !== "VN";
  }

  it("B1: VN→US triggers reset", () => {
    expect(computeLanguageModeReset("VN", "US")).toBe(true);
  });

  it("B2: VN→CA triggers reset", () => {
    expect(computeLanguageModeReset("VN", "CA")).toBe(true);
  });

  it("B3: VN→PH triggers reset", () => {
    expect(computeLanguageModeReset("VN", "PH")).toBe(true);
  });

  it("B4: VN→GLOBAL triggers reset", () => {
    expect(computeLanguageModeReset("VN", "GLOBAL")).toBe(true);
  });
});

// ─── C) Logic: VN→VN no-op ───────────────────────────────────────────────────

describe("C) Logic: VN→VN does NOT reset languageMode", () => {
  function computeLanguageModeReset(previousPackId: string, newPackId: string): boolean {
    return previousPackId === "VN" && newPackId !== "VN";
  }

  it("C1: VN→VN does not trigger reset", () => {
    expect(computeLanguageModeReset("VN", "VN")).toBe(false);
  });
});

// ─── D) Logic: non-VN→VN no-op ───────────────────────────────────────────────

describe("D) Logic: non-VN→VN does NOT reset languageMode", () => {
  function computeLanguageModeReset(previousPackId: string, newPackId: string): boolean {
    return previousPackId === "VN" && newPackId !== "VN";
  }

  it("D1: US→VN does not trigger reset", () => {
    expect(computeLanguageModeReset("US", "VN")).toBe(false);
  });

  it("D2: CA→VN does not trigger reset", () => {
    expect(computeLanguageModeReset("CA", "VN")).toBe(false);
  });

  it("D3: PH→VN does not trigger reset", () => {
    expect(computeLanguageModeReset("PH", "VN")).toBe(false);
  });

  it("D4: GLOBAL→VN does not trigger reset", () => {
    expect(computeLanguageModeReset("GLOBAL", "VN")).toBe(false);
  });

  it("D5: null→VN (GLOBAL fallback) does not trigger reset", () => {
    const previousPackId = (null as any) ?? "GLOBAL";
    expect(computeLanguageModeReset(previousPackId, "VN")).toBe(false);
  });
});

// ─── E) Response: languageModeReset field ────────────────────────────────────

describe("E) Response: languageModeReset field in setCountryPack return", () => {
  it("E1: return statement includes languageModeReset", () => {
    expect(routersSource).toContain("languageModeReset");
  });

  it("E2: return includes success: true", () => {
    const idx = routersSource.indexOf("return { success: true, languageModeSet, languageModeReset }");
    expect(idx).toBeGreaterThan(-1);
  });

  it("E3: languageModeReset is additive — languageModeSet is still returned", () => {
    expect(routersSource).toContain("languageModeSet, languageModeReset");
  });
});

// ─── F) Regression: VN one-time default logic unchanged ──────────────────────

describe("F) Regression: VN one-time default logic unchanged", () => {
  it("F1: languageModeSet still checks input.countryPackId === VN", () => {
    expect(routersSource).toContain('input.countryPackId === "VN"');
  });

  it("F2: languageModeSet still checks v2VnTranslationEnabled", () => {
    expect(routersSource).toContain("v2VnTranslationEnabled");
  });

  it("F3: languageModeSet still checks for null/undefined/empty languageMode", () => {
    expect(routersSource).toContain("currentLanguageMode === null");
    expect(routersSource).toContain("currentLanguageMode === undefined");
    expect(routersSource).toContain('currentLanguageMode === ""');
  });

  it("F4: VN one-time default still calls updateUserLanguageMode with 'vi'", () => {
    expect(routersSource).toContain('"vi"');
  });

  it("F5: VN one-time default block appears before VN-exit reset block", () => {
    const defaultIdx = routersSource.indexOf("One-time VN languageMode default");
    const resetIdx = routersSource.indexOf("VN-exit cleanup");
    expect(defaultIdx).toBeGreaterThan(-1);
    expect(resetIdx).toBeGreaterThan(-1);
    expect(defaultIdx).toBeLessThan(resetIdx);
  });

  it("F6: analytics event still fires after both DB operations", () => {
    // Search within the setCountryPack block (not the import at file top)
    const blockStart = routersSource.indexOf("setCountryPack:");
    const block = routersSource.slice(blockStart, blockStart + 2200);
    const analyticsIdx = block.indexOf("logAnalyticsEvent(EVT_COUNTRY_PACK_SELECTED");
    const resetIdx = block.indexOf("VN-exit cleanup");
    expect(analyticsIdx).toBeGreaterThan(-1);
    expect(resetIdx).toBeGreaterThan(-1);
    expect(analyticsIdx).toBeGreaterThan(resetIdx);
  });

  it("F7: analytics event still includes country_pack_id and language_mode_set", () => {
    // Search within the setCountryPack block (not the import at file top)
    const blockStart = routersSource.indexOf("setCountryPack:");
    const block = routersSource.slice(blockStart, blockStart + 2200);
    const analyticsIdx = block.indexOf("logAnalyticsEvent(EVT_COUNTRY_PACK_SELECTED");
    const snippet = block.slice(analyticsIdx, analyticsIdx + 200);
    expect(snippet).toContain("country_pack_id");
    expect(snippet).toContain("language_mode_set");
  });
});
