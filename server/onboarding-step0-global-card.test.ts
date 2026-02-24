/**
 * onboarding-step0-global-card.test.ts
 *
 * V2 Onboarding Phase 4 — Step 0: add Global option (GLOBAL) as 5th country card
 *
 * Tests:
 *   A) COUNTRY_OPTIONS contains GLOBAL as first entry
 *   B) GLOBAL card has correct label, flag, and id
 *   C) Ordering: GLOBAL, CA, VN, PH, US
 *   D) Grid layout updated for 5 cards
 *   E) Preselect logic includes GLOBAL
 *   F) VN languageMode guard is VN-only (server-side check)
 *   G) GLOBAL does not trigger VN language defaults in server router
 *   H) Regression: CA/VN/PH/US cards still present, flag OFF unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ONBOARDING_PATH = resolve(__dirname, "../client/src/pages/Onboarding.tsx");
const ROUTER_PATH = resolve(__dirname, "../server/routers.ts");

const onboarding = readFileSync(ONBOARDING_PATH, "utf-8");
const router = readFileSync(ROUTER_PATH, "utf-8");

// ── A: COUNTRY_OPTIONS contains GLOBAL ────────────────────────────────────

describe("A — COUNTRY_OPTIONS contains GLOBAL entry", () => {
  it("A1) GLOBAL id is present in COUNTRY_OPTIONS", () => {
    expect(onboarding).toContain('id: "GLOBAL"');
  });

  it("A2) GLOBAL label is 'Global'", () => {
    expect(onboarding).toContain('label: "Global"');
  });

  it("A3) GLOBAL flag is 🌐", () => {
    expect(onboarding).toContain('flag: "🌐"');
  });

  it("A4) COUNTRY_OPTIONS now has 5 entries", () => {
    // Count occurrences of 'id:' inside the COUNTRY_OPTIONS block
    const start = onboarding.indexOf("const COUNTRY_OPTIONS: CountryOption[]");
    const end = onboarding.indexOf("];", start);
    const block = onboarding.slice(start, end);
    const idMatches = block.match(/id: "/g);
    expect(idMatches).toHaveLength(5);
  });
});

// ── B: GLOBAL card properties ─────────────────────────────────────────────

describe("B — GLOBAL card has correct properties", () => {
  it("B1) GLOBAL entry has id GLOBAL", () => {
    const start = onboarding.indexOf('id: "GLOBAL"');
    const end = onboarding.indexOf("},", start);
    const block = onboarding.slice(start, end);
    expect(block).toContain('id: "GLOBAL"');
  });

  it("B2) GLOBAL entry has label 'Global'", () => {
    const start = onboarding.indexOf('id: "GLOBAL"');
    const end = onboarding.indexOf("},", start);
    const block = onboarding.slice(start, end);
    expect(block).toContain('label: "Global"');
  });

  it("B3) GLOBAL entry has globe flag emoji", () => {
    const start = onboarding.indexOf('id: "GLOBAL"');
    const end = onboarding.indexOf("},", start);
    const block = onboarding.slice(start, end);
    expect(block).toContain("🌐");
  });

  it("B4) GLOBAL entry has a sublabel", () => {
    const start = onboarding.indexOf('id: "GLOBAL"');
    const end = onboarding.indexOf("},", start);
    const block = onboarding.slice(start, end);
    expect(block).toContain("sublabel:");
  });
});

// ── C: Ordering ────────────────────────────────────────────────────────────

describe("C — Ordering: GLOBAL first, then CA, VN, PH, US", () => {
  it("C1) GLOBAL appears before CA in COUNTRY_OPTIONS", () => {
    const globalIdx = onboarding.indexOf('id: "GLOBAL"');
    const caIdx = onboarding.indexOf('id: "CA"');
    expect(globalIdx).toBeLessThan(caIdx);
  });

  it("C2) CA appears before VN in COUNTRY_OPTIONS", () => {
    const caIdx = onboarding.indexOf('id: "CA"');
    const vnIdx = onboarding.indexOf('id: "VN"');
    expect(caIdx).toBeLessThan(vnIdx);
  });

  it("C3) VN appears before PH in COUNTRY_OPTIONS", () => {
    const vnIdx = onboarding.indexOf('id: "VN"');
    const phIdx = onboarding.indexOf('id: "PH"');
    expect(vnIdx).toBeLessThan(phIdx);
  });

  it("C4) PH appears before US in COUNTRY_OPTIONS", () => {
    const phIdx = onboarding.indexOf('id: "PH"');
    const usIdx = onboarding.indexOf('id: "US"');
    expect(phIdx).toBeLessThan(usIdx);
  });

  it("C5) All 5 IDs are present in correct order (GLOBAL, CA, VN, PH, US)", () => {
    const start = onboarding.indexOf("const COUNTRY_OPTIONS: CountryOption[]");
    const end = onboarding.indexOf("];", start);
    const block = onboarding.slice(start, end);
    const ids = [...block.matchAll(/id: "(\w+)"/g)].map(m => m[1]);
    expect(ids).toEqual(["GLOBAL", "CA", "VN", "PH", "US"]);
  });
});

// ── D: Grid layout updated for 5 cards ────────────────────────────────────

describe("D — Grid layout: dynamic countryGridClass", () => {
  it("D1) countryGridClass is used on the RadioGroup", () => {
    expect(onboarding).toContain("countryGridClass");
  });

  it("D2) 5-pack branch still has md:grid-cols-5", () => {
    expect(onboarding).toContain("md:grid-cols-5");
  });

  it("D3) Grid has responsive breakpoints (grid-cols-2 and sm:grid-cols-3 in 5-pack branch)", () => {
    expect(onboarding).toContain("grid-cols-2");
    expect(onboarding).toContain("sm:grid-cols-3");
  });

  it("D4) 4-pack branch uses md:grid-cols-4", () => {
    expect(onboarding).toContain("md:grid-cols-4");
  });

  it("D5) 2-pack branch uses grid-cols-2 (no blank third slot)", () => {
    expect(onboarding).toContain('if (n === 2) return "grid-cols-2"');
  });

  it("D6) 3-pack branch uses grid-cols-3", () => {
    expect(onboarding).toContain('if (n === 3) return "grid-cols-3"');
  });
});

// ── E: Preselect logic includes GLOBAL ────────────────────────────────────

describe("E — Preselect logic includes GLOBAL", () => {
  it("E1) GLOBAL is included in the preselect guard condition", () => {
    // The useState initializer should include GLOBAL in its valid-pack check
    const initStart = onboarding.indexOf("const [selectedCountryPackId, setSelectedCountryPackId]");
    const initEnd = onboarding.indexOf(");", initStart);
    const initBlock = onboarding.slice(initStart, initEnd);
    expect(initBlock).toContain('"GLOBAL"');
  });

  it("E2) Preselect block checks all 5 packs (CA, VN, PH, US, GLOBAL)", () => {
    const initStart = onboarding.indexOf("const [selectedCountryPackId, setSelectedCountryPackId]");
    const initEnd = onboarding.indexOf(");", initStart);
    const initBlock = onboarding.slice(initStart, initEnd);
    expect(initBlock).toContain('"CA"');
    expect(initBlock).toContain('"VN"');
    expect(initBlock).toContain('"PH"');
    expect(initBlock).toContain('"US"');
    expect(initBlock).toContain('"GLOBAL"');
  });
});

// ── F: VN languageMode guard is VN-only (server-side) ─────────────────────

describe("F — VN languageMode guard is VN-only in server router", () => {
  it("F1) languageModeSet condition checks countryPackId === 'VN'", () => {
    const lmStart = router.indexOf("languageModeSet");
    const lmEnd = router.indexOf(";", lmStart + 50);
    const block = router.slice(lmStart, lmEnd + 50);
    expect(block).toContain('"VN"');
  });

  it("F2) languageModeSet does NOT reference GLOBAL", () => {
    const lmStart = router.indexOf("languageModeSet");
    const lmEnd = router.indexOf("languageModeReset", lmStart);
    const block = router.slice(lmStart, lmEnd);
    expect(block).not.toContain('"GLOBAL"');
  });

  it("F3) languageModeReset triggers when switching away FROM VN (not from GLOBAL)", () => {
    const lmrStart = router.indexOf("languageModeReset");
    const lmrEnd = router.indexOf(";", lmrStart + 50);
    const block = router.slice(lmrStart, lmrEnd + 100);
    expect(block).toContain('"VN"');
    // GLOBAL should not be in the reset condition
    expect(block).not.toContain('"GLOBAL"');
  });
});

// ── G: GLOBAL does not trigger VN language defaults ───────────────────────

describe("G — GLOBAL does not trigger VN language defaults", () => {
  it("G1) setCountryPack procedure has VN-specific guard for languageMode=vi", () => {
    // The guard is: input.countryPackId === "VN" && v2VnTranslationEnabled && !currentLanguageMode
    const setPackStart = router.indexOf("setCountryPack:");
    const setPackEnd = router.indexOf("// ─", setPackStart + 100);
    const block = router.slice(setPackStart, setPackEnd);
    expect(block).toContain('input.countryPackId === "VN"');
  });

  it("G2) The languageMode=vi assignment is inside the VN-only condition", () => {
    const lmSetStart = router.indexOf("languageModeSet =");
    const lmSetEnd = router.indexOf("languageModeReset", lmSetStart);
    const block = router.slice(lmSetStart, lmSetEnd);
    // Must check for VN explicitly
    expect(block).toContain('"VN"');
    // Must not set vi for GLOBAL
    expect(block).not.toContain('"GLOBAL"');
  });

  it("G3) Selecting GLOBAL would not match the VN languageMode condition", () => {
    // Structural test: the condition is === "VN", so GLOBAL cannot match
    const lmSetStart = router.indexOf("languageModeSet =");
    const lmSetEnd = router.indexOf(";", lmSetStart);
    const condition = router.slice(lmSetStart, lmSetEnd);
    // Condition must use strict equality with "VN"
    expect(condition).toMatch(/=== "VN"/);
  });
});

// ── H: Regression ─────────────────────────────────────────────────────────

describe("H — Regression: existing cards and V1 unchanged", () => {
  it("H1) CA card still present in COUNTRY_OPTIONS", () => {
    expect(onboarding).toContain('id: "CA"');
    expect(onboarding).toContain('label: "Canada"');
  });

  it("H2) VN card still present in COUNTRY_OPTIONS", () => {
    expect(onboarding).toContain('id: "VN"');
    expect(onboarding).toContain('label: "Vietnam"');
  });

  it("H3) PH card still present in COUNTRY_OPTIONS", () => {
    expect(onboarding).toContain('id: "PH"');
    expect(onboarding).toContain('label: "Philippines"');
  });

  it("H4) US card still present in COUNTRY_OPTIONS", () => {
    expect(onboarding).toContain('id: "US"');
    expect(onboarding).toContain('label: "United States"');
  });

  it("H5) Step 0 is still gated behind v2CountryPacksEnabled flag", () => {
    expect(onboarding).toContain("step === 0 && v2CountryPacksEnabled");
  });

  it("H6) country-option-GLOBAL testid will be rendered (data-testid pattern present)", () => {
    expect(onboarding).toContain('data-testid={`country-option-${country.id}`}');
  });

  it("H7) country-option-CA testid pattern still works for existing cards", () => {
    // The testid is dynamic, generated from country.id
    expect(onboarding).toContain('data-testid={`country-option-${country.id}`}');
  });

  it("H8) country-continue-btn testid still present", () => {
    expect(onboarding).toContain('data-testid="country-continue-btn"');
  });

  it("H9) step-0 card testid still present", () => {
    expect(onboarding).toContain('data-testid="step0-country-card"');
  });

  it("H10) V1 default step is still 1 when flag OFF", () => {
    expect(onboarding).toContain("v2CountryPacksEnabled ? 0 : 1");
  });
});
