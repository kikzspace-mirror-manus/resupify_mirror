/**
 * onboarding-education-pack-aware.test.ts
 *
 * V2 Onboarding — Education step: pack-aware co-op copy.
 *
 * Tests verify:
 *   A) isCoopCA guard replaces isStudentTrack
 *   B) CA + COOP: co-op copy and Currently Enrolled visible
 *   C) CA + non-COOP tracks: co-op copy and Currently Enrolled hidden
 *   D) VN / PH / US / GLOBAL (any track): co-op copy and Currently Enrolled hidden
 *   E) Neutral copy always present
 *   F) Structural: isCoopCA declared correctly
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const src = readFileSync(resolve(ROOT, "client/src/pages/Onboarding.tsx"), "utf-8");

// ─── A) isCoopCA guard ────────────────────────────────────────────────────────
describe("A: isCoopCA guard replaces isStudentTrack", () => {
  it("A1: isCoopCA is defined as selectedCountryPackId === 'CA' && trackCode === 'COOP'", () => {
    expect(src).toContain('selectedCountryPackId === "CA" && trackCode === "COOP"');
  });

  it("A2: isStudentTrack is no longer used anywhere in the file", () => {
    expect(src).not.toContain("isStudentTrack");
  });

  it("A3: isCoopCA is used to guard the Currently Enrolled toggle", () => {
    expect(src).toContain("{isCoopCA && (");
  });

  it("A4: isCoopCA is used to guard the co-op description text", () => {
    const descBlock = src.slice(
      src.indexOf("Co-op employers verify enrollment status.") - 30,
      src.indexOf("Co-op employers verify enrollment status.") + 60
    );
    expect(descBlock).toContain("isCoopCA");
  });

  it("A5: isCoopCA is used to guard 'Expected Graduation' label variant", () => {
    expect(src).toContain('isCoopCA ? "Expected Graduation" : "Graduation Date"');
  });
});

// ─── B) CA + COOP: co-op copy visible ────────────────────────────────────────
describe("B: CA + COOP — co-op copy and Currently Enrolled visible", () => {
  it("B1: 'Co-op employers verify enrollment status.' is in the JSX", () => {
    expect(src).toContain("Co-op employers verify enrollment status.");
  });

  it("B2: 'Required for co-op eligibility' note is in the JSX", () => {
    expect(src).toContain("Required for co-op eligibility");
  });

  it("B3: Currently Enrolled label is in the JSX", () => {
    expect(src).toContain("Currently Enrolled");
  });

  it("B4: Switch for currentlyEnrolled is inside the isCoopCA block", () => {
    const coopBlock = src.slice(
      src.indexOf("{isCoopCA && ("),
      src.indexOf("{isCoopCA && (") + 600
    );
    expect(coopBlock).toContain("currentlyEnrolled");
    expect(coopBlock).toContain("setCurrentlyEnrolled");
  });
});

// ─── C) CA + non-COOP: co-op copy hidden ─────────────────────────────────────
describe("C: CA + non-COOP — co-op copy and Currently Enrolled hidden", () => {
  it("C1: isCoopCA is false when trackCode !== COOP (structural: requires both conditions)", () => {
    // The guard requires BOTH CA and COOP — a CA user on NEW_GRAD gets isCoopCA=false
    expect(src).toContain('selectedCountryPackId === "CA" && trackCode === "COOP"');
  });

  it("C2: neutral helper 'Optional \u2014 helps tailor your recommendations.' is in the JSX", () => {
    // The source uses the \\u2014 escape sequence for the em-dash
    expect(src).toContain("Optional \\u2014 helps tailor your recommendations.");
  });
  it("C3: School label shows (optional) when not isCoopCA", () => {
    expect(src).toContain('!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>');
  });

  it("C4: Program label shows (optional) when not isCoopCA", () => {
    // Two occurrences: School and Program both use !isCoopCA
    const optionalCount = (src.match(/!isCoopCA && <span/g) || []).length;
    expect(optionalCount).toBeGreaterThanOrEqual(2);
  });

  it("C5: Graduation Date label used when not isCoopCA", () => {
    expect(src).toContain('"Graduation Date"');
  });
});

// ─── D) Non-CA packs: co-op copy hidden ──────────────────────────────────────
describe("D: VN / PH / US / GLOBAL — co-op copy and Currently Enrolled hidden", () => {
  it("D1: isCoopCA requires selectedCountryPackId === CA — VN/PH/US/GLOBAL can never satisfy it", () => {
    // The guard is a strict equality check on "CA"
    expect(src).toContain('selectedCountryPackId === "CA"');
    // And it must be combined with COOP
    expect(src).toContain('selectedCountryPackId === "CA" && trackCode === "COOP"');
  });

  it("D2: There is no standalone isStudentTrack or trackCode === COOP guard for co-op copy", () => {
    // Ensure we're not using a loose trackCode-only guard that would leak for non-CA
    expect(src).not.toContain("isStudentTrack");
    // The only COOP reference in the co-op guard must be inside isCoopCA
    const coopGuardLine = src.split("\n").find((l) => l.includes('selectedCountryPackId === "CA" && trackCode === "COOP"'));
    expect(coopGuardLine).toBeDefined();
  });

  it("D3: 'Co-op employers verify enrollment status.' is gated behind isCoopCA, not a standalone condition", () => {
    const coopTextIdx = src.indexOf("Co-op employers verify enrollment status.");
    const isCoopCAIdx = src.lastIndexOf("isCoopCA", coopTextIdx);
    // isCoopCA must appear within 100 chars before the co-op text
    expect(coopTextIdx - isCoopCAIdx).toBeLessThan(100);
  });

  it("D4: 'Required for co-op eligibility' is inside the isCoopCA block", () => {
    const coopBlock = src.slice(
      src.indexOf("{isCoopCA && ("),
      src.indexOf("{isCoopCA && (") + 500
    );
    expect(coopBlock).toContain("Required for co-op eligibility");
  });
});

// ─── E) Neutral copy always present ──────────────────────────────────────────
describe("E: Neutral copy always present", () => {
  it("E1: 'Your education' title is in the Education step", () => {
    expect(src).toContain("Your education");
  });

  it("E2: 'Optional \u2014 helps tailor your recommendations.' is the fallback description", () => {
    // The source uses the \\u2014 escape sequence for the em-dash
    expect(src).toContain("Optional \\u2014 helps tailor your recommendations.");
  });

  it("E3: school-input data-testid is still present", () => {
    expect(src).toContain('data-testid="school-input"');
  });

  it("E4: program input is still present", () => {
    // placeholder is now supplied via eduFieldPlaceholder from the shared helper
    expect(src).toContain("placeholder={eduFieldPlaceholder}");
  });
});

// ─── F) handleComplete still passes currentlyEnrolled only for COOP ──────────
describe("F: handleComplete currentlyEnrolled guard", () => {
  it("F1: currentlyEnrolled is only passed when trackCode === COOP in handleComplete", () => {
    // The upsertProfile call should pass currentlyEnrolled conditionally
    const completeBlock = src.slice(
      src.indexOf("const handleComplete"),
      src.indexOf("const handleComplete") + 600
    );
    expect(completeBlock).toContain('trackCode === "COOP"');
    expect(completeBlock).toContain("currentlyEnrolled");
  });
});
