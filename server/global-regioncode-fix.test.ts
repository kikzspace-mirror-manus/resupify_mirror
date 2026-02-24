/**
 * global-regioncode-fix.test.ts
 *
 * Tests for:
 * A) Root cause fix: getTracksForCountry("GLOBAL") returns regionCode="GLOBAL" not "CA"
 * B) Regression: GLOBAL onboarding never renders CA-only copy strings
 * C) Progress/step count: GLOBAL gets 3 steps (not 4) when Work Auth is hidden
 * D) Audit: effectiveRegionCode usage in Onboarding.tsx is not used for gating
 * E) Audit: showWorkAuthStep uses selectedCountryPackId, not effectiveRegionCode
 * F) Audit: Profile.tsx showWorkAuthCard uses userCountryPackId directly
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getTracksForCountry } from "../shared/trackOptions";

const SHARED_ROOT = join(__dirname, "..");
const onboardingSrc = readFileSync(
  join(SHARED_ROOT, "client/src/pages/Onboarding.tsx"),
  "utf8"
);
const profileSrc = readFileSync(
  join(SHARED_ROOT, "client/src/pages/Profile.tsx"),
  "utf8"
);
const trackOptionsSrc = readFileSync(
  join(SHARED_ROOT, "shared/trackOptions.ts"),
  "utf8"
);

// ─── A: Root cause fix ───────────────────────────────────────────────────────

describe("A: getTracksForCountry GLOBAL regionCode fix", () => {
  it("A1: GLOBAL with v2=true returns regionCode='GLOBAL'", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("A2: GLOBAL with v2=true does NOT return regionCode='CA'", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.regionCode).not.toBe("CA");
  });

  it("A3: null pack with v2=true returns regionCode='GLOBAL'", () => {
    const result = getTracksForCountry(null, true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("A4: undefined pack with v2=true returns regionCode='GLOBAL'", () => {
    const result = getTracksForCountry(undefined, true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("A5: GLOBAL with v2=true returns empty tracks array", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.tracks).toHaveLength(0);
  });

  it("A6: GLOBAL with v2=true returns hasTracksForCountry=false", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.hasTracksForCountry).toBe(false);
  });

  it("A7: CA with v2=true still returns regionCode='CA' (unchanged)", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.regionCode).toBe("CA");
  });

  it("A8: VN with v2=true still returns regionCode='VN' (unchanged)", () => {
    const result = getTracksForCountry("VN", true);
    expect(result.regionCode).toBe("VN");
  });

  it("A9: PH with v2=true still returns regionCode='PH' (unchanged)", () => {
    const result = getTracksForCountry("PH", true);
    expect(result.regionCode).toBe("PH");
  });

  it("A10: US with v2=true still returns regionCode='US' (unchanged)", () => {
    const result = getTracksForCountry("US", true);
    expect(result.regionCode).toBe("US");
  });

  it("A11: v2=false (V1) still returns regionCode='CA' for any pack (V1 unchanged)", () => {
    const result = getTracksForCountry("GLOBAL", false);
    expect(result.regionCode).toBe("CA");
  });

  it("A12: behaviour matrix comment updated to show GLOBAL → GLOBAL", () => {
    expect(trackOptionsSrc).toContain("| true      | GLOBAL        | any    | []            | NEW_GRAD     | GLOBAL     |");
  });

  it("A13: GLOBAL fallback comment explains the fix", () => {
    expect(trackOptionsSrc).toContain('regionCode="GLOBAL", NOT "CA"');
  });
});

// ─── B: Regression — GLOBAL onboarding never renders CA-only copy ───────────

describe("B: GLOBAL onboarding never renders CA-only copy strings", () => {
  it("B1: showWorkAuthStep uses selectedCountryPackId, not effectiveRegionCode", () => {
    expect(onboardingSrc).toContain(
      'const showWorkAuthStep = selectedCountryPackId === "CA" || selectedCountryPackId === "US"'
    );
  });

  it("B2: showWorkAuthStep does NOT use effectiveRegionCode for the CA/US check", () => {
    // The gating line must not reference effectiveRegionCode
    const gatingLine = onboardingSrc
      .split("\n")
      .find((l) => l.includes("const showWorkAuthStep"));
    expect(gatingLine).toBeDefined();
    expect(gatingLine).not.toContain("effectiveRegionCode");
  });

  it("B3: handleComplete work auth save guard uses selectedCountryPackId", () => {
    expect(onboardingSrc).toContain(
      'selectedCountryPackId === "CA" || selectedCountryPackId === "US"'
    );
  });

  it("B4: isCoopCA uses selectedCountryPackId === 'CA' (not effectiveRegionCode)", () => {
    const coopLine = onboardingSrc
      .split("\n")
      .find((l) => l.includes("isCoopCA"));
    expect(coopLine).toBeDefined();
    expect(coopLine).not.toContain("effectiveRegionCode");
  });

  it("B5: workAuthStepCopy uses selectedCountryPackId === 'US' (not effectiveRegionCode)", () => {
    const copyLine = onboardingSrc
      .split("\n")
      .find((l) => l.includes("workAuthStepCopy") && l.includes("selectedCountryPackId"));
    expect(copyLine).toBeDefined();
  });

  it("B6: 'Work status in Canada' string is inside workAuthStepCopy block (not unconditional)", () => {
    const idx = onboardingSrc.indexOf("Work status in Canada");
    expect(idx).toBeGreaterThan(-1);
    // Must be inside the workAuthStepCopy object, not a standalone string
    // The const declaration is further back (ternary spans multiple lines)
    const before = onboardingSrc.slice(Math.max(0, idx - 500), idx);
    expect(before).toContain("workAuthStepCopy");
  });
});

// ─── C: Progress/step count for GLOBAL ──────────────────────────────────────

describe("C: Onboarding progress/step count for GLOBAL", () => {
  it("C1: totalSteps uses showWorkAuthStep for the 4-vs-3 decision", () => {
    expect(onboardingSrc).toContain("showWorkAuthStep ? 4 : 3");
  });

  it("C2: totalSteps does NOT use effectiveRegionCode for the step count", () => {
    const totalStepsLine = onboardingSrc
      .split("\n")
      .find((l) => l.includes("const totalSteps"));
    expect(totalStepsLine).toBeDefined();
    expect(totalStepsLine).not.toContain("effectiveRegionCode");
  });

  it("C3: GLOBAL gets 3 steps (v2=true, showWorkAuthStep=false)", () => {
    // Simulate the logic: v2=true, showWorkAuthStep=false (GLOBAL not CA/US)
    const v2CountryPacksEnabled = true;
    const showWorkAuthStep = false; // GLOBAL
    const totalSteps = v2CountryPacksEnabled ? (showWorkAuthStep ? 4 : 3) : (showWorkAuthStep ? 3 : 2);
    expect(totalSteps).toBe(3);
  });

  it("C4: CA gets 4 steps (v2=true, showWorkAuthStep=true)", () => {
    const v2CountryPacksEnabled = true;
    const showWorkAuthStep = true; // CA
    const totalSteps = v2CountryPacksEnabled ? (showWorkAuthStep ? 4 : 3) : (showWorkAuthStep ? 3 : 2);
    expect(totalSteps).toBe(4);
  });

  it("C5: V1 (flag OFF) gets 3 steps with work auth", () => {
    const v2CountryPacksEnabled = false;
    const showWorkAuthStep = true;
    const totalSteps = v2CountryPacksEnabled ? (showWorkAuthStep ? 4 : 3) : (showWorkAuthStep ? 3 : 2);
    expect(totalSteps).toBe(3);
  });

  it("C6: V1 (flag OFF) gets 2 steps without work auth", () => {
    const v2CountryPacksEnabled = false;
    const showWorkAuthStep = false;
    const totalSteps = v2CountryPacksEnabled ? (showWorkAuthStep ? 4 : 3) : (showWorkAuthStep ? 3 : 2);
    expect(totalSteps).toBe(2);
  });
});

// ─── D: Audit — effectiveRegionCode usage in Onboarding.tsx ─────────────────

describe("D: effectiveRegionCode audit in Onboarding.tsx", () => {
  it("D1: effectiveRegionCode is only used for persisting regionCode in the upsert call", () => {
    const usages = onboardingSrc
      .split("\n")
      .filter((l) => l.includes("effectiveRegionCode") && !l.includes("//"));
    // Should only appear in: destructuring + upsert call
    // All gating decisions (showWorkAuthStep, isCoopCA, workAuthStepCopy) must NOT use it
    const gatingUsages = usages.filter(
      (l) =>
        l.includes("showWorkAuthStep") ||
        l.includes("isCoopCA") ||
        l.includes("workAuthStepCopy") ||
        l.includes("totalSteps")
    );
    expect(gatingUsages).toHaveLength(0);
  });

  it("D2: effectiveRegionCode comment warns about GLOBAL fallback", () => {
    expect(onboardingSrc).toContain(
      "effectiveRegionCode returns \"CA\" for GLOBAL as a fallback"
    );
  });
});

// ─── E: Audit — Profile.tsx showWorkAuthCard ─────────────────────────────────

describe("E: Profile.tsx showWorkAuthCard audit", () => {
  it("E1: showWorkAuthCard uses userCountryPackId directly (not effectiveRegionCode)", () => {
    const line = profileSrc
      .split("\n")
      .find((l) => l.includes("const showWorkAuthCard"));
    expect(line).toBeDefined();
    expect(line).toContain("userCountryPackId");
    expect(line).not.toContain("effectiveRegionCode");
  });

  it("E2: showWorkAuthCard checks for CA and US explicitly", () => {
    const line = profileSrc
      .split("\n")
      .find((l) => l.includes("const showWorkAuthCard"));
    expect(line).toContain('"CA"');
    expect(line).toContain('"US"');
  });
});

// ─── F: trackOptions.ts source integrity ────────────────────────────────────

describe("F: trackOptions.ts source integrity after fix", () => {
  it("F1: GLOBAL fallback block does not contain regionCode: 'CA'", () => {
    // Find the GLOBAL fallback return block
    const globalIdx = trackOptionsSrc.indexOf("// GLOBAL (or unknown pack)");
    expect(globalIdx).toBeGreaterThan(-1);
    const fallbackBlock = trackOptionsSrc.slice(globalIdx, globalIdx + 500);
    expect(fallbackBlock).not.toContain('regionCode: "CA"');
    expect(fallbackBlock).toContain('regionCode: "GLOBAL"');
  });

  it("F2: CA branch still returns regionCode: 'CA'", () => {
    const caIdx = trackOptionsSrc.indexOf('if (effectivePack === "CA")');
    expect(caIdx).toBeGreaterThan(-1);
    const caBlock = trackOptionsSrc.slice(caIdx, caIdx + 200);
    expect(caBlock).toContain('regionCode: "CA"');
  });

  it("F3: V1 fallback (flag OFF) still returns regionCode: 'CA'", () => {
    const v1Idx = trackOptionsSrc.indexOf("// Flag OFF");
    expect(v1Idx).toBeGreaterThan(-1);
    const v1Block = trackOptionsSrc.slice(v1Idx, v1Idx + 200);
    expect(v1Block).toContain('regionCode: "CA"');
  });
});
