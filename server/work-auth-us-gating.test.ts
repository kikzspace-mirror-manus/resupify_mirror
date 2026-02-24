/**
 * work-auth-us-gating.test.ts
 *
 * Tests for Work Authorization card/step CA+US gating and US copy variant.
 *
 * Coverage:
 * - Profile.tsx: showWorkAuthCard = CA || US (not VN/PH/GLOBAL)
 * - Profile.tsx: US copy variant labels (United States, "now or in the future require employer sponsorship")
 * - Profile.tsx: CA copy unchanged (regression)
 * - Onboarding.tsx: showWorkAuthStep = CA || US (not VN/PH/GLOBAL)
 * - Onboarding.tsx: US copy variant labels
 * - Onboarding.tsx: CA copy unchanged (regression)
 * - No schema changes (stored values/fields identical)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const profileSource = readFileSync(
  join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);
const onboardingSource = readFileSync(
  join(__dirname, "../client/src/pages/Onboarding.tsx"),
  "utf-8"
);

// ─── Profile.tsx: gating ──────────────────────────────────────────────────────

describe("Work Auth — Profile.tsx gating", () => {
  it("G1: showWorkAuthCard includes CA", () => {
    expect(profileSource).toContain('userCountryPackId === "CA"');
  });

  it("G2: showWorkAuthCard includes US", () => {
    expect(profileSource).toContain('userCountryPackId === "US"');
  });

  it("G3: showWorkAuthCard uses OR (CA || US)", () => {
    // The gating line must combine CA and US with ||
    const gatingLine = profileSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthCard") && l.includes("=") && !l.includes("&&"));
    expect(gatingLine).toBeDefined();
    expect(gatingLine).toContain("||");
    expect(gatingLine).toContain('"CA"');
    expect(gatingLine).toContain('"US"');
  });

  it("G4: showWorkAuthCard does NOT include VN", () => {
    // The gating line must not include VN
    const gatingLine = profileSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthCard") && l.includes("=") && !l.includes("&&"));
    expect(gatingLine).not.toContain('"VN"');
  });

  it("G5: showWorkAuthCard does NOT include PH", () => {
    const gatingLine = profileSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthCard") && l.includes("=") && !l.includes("&&"));
    expect(gatingLine).not.toContain('"PH"');
  });

  it("G6: showWorkAuthCard does NOT include GLOBAL", () => {
    const gatingLine = profileSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthCard") && l.includes("=") && !l.includes("&&"));
    expect(gatingLine).not.toContain('"GLOBAL"');
  });
});

// ─── Profile.tsx: US copy variant ────────────────────────────────────────────

describe("Work Auth — Profile.tsx US copy variant", () => {
  it("C1: US copy includes 'Work status in the United States'", () => {
    expect(profileSource).toContain("Work status in the United States");
  });

  it("C2: US copy includes 'now or in the future require employer sponsorship'", () => {
    expect(profileSource).toContain("now or in the future require employer sponsorship");
  });

  it("C3: US copy includes 'e.g., United States' placeholder", () => {
    expect(profileSource).toContain("e.g., United States");
  });

  it("C4: US copy includes 'authorized to work in the US' in note text", () => {
    expect(profileSource).toContain("authorized to work in the US");
  });

  it("C5: workAuthCopy variable is defined based on userCountryPackId === US", () => {
    expect(profileSource).toContain('userCountryPackId === "US"');
    expect(profileSource).toContain("workAuthCopy");
  });
});

// ─── Profile.tsx: CA copy regression ─────────────────────────────────────────

describe("Work Auth — Profile.tsx CA copy regression", () => {
  it("R1: CA copy still includes 'Work Status' label", () => {
    expect(profileSource).toContain("Work Status");
  });

  it("R2: CA copy still includes 'Will you need employer sponsorship?' label", () => {
    expect(profileSource).toContain("Will you need employer sponsorship?");
  });

  it("R3: CA copy still includes 'e.g., Canada' placeholder", () => {
    expect(profileSource).toContain("e.g., Canada");
  });

  it("R4: CA copy note still includes 'must be Citizen/PR'", () => {
    expect(profileSource).toContain("must be Citizen/PR");
  });

  it("R5: Work Authorization card title unchanged", () => {
    expect(profileSource).toContain("Work Authorization");
  });
});

// ─── Profile.tsx: stored values unchanged ────────────────────────────────────

describe("Work Auth — Profile.tsx stored values unchanged", () => {
  it("S1: citizen_pr option still present", () => {
    expect(profileSource).toContain("citizen_pr");
  });

  it("S2: temporary_resident option still present", () => {
    expect(profileSource).toContain("temporary_resident");
  });

  it("S3: needsSponsorship field still present", () => {
    expect(profileSource).toContain("needsSponsorship");
  });

  it("S4: workStatus field still present", () => {
    expect(profileSource).toContain("workStatus");
  });
});

// ─── Onboarding.tsx: gating ───────────────────────────────────────────────────

describe("Work Auth — Onboarding.tsx gating", () => {
  it("O1: showWorkAuthStep includes CA", () => {
    const gatingLine = onboardingSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthStep") && l.includes("=") && !l.includes("&&") && !l.includes("?"));
    expect(gatingLine).toBeDefined();
    expect(gatingLine).toContain('"CA"');
  });

  it("O2: showWorkAuthStep includes US", () => {
    const gatingLine = onboardingSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthStep") && l.includes("=") && !l.includes("&&") && !l.includes("?"));
    expect(gatingLine).toBeDefined();
    expect(gatingLine).toContain('"US"');
  });

  it("O3: showWorkAuthStep uses OR (CA || US)", () => {
    const gatingLine = onboardingSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthStep") && l.includes("=") && !l.includes("&&") && !l.includes("?"));
    expect(gatingLine).toContain("||");
  });

  it("O4: showWorkAuthStep does NOT include VN", () => {
    const gatingLine = onboardingSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthStep") && l.includes("=") && !l.includes("&&") && !l.includes("?"));
    expect(gatingLine).not.toContain('"VN"');
  });

  it("O5: showWorkAuthStep does NOT include PH", () => {
    const gatingLine = onboardingSource
      .split("\n")
      .find((l) => l.includes("showWorkAuthStep") && l.includes("=") && !l.includes("&&") && !l.includes("?"));
    expect(gatingLine).not.toContain('"PH"');
  });
});

// ─── Onboarding.tsx: US copy variant ─────────────────────────────────────────

describe("Work Auth — Onboarding.tsx US copy variant", () => {
  it("O6: Onboarding US copy includes 'Work status in the United States'", () => {
    expect(onboardingSource).toContain("Work status in the United States");
  });

  it("O7: Onboarding US copy includes 'now or in the future require employer sponsorship'", () => {
    expect(onboardingSource).toContain("now or in the future require employer sponsorship");
  });

  it("O8: workAuthStepCopy variable is defined based on effectiveRegionCode === US", () => {
    expect(onboardingSource).toContain('effectiveRegionCode === "US"');
    expect(onboardingSource).toContain("workAuthStepCopy");
  });
});

// ─── Onboarding.tsx: CA copy regression ──────────────────────────────────────

describe("Work Auth — Onboarding.tsx CA copy regression", () => {
  it("O9: Onboarding CA copy still includes 'Work status in Canada'", () => {
    expect(onboardingSource).toContain("Work status in Canada");
  });

  it("O10: Onboarding CA copy still includes 'Sponsorship needed?'", () => {
    expect(onboardingSource).toContain("Sponsorship needed?");
  });

  it("O11: Onboarding work auth step title unchanged", () => {
    expect(onboardingSource).toContain("Work authorization");
  });
});

// ─── Onboarding.tsx: updateWorkStatus save logic ─────────────────────────────

describe("Work Auth — Onboarding.tsx save logic extended to US", () => {
  it("O12: updateWorkStatus save block includes US condition", () => {
    // The save block must fire for CA or US
    const saveBlock = onboardingSource.slice(
      onboardingSource.indexOf("updateWorkStatus.mutateAsync"),
      onboardingSource.indexOf("updateWorkStatus.mutateAsync") + 200
    );
    // Look upstream for the if condition
    const saveArea = onboardingSource.slice(
      onboardingSource.indexOf("Only save work auth"),
      onboardingSource.indexOf("Only save work auth") + 300
    );
    expect(saveArea).toContain('"US"');
    expect(saveArea).toContain('"CA"');
  });
});
