/**
 * onboarding-workauth-gating.test.ts
 *
 * V2 Onboarding — Work Authorization step gating.
 *
 * Tests verify:
 *   A) showWorkAuthStep uses selectedCountryPackId (not effectiveRegionCode)
 *   B) GLOBAL pack: Work Auth step not shown, no "Work status in Canada" copy
 *   C) CA pack: Work Auth step shown with CA copy
 *   D) US pack: Work Auth step shown with US copy
 *   E) VN/PH packs: Work Auth step not shown
 *   F) handleComplete guard uses selectedCountryPackId
 *   G) workAuthStepCopy uses selectedCountryPackId
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const src = readFileSync(resolve(ROOT, "client/src/pages/Onboarding.tsx"), "utf-8");

// ─── A) showWorkAuthStep uses selectedCountryPackId ───────────────────────────
describe("A: showWorkAuthStep uses selectedCountryPackId directly", () => {
  it("A1: showWorkAuthStep is defined using selectedCountryPackId === CA || US", () => {
    expect(src).toContain(
      'const showWorkAuthStep = selectedCountryPackId === "CA" || selectedCountryPackId === "US"'
    );
  });

  it("A2: showWorkAuthStep does NOT use effectiveRegionCode", () => {
    const showWorkAuthLine = src
      .split("\n")
      .find((l) => l.includes("const showWorkAuthStep"));
    expect(showWorkAuthLine).toBeDefined();
    expect(showWorkAuthLine).not.toContain("effectiveRegionCode");
  });

  it("A3: GLOBAL is not included in showWorkAuthStep condition", () => {
    const showWorkAuthLine = src
      .split("\n")
      .find((l) => l.includes("const showWorkAuthStep"));
    expect(showWorkAuthLine).toBeDefined();
    expect(showWorkAuthLine).not.toContain("GLOBAL");
  });

  it("A4: VN is not included in showWorkAuthStep condition", () => {
    const showWorkAuthLine = src
      .split("\n")
      .find((l) => l.includes("const showWorkAuthStep"));
    expect(showWorkAuthLine).toBeDefined();
    expect(showWorkAuthLine).not.toContain('"VN"');
  });

  it("A5: PH is not included in showWorkAuthStep condition", () => {
    const showWorkAuthLine = src
      .split("\n")
      .find((l) => l.includes("const showWorkAuthStep"));
    expect(showWorkAuthLine).toBeDefined();
    expect(showWorkAuthLine).not.toContain('"PH"');
  });
});

// ─── B) GLOBAL: no Work Auth step ────────────────────────────────────────────
describe("B: GLOBAL pack — Work Auth step not shown", () => {
  it("B1: Work Auth step is gated behind showWorkAuthStep", () => {
    expect(src).toContain("step === 3 && showWorkAuthStep");
  });

  it("B2: 'Work status in Canada' copy exists in the file (for CA)", () => {
    expect(src).toContain("Work status in Canada");
  });

  it("B3: 'Work status in Canada' is inside the workAuthStepCopy object (not a standalone string)", () => {
    // The CA copy must be inside the workAuthStepCopy conditional block
    const copyBlock = src.slice(
      src.indexOf("const workAuthStepCopy"),
      src.indexOf("const workAuthStepCopy") + 400
    );
    expect(copyBlock).toContain("Work status in Canada");
  });

  it("B4: workAuthStepCopy uses selectedCountryPackId (not effectiveRegionCode)", () => {
    const copyLine = src
      .split("\n")
      .find((l) => l.includes("const workAuthStepCopy"));
    expect(copyLine).toBeDefined();
    expect(copyLine).not.toContain("effectiveRegionCode");
    expect(copyLine).toContain("selectedCountryPackId");
  });
});

// ─── C) CA pack: Work Auth step shown with CA copy ───────────────────────────
describe("C: CA pack — Work Auth step shown with CA copy", () => {
  it("C1: 'Work status in Canada' copy is present in the file", () => {
    expect(src).toContain("Work status in Canada");
  });

  it("C2: CA copy is in the else branch of workAuthStepCopy (not the US branch)", () => {
    const copyBlock = src.slice(
      src.indexOf("const workAuthStepCopy"),
      src.indexOf("const workAuthStepCopy") + 400
    );
    const usIdx = copyBlock.indexOf('"US"');
    const caIdx = copyBlock.indexOf("Work status in Canada");
    // CA copy appears after the US branch (in the else/fallback)
    expect(usIdx).toBeGreaterThan(-1);
    expect(caIdx).toBeGreaterThan(usIdx);
  });

  it("C3: Work Auth step renders at step === 3 when showWorkAuthStep is true", () => {
    expect(src).toContain("{step === 3 && showWorkAuthStep && (");
  });
});

// ─── D) US pack: Work Auth step shown with US copy ───────────────────────────
describe("D: US pack — Work Auth step shown with US copy", () => {
  it("D1: 'Work status in the United States' copy is present in the file", () => {
    expect(src).toContain("Work status in the United States");
  });

  it("D2: US copy is in the first branch of workAuthStepCopy (selectedCountryPackId === US)", () => {
    const copyBlock = src.slice(
      src.indexOf("const workAuthStepCopy"),
      src.indexOf("const workAuthStepCopy") + 400
    );
    const usCheckIdx = copyBlock.indexOf('"US"');
    const usCopyIdx = copyBlock.indexOf("Work status in the United States");
    expect(usCheckIdx).toBeGreaterThan(-1);
    expect(usCopyIdx).toBeGreaterThan(usCheckIdx);
  });

  it("D3: US sponsorship label is present", () => {
    expect(src).toContain("Will you now or in the future require employer sponsorship?");
  });
});

// ─── E) VN/PH packs: Work Auth step not shown ────────────────────────────────
describe("E: VN/PH packs — Work Auth step not shown", () => {
  it("E1: showWorkAuthStep only checks CA and US — VN/PH are excluded by omission", () => {
    const showWorkAuthLine = src
      .split("\n")
      .find((l) => l.includes("const showWorkAuthStep"));
    expect(showWorkAuthLine).toBeDefined();
    // Only CA and US should appear in the condition
    expect(showWorkAuthLine).toContain('"CA"');
    expect(showWorkAuthLine).toContain('"US"');
    expect(showWorkAuthLine).not.toContain('"VN"');
    expect(showWorkAuthLine).not.toContain('"PH"');
    expect(showWorkAuthLine).not.toContain('"GLOBAL"');
  });
});

// ─── F) handleComplete guard uses selectedCountryPackId ──────────────────────
describe("F: handleComplete work auth save guard uses selectedCountryPackId", () => {
  it("F1: handleComplete work auth guard uses selectedCountryPackId === CA || US", () => {
    const completeBlock = src.slice(
      src.indexOf("const handleComplete"),
      src.indexOf("const handleComplete") + 800
    );
    expect(completeBlock).toContain('selectedCountryPackId === "CA" || selectedCountryPackId === "US"');
  });

  it("F2: handleComplete work auth if-condition does NOT use effectiveRegionCode", () => {
    const completeBlock = src.slice(
      src.indexOf("const handleComplete"),
      src.indexOf("const handleComplete") + 800
    );
    // The comment may mention effectiveRegionCode for documentation, but the actual if() guard must not use it.
    // Find the if-guard line itself (starts with 'if (') after the comment block.
    const workAuthGuardIdx = completeBlock.indexOf("Only save work auth");
    // Skip past the comment lines to the actual if() statement
    const ifGuardIdx = completeBlock.indexOf("if ((", workAuthGuardIdx);
    const ifGuardLine = completeBlock.slice(ifGuardIdx, ifGuardIdx + 150);
    expect(ifGuardLine).not.toContain("effectiveRegionCode");
    expect(ifGuardLine).toContain('selectedCountryPackId === "CA"');
  });
});

// ─── G) Comment documents the GLOBAL fallback issue ──────────────────────────
describe("G: Code comment documents the effectiveRegionCode GLOBAL fallback issue", () => {
  it("G1: A comment near showWorkAuthStep explains why selectedCountryPackId is used", () => {
    const commentBlock = src.slice(
      src.indexOf("const showWorkAuthStep") - 300,
      src.indexOf("const showWorkAuthStep") + 10
    );
    expect(commentBlock).toContain("GLOBAL");
    expect(commentBlock).toContain("effectiveRegionCode");
  });
});
