/**
 * onboarding-education-placeholder-sot.test.ts
 *
 * Tests that Onboarding.tsx Education step uses the shared getEducationPlaceholders
 * helper (single source of truth) instead of inline per-pack strings.
 *
 * Coverage:
 * A) Onboarding.tsx imports getEducationPlaceholders from shared/educationPlaceholders
 * B) No inline per-pack school placeholder strings remain in Onboarding.tsx
 * C) schoolPlaceholder is derived from getEducationPlaceholders(effectiveCountryPackId)
 * D) fieldPlaceholder is derived from the helper (eduFieldPlaceholder)
 * E) Shared helper values match expected per-pack strings (cross-check)
 * F) Profile.tsx and Onboarding.tsx both use the same helper (no drift)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { getEducationPlaceholders } from "../shared/educationPlaceholders";

const onboardingSource = fs.readFileSync(
  path.join(__dirname, "../client/src/pages/Onboarding.tsx"),
  "utf-8"
);

const profileSource = fs.readFileSync(
  path.join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

describe("A) Onboarding.tsx imports getEducationPlaceholders", () => {
  it("A1: imports getEducationPlaceholders from @shared/educationPlaceholders", () => {
    expect(onboardingSource).toContain("getEducationPlaceholders");
    expect(onboardingSource).toContain("educationPlaceholders");
  });

  it("A2: import line is present", () => {
    expect(onboardingSource).toContain(
      "import { getEducationPlaceholders } from \"@shared/educationPlaceholders\""
    );
  });
});

describe("B) No inline per-pack school placeholder strings in Onboarding.tsx", () => {
  it("B1: 'University of Waterloo' is not a hardcoded string literal in Onboarding.tsx", () => {
    const lines = onboardingSource.split("\n");
    const hardcoded = lines.find(
      (line) =>
        line.includes("University of Waterloo") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
    );
    expect(hardcoded).toBeUndefined();
  });

  it("B2: 'University of California, Berkeley' is not hardcoded in Onboarding.tsx", () => {
    const lines = onboardingSource.split("\n");
    const hardcoded = lines.find(
      (line) =>
        line.includes("University of California, Berkeley") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
    );
    expect(hardcoded).toBeUndefined();
  });

  it("B3: 'University of the Philippines' is not hardcoded in Onboarding.tsx", () => {
    const lines = onboardingSource.split("\n");
    const hardcoded = lines.find(
      (line) =>
        line.includes("University of the Philippines") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
    );
    expect(hardcoded).toBeUndefined();
  });

  it("B4: 'Vietnam National University' is not hardcoded in Onboarding.tsx", () => {
    const lines = onboardingSource.split("\n");
    const hardcoded = lines.find(
      (line) =>
        line.includes("Vietnam National University") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
    );
    expect(hardcoded).toBeUndefined();
  });

  it("B5: no inline IIFE for schoolPlaceholder remains", () => {
    // The old IIFE pattern: const schoolPlaceholder = (() => { if (effectiveCountryPackId === "US")...
    expect(onboardingSource).not.toContain(
      "if (effectiveCountryPackId === \"US\") return \"e.g.,"
    );
  });
});

describe("C) schoolPlaceholder is derived from the shared helper", () => {
  it("C1: schoolPlaceholder is destructured from getEducationPlaceholders(effectiveCountryPackId)", () => {
    expect(onboardingSource).toContain(
      "getEducationPlaceholders(effectiveCountryPackId)"
    );
    expect(onboardingSource).toContain("schoolPlaceholder");
  });

  it("C2: the school Input uses {schoolPlaceholder}", () => {
    expect(onboardingSource).toContain("placeholder={schoolPlaceholder}");
  });
});

describe("D) fieldPlaceholder is derived from the helper (eduFieldPlaceholder)", () => {
  it("D1: eduFieldPlaceholder is destructured from getEducationPlaceholders", () => {
    expect(onboardingSource).toContain("eduFieldPlaceholder");
  });

  it("D2: the field Input uses {eduFieldPlaceholder}", () => {
    expect(onboardingSource).toContain("placeholder={eduFieldPlaceholder}");
  });

  it("D3: the generic field placeholder string is NOT hardcoded inline in Onboarding.tsx", () => {
    // It should come from the helper, not be a raw string in the JSX
    const lines = onboardingSource.split("\n");
    const hardcoded = lines.find(
      (line) =>
        line.includes("Computer Science / Business / Marketing") &&
        line.includes("placeholder=") &&
        !line.trim().startsWith("//")
    );
    expect(hardcoded).toBeUndefined();
  });
});

describe("E) Shared helper values match expected per-pack strings", () => {
  it("E1: CA → Waterloo", () => {
    expect(getEducationPlaceholders("CA").schoolPlaceholder).toBe(
      "e.g., University of Waterloo"
    );
  });

  it("E2: US → UC Berkeley", () => {
    expect(getEducationPlaceholders("US").schoolPlaceholder).toBe(
      "e.g., University of California, Berkeley"
    );
  });

  it("E3: PH → University of the Philippines", () => {
    expect(getEducationPlaceholders("PH").schoolPlaceholder).toBe(
      "e.g., University of the Philippines"
    );
  });

  it("E4: VN → Vietnam National University", () => {
    expect(getEducationPlaceholders("VN").schoolPlaceholder).toBe(
      "e.g., Vietnam National University"
    );
  });

  it("E5: GLOBAL → Your university", () => {
    expect(getEducationPlaceholders("GLOBAL").schoolPlaceholder).toBe(
      "e.g., Your university"
    );
  });
});

describe("F) Profile.tsx and Onboarding.tsx both use the same helper (no drift)", () => {
  it("F1: both files import from @shared/educationPlaceholders", () => {
    expect(onboardingSource).toContain("@shared/educationPlaceholders");
    expect(profileSource).toContain("@shared/educationPlaceholders");
  });

  it("F2: both files call getEducationPlaceholders", () => {
    expect(onboardingSource).toContain("getEducationPlaceholders(");
    expect(profileSource).toContain("getEducationPlaceholders(");
  });

  it("F3: Profile uses userCountryPackId, Onboarding uses effectiveCountryPackId", () => {
    expect(profileSource).toContain("getEducationPlaceholders(userCountryPackId)");
    expect(onboardingSource).toContain("getEducationPlaceholders(effectiveCountryPackId)");
  });
});
