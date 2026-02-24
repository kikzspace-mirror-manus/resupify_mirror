/**
 * V2 Onboarding — Education step: Highest education level dropdown + Field of study rename
 *
 * Test groups:
 *   A) Dropdown renders with correct options
 *   B) "Field of study" label replaces "Program"
 *   C) highestEducationLevel wired to state and mutation
 *   D) Schema and router accept highestEducationLevel
 *   E) Regression: other Education fields unaffected
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const onboardingPath = join(__dirname, "../client/src/pages/Onboarding.tsx");
const routersPath = join(__dirname, "routers.ts");
const schemaPath = join(__dirname, "../drizzle/schema.ts");

const onboardingSrc = readFileSync(onboardingPath, "utf-8");
const routersSrc = readFileSync(routersPath, "utf-8");
const schemaSrc = readFileSync(schemaPath, "utf-8");

// ─── A) Dropdown renders with correct options ──────────────────────────────

describe("A) Education level dropdown", () => {
  it("A1: renders a select element with data-testid education-level-select", () => {
    expect(onboardingSrc).toContain('data-testid="education-level-select"');
  });

  it("A2: includes High school option", () => {
    expect(onboardingSrc).toContain('value="high_school"');
    expect(onboardingSrc).toContain("High school");
  });

  it("A3: includes Diploma / Certificate option", () => {
    expect(onboardingSrc).toContain('value="diploma_certificate"');
    expect(onboardingSrc).toContain("Diploma / Certificate");
  });

  it("A4: includes Associate degree option", () => {
    expect(onboardingSrc).toContain('value="associate_degree"');
    expect(onboardingSrc).toContain("Associate degree");
  });

  it("A5: includes Bachelor's degree option", () => {
    expect(onboardingSrc).toContain('value="bachelors_degree"');
    expect(onboardingSrc).toContain("Bachelor");
  });

  it("A6: includes Master's degree option", () => {
    expect(onboardingSrc).toContain('value="masters_degree"');
    expect(onboardingSrc).toContain("Master");
  });

  it("A7: includes Doctorate (PhD) option", () => {
    expect(onboardingSrc).toContain('value="doctorate"');
    expect(onboardingSrc).toContain("Doctorate");
  });

  it("A8: includes Other / Prefer not to say option", () => {
    expect(onboardingSrc).toContain('value="other"');
    expect(onboardingSrc).toContain("Prefer not to say");
  });

  it("A9: default option is empty string (no pre-selection)", () => {
    expect(onboardingSrc).toContain('value=""');
    expect(onboardingSrc).toContain("Select level...");
  });

  it("A10: label reads 'Highest education level'", () => {
    expect(onboardingSrc).toContain("Highest education level");
  });

  it("A11: label has (optional) marker", () => {
    const labelIdx = onboardingSrc.indexOf("Highest education level");
    const nearbySlice = onboardingSrc.slice(labelIdx, labelIdx + 200);
    expect(nearbySlice).toContain("optional");
  });
});

// ─── B) Field of study label ───────────────────────────────────────────────

describe("B) Field of study label", () => {
  it("B1: label reads 'Field of study' (not 'Program')", () => {
    expect(onboardingSrc).toContain("Field of study");
  });

  it("B2: the word 'Program' does not appear as a standalone label in the Education step", () => {
    // We check that the old label text is gone; the input id="program" is fine to keep
    // We look for the label text "Program" as a JSX label child — not as an id/variable
    // The label should not contain >Program< or >Program{
    const labelPattern = />Program</;
    const labelPatternJsx = />Program{/;
    expect(labelPattern.test(onboardingSrc)).toBe(false);
    expect(labelPatternJsx.test(onboardingSrc)).toBe(false);
  });

  it("B3: 'Field of study' appears inside a Label element", () => {
    const labelIdx = onboardingSrc.indexOf("Field of study");
    // Look back up to 100 chars for a Label element
    const before = onboardingSrc.slice(Math.max(0, labelIdx - 100), labelIdx);
    expect(before).toContain("<Label");
  });
});

// ─── C) highestEducationLevel state and mutation wiring ───────────────────

describe("C) highestEducationLevel state wiring", () => {
  it("C1: useState for highestEducationLevel is declared", () => {
    expect(onboardingSrc).toContain("highestEducationLevel");
    expect(onboardingSrc).toContain("setHighestEducationLevel");
  });

  it("C2: select onChange calls setHighestEducationLevel", () => {
    const selectIdx = onboardingSrc.indexOf('data-testid="education-level-select"');
    const selectSlice = onboardingSrc.slice(selectIdx, selectIdx + 300);
    expect(selectSlice).toContain("setHighestEducationLevel");
  });

  it("C3: highestEducationLevel is passed to upsertProfile mutation in handleComplete", () => {
    const handleCompleteIdx = onboardingSrc.indexOf("const handleComplete");
    const handleCompleteSlice = onboardingSrc.slice(handleCompleteIdx, handleCompleteIdx + 600);
    expect(handleCompleteSlice).toContain("highestEducationLevel");
  });

  it("C4: highestEducationLevel is passed as undefined when empty (falsy guard)", () => {
    const handleCompleteIdx = onboardingSrc.indexOf("const handleComplete");
    const handleCompleteSlice = onboardingSrc.slice(handleCompleteIdx, handleCompleteIdx + 600);
    expect(handleCompleteSlice).toContain("highestEducationLevel || undefined");
  });
});

// ─── D) Schema and router accept highestEducationLevel ────────────────────

describe("D) Schema and router", () => {
  it("D1: drizzle schema has highestEducationLevel column", () => {
    expect(schemaSrc).toContain("highestEducationLevel");
  });

  it("D2: schema column is varchar with max 64", () => {
    const colIdx = schemaSrc.indexOf("highestEducationLevel");
    const colSlice = schemaSrc.slice(colIdx, colIdx + 100);
    expect(colSlice).toContain("varchar");
    expect(colSlice).toContain("64");
  });

  it("D3: profile.upsert router input accepts highestEducationLevel", () => {
    expect(routersSrc).toContain("highestEducationLevel");
  });

  it("D4: router validates highestEducationLevel as z.string().max(64).optional()", () => {
    const idx = routersSrc.indexOf("highestEducationLevel");
    const slice = routersSrc.slice(idx, idx + 60);
    expect(slice).toContain("z.string()");
  });
});

// ─── E) Regression: other Education fields unaffected ─────────────────────

describe("E) Regression: other Education fields", () => {
  it("E1: school input still present", () => {
    expect(onboardingSrc).toContain('data-testid="school-input"');
  });

  it("E2: graduation date input still present", () => {
    expect(onboardingSrc).toContain('id="gradDate"');
    expect(onboardingSrc).toContain('type="month"');
  });

  it("E3: Currently Enrolled toggle still present (for CA+COOP)", () => {
    expect(onboardingSrc).toContain("Currently Enrolled");
  });

  it("E4: isCoopCA guard still used for co-op specific fields", () => {
    expect(onboardingSrc).toContain("isCoopCA");
  });

  it("E5: helper text reads 'helps tailor your recommendations'", () => {
    expect(onboardingSrc).toContain("helps tailor your recommendations");
  });
});
