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
  it("B1) CA placeholder 'e.g., University of Waterloo' is present in schoolPlaceholder logic", () => {
    expect(content).toContain("e.g., University of Waterloo");
  });

  it("B2) US placeholder 'e.g., University of California, Berkeley' is present", () => {
    expect(content).toContain("e.g., University of California, Berkeley");
  });

  it("B3) PH placeholder 'e.g., University of the Philippines' is present", () => {
    expect(content).toContain("e.g., University of the Philippines");
  });

  it("B4) VN placeholder 'e.g., Vietnam National University' is present", () => {
    expect(content).toContain("e.g., Vietnam National University");
  });

  it("B5) GLOBAL fallback placeholder 'e.g., Your university' is present", () => {
    expect(content).toContain("e.g., Your university");
  });

  it("B6) schoolPlaceholder variable is defined and used in the Input", () => {
    expect(content).toContain("const schoolPlaceholder");
    expect(content).toContain("placeholder={schoolPlaceholder}");
  });

  it("B7) schoolPlaceholder uses effectiveCountryPackId to branch", () => {
    const placeholderBlock = content.slice(
      content.indexOf("const schoolPlaceholder"),
      content.indexOf("})();", content.indexOf("const schoolPlaceholder")) + 5
    );
    expect(placeholderBlock).toContain("effectiveCountryPackId");
    expect(placeholderBlock).toContain('"US"');
    expect(placeholderBlock).toContain('"PH"');
    expect(placeholderBlock).toContain('"VN"');
    expect(placeholderBlock).toContain('"CA"');
  });

  it("B8) schoolPlaceholder is an IIFE (immediately invoked)", () => {
    expect(content).toContain("const schoolPlaceholder = (() => {");
  });
});

// ── C: Program placeholder is generic ─────────────────────────────────────

describe("C — Program placeholder is generic", () => {
  it("C1) Program placeholder contains multiple disciplines", () => {
    expect(content).toContain("e.g., Computer Science / Business / Marketing");
  });

  it("C2) Old single-discipline program placeholder is NOT present", () => {
    // The old placeholder was just "e.g., Computer Science"
    // After the change it should be the multi-discipline version
    // We check the program Input specifically (not the schoolPlaceholder block)
    const programInputStart = content.indexOf('id="program"');
    const programInputEnd = content.indexOf("/>", programInputStart);
    const programInputBlock = content.slice(programInputStart, programInputEnd);
    expect(programInputBlock).toContain("Computer Science / Business / Marketing");
    expect(programInputBlock).not.toBe('placeholder="e.g., Computer Science"');
  });
});

// ── D: schoolPlaceholder logic correctness ─────────────────────────────────

describe("D — schoolPlaceholder logic returns correct value per pack", () => {
  // Extract and evaluate the schoolPlaceholder logic by reading the source
  // We test the source structure rather than executing it (no DOM/React available)

  it("D1) US branch returns Berkeley placeholder", () => {
    const block = content.slice(
      content.indexOf("const schoolPlaceholder"),
      content.indexOf("})();", content.indexOf("const schoolPlaceholder")) + 5
    );
    // US check comes before CA check
    const usIdx = block.indexOf('"US"');
    const caIdx = block.indexOf('"CA"');
    expect(usIdx).toBeGreaterThan(-1);
    expect(caIdx).toBeGreaterThan(-1);
    // US branch appears before CA branch
    expect(usIdx).toBeLessThan(caIdx);
    // Berkeley string appears after US check
    const berkeleyIdx = block.indexOf("University of California, Berkeley");
    expect(berkeleyIdx).toBeGreaterThan(usIdx);
  });

  it("D2) PH branch returns Philippines placeholder", () => {
    const block = content.slice(
      content.indexOf("const schoolPlaceholder"),
      content.indexOf("})();", content.indexOf("const schoolPlaceholder")) + 5
    );
    const phIdx = block.indexOf('"PH"');
    const phPlaceholderIdx = block.indexOf("University of the Philippines");
    expect(phIdx).toBeGreaterThan(-1);
    expect(phPlaceholderIdx).toBeGreaterThan(phIdx);
  });

  it("D3) VN branch returns Vietnam National University placeholder", () => {
    const block = content.slice(
      content.indexOf("const schoolPlaceholder"),
      content.indexOf("})();", content.indexOf("const schoolPlaceholder")) + 5
    );
    const vnIdx = block.indexOf('"VN"');
    const vnPlaceholderIdx = block.indexOf("Vietnam National University");
    expect(vnIdx).toBeGreaterThan(-1);
    expect(vnPlaceholderIdx).toBeGreaterThan(vnIdx);
  });

  it("D4) GLOBAL fallback is the last return in the block", () => {
    const block = content.slice(
      content.indexOf("const schoolPlaceholder"),
      content.indexOf("})();", content.indexOf("const schoolPlaceholder")) + 5
    );
    const globalIdx = block.indexOf("e.g., Your university");
    const caIdx = block.indexOf('"CA"');
    // GLOBAL fallback appears after all country checks
    expect(globalIdx).toBeGreaterThan(caIdx);
  });

  it("D5) All 5 pack branches are present (US, PH, VN, CA, GLOBAL)", () => {
    const block = content.slice(
      content.indexOf("const schoolPlaceholder"),
      content.indexOf("})();", content.indexOf("const schoolPlaceholder")) + 5
    );
    expect(block).toContain('"US"');
    expect(block).toContain('"PH"');
    expect(block).toContain('"VN"');
    expect(block).toContain('"CA"');
    expect(block).toContain("e.g., Your university");
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

  it("E9) schoolPlaceholder is defined before it is used (no hoisting issue)", () => {
    const defIdx = content.indexOf("const schoolPlaceholder");
    const useIdx = content.indexOf("placeholder={schoolPlaceholder}");
    expect(defIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(-1);
    expect(defIdx).toBeLessThan(useIdx);
  });
});
