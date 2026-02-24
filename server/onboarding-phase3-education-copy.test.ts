/**
 * onboarding-phase3-education-copy.test.ts
 *
 * V2 Onboarding Phase 3 — Education step: neutral helper copy + pack-aware placeholders
 *
 * Tests:
 *   A) Helper copy updated (old jargon absent, new copy present)
 *   B) School placeholder is pack-aware (CA/US/PH/VN/GLOBAL)
 *   C) Program placeholder is generic
 *   D) schoolPlaceholder logic is correct for each pack
 *   E) Regression — student-track helper text, school-input testid, field labels unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { getEducationPlaceholders } from "../shared/educationPlaceholders";
import { resolve } from "path";

const ONBOARDING_PATH = resolve(__dirname, "../client/src/pages/Onboarding.tsx");
const content = readFileSync(ONBOARDING_PATH, "utf-8");

// ── A: Helper copy ─────────────────────────────────────────────────────────

describe("A — Education step helper copy updated", () => {
  it("A1) New non-technical helper text is present", () => {
    // Source file uses \\u2014 escape sequence for the em-dash
    expect(content).toContain("Optional \\u2014 helps tailor your recommendations.");
  });

  it("A2) Old jargon-heavy helper text is NOT present", () => {
    expect(content).not.toContain("Optional — helps with eligibility checks.");
  });

  it("A3) Student-track helper text is unchanged", () => {
    expect(content).toContain("Co-op employers verify enrollment status.");
  });

  it("A4) New helper text does not mention 'eligibility'", () => {
    // Extract the Education step CardDescription block
    const step2Start = content.indexOf("Step 2: Education");
    const cardDescStart = content.indexOf("<CardDescription>", step2Start);
    const cardDescEnd = content.indexOf("</CardDescription>", cardDescStart);
    const descBlock = content.slice(cardDescStart, cardDescEnd);
    expect(descBlock).not.toContain("eligibility");
  });
});

// ── B: School placeholder is pack-aware ────────────────────────────────────

describe("B — School placeholder is pack-aware", () => {
  it("B1) CA placeholder 'e.g., University of Waterloo' is present via shared helper", () => {
    // Placeholder strings now live in shared/educationPlaceholders.ts, not inline
    expect(getEducationPlaceholders("CA").schoolPlaceholder).toBe("e.g., University of Waterloo");
  });

  it("B2) US placeholder 'e.g., University of California, Berkeley' is present via shared helper", () => {
    expect(getEducationPlaceholders("US").schoolPlaceholder).toBe("e.g., University of California, Berkeley");
  });

  it("B3) PH placeholder 'e.g., University of the Philippines' is present via shared helper", () => {
    expect(getEducationPlaceholders("PH").schoolPlaceholder).toBe("e.g., University of the Philippines");
  });

  it("B4) VN placeholder 'e.g., Vietnam National University' is present via shared helper", () => {
    expect(getEducationPlaceholders("VN").schoolPlaceholder).toBe("e.g., Vietnam National University");
  });

  it("B5) GLOBAL fallback placeholder 'e.g., Your university' is present via shared helper", () => {
    expect(getEducationPlaceholders("GLOBAL").schoolPlaceholder).toBe("e.g., Your university");
  });

  it("B6) schoolPlaceholder variable is defined and used in the Input", () => {
    // schoolPlaceholder is now destructured from getEducationPlaceholders(effectiveCountryPackId)
    expect(content).toContain("schoolPlaceholder");
    expect(content).toContain("placeholder={schoolPlaceholder}");
  });

  it("B7) schoolPlaceholder uses effectiveCountryPackId via shared helper", () => {
    expect(content).toContain("getEducationPlaceholders(effectiveCountryPackId)");
  });

  it("B8) schoolPlaceholder comes from shared helper, not an inline IIFE", () => {
    // The old IIFE pattern is replaced by the shared helper
    expect(content).not.toContain("const schoolPlaceholder = (() => {");
    expect(content).toContain("getEducationPlaceholders");
  });
});

// ── C: Program placeholder is generic ─────────────────────────────────────

describe("C — Program placeholder is generic", () => {
  it("C1) Program placeholder comes from shared helper (eduFieldPlaceholder)", () => {
    // The field placeholder is now supplied by getEducationPlaceholders via eduFieldPlaceholder
    expect(content).toContain("eduFieldPlaceholder");
    expect(content).toContain("placeholder={eduFieldPlaceholder}");
  });

  it("C2) Shared helper fieldPlaceholder contains multiple disciplines", () => {
    // Verify the helper returns the expected generic multi-discipline string
    expect(getEducationPlaceholders("CA").fieldPlaceholder).toContain("Computer Science");
    expect(getEducationPlaceholders("US").fieldPlaceholder).toContain("Computer Science");
    expect(getEducationPlaceholders("GLOBAL").fieldPlaceholder).toContain("Computer Science");
  });
});

// ── D: schoolPlaceholder logic correctness ─────────────────────────────────

describe("D — schoolPlaceholder logic returns correct value per pack", () => {
  // Extract and evaluate the schoolPlaceholder logic by reading the source
  // We test the source structure rather than executing it (no DOM/React available)

  it("D1) US branch returns Berkeley placeholder (via shared helper)", () => {
    expect(getEducationPlaceholders("US").schoolPlaceholder).toContain("Berkeley");
  });

  it("D2) PH branch returns Philippines placeholder (via shared helper)", () => {
    expect(getEducationPlaceholders("PH").schoolPlaceholder).toContain("Philippines");
  });

  it("D3) VN branch returns Vietnam National University placeholder (via shared helper)", () => {
    expect(getEducationPlaceholders("VN").schoolPlaceholder).toContain("Vietnam");
  });

  it("D4) GLOBAL fallback returns 'Your university' (via shared helper)", () => {
    // Verified via the shared helper import at the top of this file
    // (D1-D3 use require() which fails in ESM; use the top-level import instead)
    expect(getEducationPlaceholders("GLOBAL").schoolPlaceholder).toContain("Your university");
  });

  it("D5) All 5 pack branches are present via shared helper (US, PH, VN, CA, GLOBAL)", () => {
    expect(getEducationPlaceholders("US").schoolPlaceholder).toContain("Berkeley");
    expect(getEducationPlaceholders("PH").schoolPlaceholder).toContain("Philippines");
    expect(getEducationPlaceholders("VN").schoolPlaceholder).toContain("Vietnam");
    expect(getEducationPlaceholders("CA").schoolPlaceholder).toContain("Waterloo");
    expect(getEducationPlaceholders("GLOBAL").schoolPlaceholder).toContain("Your university");
  });
});

// ── E: Regression ─────────────────────────────────────────────────────────

describe("E — Regression: Education step structure unchanged", () => {
  it("E1) 'Your education' title still present", () => {
    expect(content).toContain("Your education");
  });

  it("E2) school-input testid present on the school Input", () => {
    expect(content).toContain('data-testid="school-input"');
  });

  it("E3) 'School / Institution' label still present", () => {
    expect(content).toContain("School / Institution");
  });

  it("E4) 'Field of study' label present (renamed from Program)", () => {
    expect(content).toContain("Field of study");
  });

  it("E5) 'Currently Enrolled' switch still present", () => {
    expect(content).toContain("Currently Enrolled");
  });

  it("E6) Education step is at step === 2", () => {
    expect(content).toContain("step === 2");
  });

  it("E7) School field still wired to setSchool", () => {
    expect(content).toContain("onChange={(e) => setSchool(e.target.value)}");
  });

  it("E8) Program field still wired to setProgram", () => {
    expect(content).toContain("onChange={(e) => setProgram(e.target.value)}");
  });

  it("E9) schoolPlaceholder is derived from shared helper and used in JSX", () => {
    // schoolPlaceholder is now destructured from getEducationPlaceholders(effectiveCountryPackId)
    const defIdx = content.indexOf("const { schoolPlaceholder");
    const useIdx = content.indexOf("placeholder={schoolPlaceholder}");
    expect(defIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(-1);
    expect(defIdx).toBeLessThan(useIdx);
  });
});
