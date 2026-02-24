/**
 * profile-education-sync.test.ts
 *
 * Tests for V2 Profile Education card sync with Onboarding:
 *   A) Highest education level dropdown renders with all 7 options
 *   B) "Field of study" label replaces "Program"
 *   C) isCoopCA guard: CA+COOP shows Currently Enrolled; others do not
 *   D) highestEducationLevel wired to upsertProfile.mutate call
 *   E) CardDescription copy: isCoopCA shows co-op copy; others show neutral copy
 *   F) data-testids present for automation
 *   G) Regression: no "Required for co-op eligibility" outside isCoopCA block
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(
  join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

// ─── A) Highest education level dropdown ─────────────────────────────────────

describe("A: Profile Education — Highest education level dropdown", () => {
  it("A1: dropdown element with data-testid='profile-education-level-select' is present", () => {
    expect(src).toContain('data-testid="profile-education-level-select"');
  });

  it("A2: 'Highest education level' label is present", () => {
    expect(src).toContain("Highest education level");
  });

  it("A3: 'High school' option is present", () => {
    expect(src).toContain('"high_school"');
    expect(src).toContain(">High school<");
  });

  it("A4: 'Diploma / Certificate' option is present", () => {
    expect(src).toContain('"diploma_certificate"');
    expect(src).toContain(">Diploma / Certificate<");
  });

  it("A5: 'Associate degree' option is present", () => {
    expect(src).toContain('"associate_degree"');
    expect(src).toContain(">Associate degree<");
  });

  it("A6: \"Bachelor's degree\" option is present", () => {
    expect(src).toContain('"bachelors_degree"');
    expect(src).toContain("Bachelor's degree");
  });

  it("A7: \"Master's degree\" option is present", () => {
    expect(src).toContain('"masters_degree"');
    expect(src).toContain("Master's degree");
  });

  it("A8: 'Doctorate (PhD)' option is present", () => {
    expect(src).toContain('"doctorate"');
    expect(src).toContain(">Doctorate (PhD)<");
  });

  it("A9: 'Other / Prefer not to say' option is present", () => {
    expect(src).toContain('"other"');
    expect(src).toContain(">Other / Prefer not to say<");
  });

  it("A10: 'Select level...' placeholder option is present", () => {
    expect(src).toContain(">Select level...<");
  });

  it("A11: highestEducationLevel state is declared", () => {
    expect(src).toContain("highestEducationLevel");
    expect(src).toContain("setHighestEducationLevel");
  });

  it("A12: highestEducationLevel is initialised from profile in useEffect", () => {
    expect(src).toContain("highestEducationLevel ?? \"\"");
  });
});

// ─── B) Field of study label ──────────────────────────────────────────────────

describe("B: Profile Education — Field of study label", () => {
  it("B1: 'Field of study' label is present in Education card", () => {
    expect(src).toContain("Field of study");
  });

  it("B2: 'Program' is no longer used as a standalone label in Education card", () => {
    // The word "program" may appear in comments or variable names but not as a user-visible label
    // We check that the exact label text ">Program<" is absent
    expect(src).not.toContain(">Program<");
  });

  it("B3: profile-field-of-study-input testid is present", () => {
    expect(src).toContain('data-testid="profile-field-of-study-input"');
  });

  it("B4: field of study placeholder matches onboarding", () => {
    expect(src).toContain("e.g., Computer Science / Business / Marketing");
  });
});

// ─── C) isCoopCA guard — Currently Enrolled ───────────────────────────────────

describe("C: Profile Education — isCoopCA guard for Currently Enrolled", () => {
  it("C1: isCoopCA is derived from userCountryPackId === 'CA' && trackCode === 'COOP'", () => {
    expect(src).toContain('userCountryPackId === "CA" && trackCode === "COOP"');
  });

  it("C2: Currently Enrolled row is inside an {isCoopCA && ...} conditional block", () => {
    // The enrolled row must be gated by isCoopCA
    const enrolledRowIdx = src.indexOf('data-testid="profile-currently-enrolled-row"');
    const isCoopCAIdx = src.lastIndexOf("isCoopCA &&", enrolledRowIdx);
    expect(enrolledRowIdx).toBeGreaterThan(-1);
    expect(isCoopCAIdx).toBeGreaterThan(-1);
    // isCoopCA guard must appear before the enrolled row
    expect(isCoopCAIdx).toBeLessThan(enrolledRowIdx);
  });

  it("C3: profile-currently-enrolled-row testid is present", () => {
    expect(src).toContain('data-testid="profile-currently-enrolled-row"');
  });

  it("C4: profile-currently-enrolled-switch testid is present", () => {
    expect(src).toContain('data-testid="profile-currently-enrolled-switch"');
  });

  it("C5: Currently Enrolled is NOT rendered unconditionally (no bare Switch outside isCoopCA block)", () => {
    // Count occurrences of the enrolled row testid — should be exactly 1 (inside isCoopCA block)
    const count = (src.match(/profile-currently-enrolled-row/g) ?? []).length;
    expect(count).toBe(1);
  });
});

// ─── D) highestEducationLevel wired to mutation ───────────────────────────────

describe("D: Profile Education — highestEducationLevel wired to upsertProfile.mutate", () => {
  it("D1: highestEducationLevel is included in upsertProfile.mutate call", () => {
    expect(src).toContain("highestEducationLevel: highestEducationLevel || undefined");
  });

  it("D2: currentlyEnrolled is conditionally passed (isCoopCA guard in mutate)", () => {
    // currentlyEnrolled should only be sent when isCoopCA
    expect(src).toContain("currentlyEnrolled: isCoopCA ? currentlyEnrolled : undefined");
  });

  it("D3: profile-save-education-btn testid is present", () => {
    expect(src).toContain('data-testid="profile-save-education-btn"');
  });
});

// ─── E) CardDescription copy ─────────────────────────────────────────────────

describe("E: Profile Education — CardDescription copy", () => {
  it("E1: co-op copy is shown when isCoopCA", () => {
    expect(src).toContain("Co-op employers verify enrollment status.");
  });

  it("E2: neutral copy is shown when not isCoopCA", () => {
    expect(src).toContain("Optional \u2014 helps tailor your recommendations.");
  });

  it("E3: CardDescription is conditional on isCoopCA", () => {
    // Both strings must appear in a ternary block
    const coopCopyIdx = src.indexOf("Co-op employers verify enrollment status.");
    const neutralCopyIdx = src.indexOf("Optional \u2014 helps tailor your recommendations.");
    // Both should be present
    expect(coopCopyIdx).toBeGreaterThan(-1);
    expect(neutralCopyIdx).toBeGreaterThan(-1);
    // The isCoopCA ternary must appear before both
    const ternaryIdx = src.indexOf("isCoopCA\n              ? \"Co-op employers");
    expect(ternaryIdx).toBeGreaterThan(-1);
  });
});

// ─── F) data-testids ─────────────────────────────────────────────────────────

describe("F: Profile Education — data-testids for automation", () => {
  it("F1: profile-education-card testid is present", () => {
    expect(src).toContain('data-testid="profile-education-card"');
  });

  it("F2: profile-school-input testid is present", () => {
    expect(src).toContain('data-testid="profile-school-input"');
  });
});

// ─── G) Regression: no bare "Required for co-op eligibility" outside guard ───

describe("G: Regression — co-op copy not shown outside isCoopCA block", () => {
  it("G1: 'Required for co-op eligibility' does not appear as a bare string (old copy removed)", () => {
    expect(src).not.toContain("Required for co-op eligibility");
  });

  it("G2: 'eligibility checks' does not appear as user-visible copy in Education card", () => {
    const nonCommentLines = src.split("\n").filter(
      (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")
    );
    const hasEligibilityChecks = nonCommentLines.some((l) =>
      l.includes("eligibility checks")
    );
    expect(hasEligibilityChecks).toBe(false);
  });

  it("G3: 'Graduation Date' label is still present (non-COOP path)", () => {
    expect(src).toContain("Graduation Date");
  });

  it("G4: 'Expected Graduation' label is present (COOP path)", () => {
    expect(src).toContain("Expected Graduation");
  });

  it("G5: isCoopCA is defined after the early return (no hooks-order violation)", () => {
    // isCoopCA must be defined after the loading early return
    const isCoopCAIdx = src.indexOf("const isCoopCA =");
    const earlyReturnIdx = src.indexOf("if (isLoading)");
    expect(isCoopCAIdx).toBeGreaterThan(earlyReturnIdx);
  });
});
