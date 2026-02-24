/**
 * profile-education-placeholders.test.ts
 *
 * Tests for the pack-aware education placeholder helper and its use in Profile.tsx.
 *
 * Coverage:
 * A) getEducationPlaceholders returns correct school placeholder per pack
 * B) field placeholder is always generic (not market-specific)
 * C) Profile.tsx uses getEducationPlaceholders(userCountryPackId) for the school input
 * D) Fallback: null/undefined/unknown packId → GLOBAL placeholder
 * E) Regression: Profile.tsx no longer hardcodes "University of Waterloo"
 */

import { describe, it, expect } from "vitest";
import { getEducationPlaceholders } from "../shared/educationPlaceholders";
import * as fs from "fs";
import * as path from "path";

const profileSource = fs.readFileSync(
  path.join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

const FIELD_PLACEHOLDER = "e.g., Computer Science / Business / Marketing";

describe("A) getEducationPlaceholders — school placeholder per pack", () => {
  it("A1: CA → University of Waterloo", () => {
    const { schoolPlaceholder } = getEducationPlaceholders("CA");
    expect(schoolPlaceholder).toBe("e.g., University of Waterloo");
  });

  it("A2: US → University of California, Berkeley", () => {
    const { schoolPlaceholder } = getEducationPlaceholders("US");
    expect(schoolPlaceholder).toBe("e.g., University of California, Berkeley");
  });

  it("A3: PH → University of the Philippines", () => {
    const { schoolPlaceholder } = getEducationPlaceholders("PH");
    expect(schoolPlaceholder).toBe("e.g., University of the Philippines");
  });

  it("A4: VN → Vietnam National University", () => {
    const { schoolPlaceholder } = getEducationPlaceholders("VN");
    expect(schoolPlaceholder).toBe("e.g., Vietnam National University");
  });

  it("A5: GLOBAL → Your university", () => {
    const { schoolPlaceholder } = getEducationPlaceholders("GLOBAL");
    expect(schoolPlaceholder).toBe("e.g., Your university");
  });
});

describe("B) getEducationPlaceholders — field placeholder is always generic", () => {
  const packs = ["CA", "US", "PH", "VN", "GLOBAL"] as const;

  packs.forEach((pack) => {
    it(`B) ${pack} field placeholder is generic`, () => {
      const { fieldPlaceholder } = getEducationPlaceholders(pack);
      expect(fieldPlaceholder).toBe(FIELD_PLACEHOLDER);
    });
  });
});

describe("D) Fallback: null/undefined/unknown → GLOBAL placeholder", () => {
  it("D1: null → GLOBAL school placeholder", () => {
    const { schoolPlaceholder } = getEducationPlaceholders(null);
    expect(schoolPlaceholder).toBe("e.g., Your university");
  });

  it("D2: undefined → GLOBAL school placeholder", () => {
    const { schoolPlaceholder } = getEducationPlaceholders(undefined);
    expect(schoolPlaceholder).toBe("e.g., Your university");
  });

  it("D3: unknown string → GLOBAL school placeholder", () => {
    const { schoolPlaceholder } = getEducationPlaceholders("UNKNOWN_PACK");
    expect(schoolPlaceholder).toBe("e.g., Your university");
  });
});

describe("C) Profile.tsx uses getEducationPlaceholders for school input", () => {
  it("C1: Profile.tsx imports getEducationPlaceholders from shared/educationPlaceholders", () => {
    expect(profileSource).toContain("getEducationPlaceholders");
    expect(profileSource).toContain("educationPlaceholders");
  });

  it("C2: school Input uses getEducationPlaceholders(userCountryPackId).schoolPlaceholder", () => {
    expect(profileSource).toContain(
      "placeholder={getEducationPlaceholders(userCountryPackId).schoolPlaceholder}"
    );
  });

  it("C3: field of study Input still uses the generic placeholder", () => {
    expect(profileSource).toContain(FIELD_PLACEHOLDER);
  });
});

describe("E) Regression: Profile.tsx no longer hardcodes CA placeholder", () => {
  it("E1: 'University of Waterloo' is not hardcoded as a string literal in Profile.tsx", () => {
    // The placeholder must come from getEducationPlaceholders, not be hardcoded
    // It's OK if it appears inside the shared helper, but not as a raw string in Profile.tsx
    const profileLines = profileSource.split("\n");
    const hardcodedLine = profileLines.find(
      (line) =>
        line.includes("University of Waterloo") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
    );
    expect(hardcodedLine).toBeUndefined();
  });

  it("E2: shared/educationPlaceholders.ts contains all 5 pack placeholders", () => {
    const helperSource = fs.readFileSync(
      path.join(__dirname, "../shared/educationPlaceholders.ts"),
      "utf-8"
    );
    expect(helperSource).toContain("University of Waterloo");
    expect(helperSource).toContain("University of California, Berkeley");
    expect(helperSource).toContain("University of the Philippines");
    expect(helperSource).toContain("Vietnam National University");
    expect(helperSource).toContain("Your university");
  });

  it("E3: getEducationPlaceholders is a named export from shared/educationPlaceholders.ts", () => {
    const helperSource = fs.readFileSync(
      path.join(__dirname, "../shared/educationPlaceholders.ts"),
      "utf-8"
    );
    expect(helperSource).toContain("export function getEducationPlaceholders");
  });
});

describe("F) Completeness: helper covers all known CountryPackIds", () => {
  const allPacks = ["CA", "US", "PH", "VN", "GLOBAL"] as const;

  it("F1: all 5 packs return a non-empty schoolPlaceholder", () => {
    for (const pack of allPacks) {
      const { schoolPlaceholder } = getEducationPlaceholders(pack);
      expect(schoolPlaceholder.length).toBeGreaterThan(0);
      expect(schoolPlaceholder).toContain("e.g.,");
    }
  });

  it("F2: all 5 packs return the same generic fieldPlaceholder", () => {
    const placeholders = allPacks.map((p) => getEducationPlaceholders(p).fieldPlaceholder);
    const unique = new Set(placeholders);
    expect(unique.size).toBe(1);
  });

  it("F3: CA and US placeholders are different (no CA leak into US)", () => {
    const ca = getEducationPlaceholders("CA").schoolPlaceholder;
    const us = getEducationPlaceholders("US").schoolPlaceholder;
    expect(ca).not.toBe(us);
    expect(us).not.toContain("Waterloo");
  });

  it("F4: VN and PH placeholders are different (no cross-market leak)", () => {
    const vn = getEducationPlaceholders("VN").schoolPlaceholder;
    const ph = getEducationPlaceholders("PH").schoolPlaceholder;
    expect(vn).not.toBe(ph);
  });
});
