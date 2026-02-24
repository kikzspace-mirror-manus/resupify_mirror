/**
 * onboarding-step0-responsive-grid.test.ts
 *
 * Tests for V2 Onboarding Step 0: auto-fit grid based on enabled pack count.
 *
 * Coverage:
 * A) countryGridClass logic is present and correct for each count (1–5)
 * B) filteredCountries is used in the map (no inline filter on COUNTRY_OPTIONS)
 * C) RadioGroup uses countryGridClass (dynamic, not hardcoded)
 * D) All 5 grid-class branches are present in source
 * E) Regression: country-selector testid still present
 * F) Regression: COUNTRY_OPTIONS still has all 5 entries (GLOBAL/CA/VN/PH/US)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(
  join(__dirname, "../client/src/pages/Onboarding.tsx"),
  "utf-8"
);

// ─── A) countryGridClass logic ────────────────────────────────────────────────

describe("A: countryGridClass — correct class for each count", () => {
  it("A1: countryGridClass variable is declared in source", () => {
    expect(src).toContain("countryGridClass");
  });

  it("A2: n <= 1 branch returns grid-cols-1 justify-items-center", () => {
    expect(src).toContain('if (n <= 1) return "grid-cols-1 justify-items-center"');
  });

  it("A3: n === 2 branch returns grid-cols-2 (no third empty slot)", () => {
    expect(src).toContain('if (n === 2) return "grid-cols-2"');
  });

  it("A4: n === 3 branch returns grid-cols-3", () => {
    expect(src).toContain('if (n === 3) return "grid-cols-3"');
  });

  it("A5: n === 4 branch returns grid-cols-2 md:grid-cols-4", () => {
    expect(src).toContain('if (n === 4) return "grid-cols-2 md:grid-cols-4"');
  });

  it("A6: n === 5 (default) branch returns grid-cols-2 sm:grid-cols-3 md:grid-cols-5", () => {
    expect(src).toContain('"grid-cols-2 sm:grid-cols-3 md:grid-cols-5"');
  });

  it("A7: countryGridClass is an IIFE (immediately invoked function expression)", () => {
    expect(src).toContain("const countryGridClass = (() => {");
  });
});

// ─── B) filteredCountries used in map ────────────────────────────────────────

describe("B: filteredCountries — derived and used in map", () => {
  it("B1: filteredCountries is declared", () => {
    expect(src).toContain("filteredCountries");
  });

  it("B2: filteredCountries is derived from COUNTRY_OPTIONS filtered by enabledCountryPacks", () => {
    expect(src).toContain("COUNTRY_OPTIONS.filter((c) => enabledCountryPacks.includes(c.id))");
  });

  it("B3: filteredCountries.map is used in the RadioGroup (not inline filter)", () => {
    expect(src).toContain("filteredCountries.map((country) => (");
  });

  it("B4: filteredCountries.length is used in countryGridClass", () => {
    expect(src).toContain("filteredCountries.length");
  });
});

// ─── C) RadioGroup uses countryGridClass ─────────────────────────────────────

describe("C: RadioGroup — dynamic class via countryGridClass", () => {
  it("C1: RadioGroup className uses countryGridClass interpolation", () => {
    expect(src).toContain("`grid ${countryGridClass} gap-4`");
  });

  it("C2: RadioGroup does NOT use the old hardcoded fixed class string", () => {
    expect(src).not.toContain('"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"');
  });

  it("C3: country-selector testid is still present on RadioGroup", () => {
    expect(src).toContain('data-testid="country-selector"');
  });
});

// ─── D) All grid-class branches present ──────────────────────────────────────

describe("D: All grid-class branches present in source", () => {
  it("D1: grid-cols-1 justify-items-center (1-pack branch) is present", () => {
    expect(src).toContain("grid-cols-1 justify-items-center");
  });

  it("D2: grid-cols-2 (2-pack branch) is present", () => {
    expect(src).toContain("grid-cols-2");
  });

  it("D3: grid-cols-3 (3-pack branch) is present", () => {
    expect(src).toContain("grid-cols-3");
  });

  it("D4: md:grid-cols-4 (4-pack branch) is present", () => {
    expect(src).toContain("md:grid-cols-4");
  });

  it("D5: md:grid-cols-5 (5-pack branch) is present", () => {
    expect(src).toContain("md:grid-cols-5");
  });
});

// ─── E) Regression: country-selector testid ──────────────────────────────────

describe("E: Regression — country-selector testid", () => {
  it("E1: country-selector testid is present", () => {
    expect(src).toContain('data-testid="country-selector"');
  });

  it("E2: country-continue-btn testid is present", () => {
    expect(src).toContain('data-testid="country-continue-btn"');
  });

  it("E3: step0-country-card testid is present", () => {
    expect(src).toContain('data-testid="step0-country-card"');
  });
});

// ─── F) Regression: COUNTRY_OPTIONS still has all 5 entries ──────────────────

describe("F: Regression — COUNTRY_OPTIONS completeness", () => {
  it("F1: GLOBAL entry is in COUNTRY_OPTIONS", () => {
    expect(src).toContain('"GLOBAL"');
  });

  it("F2: CA entry is in COUNTRY_OPTIONS", () => {
    expect(src).toContain('"CA"');
  });

  it("F3: VN entry is in COUNTRY_OPTIONS", () => {
    expect(src).toContain('"VN"');
  });

  it("F4: PH entry is in COUNTRY_OPTIONS", () => {
    expect(src).toContain('"PH"');
  });

  it("F5: US entry is in COUNTRY_OPTIONS", () => {
    expect(src).toContain('"US"');
  });

  it("F6: COUNTRY_OPTIONS is still defined as a const array", () => {
    expect(src).toContain("const COUNTRY_OPTIONS");
  });
});
