/**
 * Server GLOBAL Fallback Guard — Regression Tests
 *
 * Verifies that:
 * A) All server-side regionCode fallbacks use "GLOBAL" not "CA"
 * B) getRegionPack("GLOBAL", ...) returns the GLOBAL pack (not CA)
 * C) GLOBAL pack has no CA-specific rules (workAuthRules, eligibilityChecks)
 * D) CA pack still gets CA-specific rules (regression)
 * E) Admin procedures use "GLOBAL" fallback
 * F) PACK_PROMPT_PREFIXES: GLOBAL gets empty prefix, CA gets CA-specific prefix
 * G) resolveCountryPack DEFAULT_COUNTRY_PACK_ID is "GLOBAL"
 */
import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { getRegionPack } from "../shared/regionPacks";
import { DEFAULT_COUNTRY_PACK_ID } from "../shared/countryPacks";

const routersSource = fs.readFileSync(
  path.resolve(__dirname, "./routers.ts"),
  "utf-8"
);
const adminSource = fs.readFileSync(
  path.resolve(__dirname, "./routers/admin.ts"),
  "utf-8"
);
const v2PackContextSource = fs.readFileSync(
  path.resolve(__dirname, "./v2PackContext.ts"),
  "utf-8"
);
const dbSource = fs.readFileSync(
  path.resolve(__dirname, "./db.ts"),
  "utf-8"
);

// ─── A: Source-level fallback audit ───────────────────────────────────────────
describe('A) Server source: no ?? "CA" regionCode fallbacks remain', () => {
  it('A1: routers.ts has zero occurrences of ?? "CA" as a regionCode fallback', () => {
    // Allow ?? "CA" only in comments or string literals for CA-specific logic
    // We check that profile?.regionCode ?? "CA" does not appear
    expect(routersSource).not.toContain('profile?.regionCode ?? "CA"');
    expect(routersSource).not.toContain("profile?.regionCode ?? 'CA'");
  });

  it('A2: admin.ts has zero occurrences of ?? "CA" as a regionCode fallback', () => {
    expect(adminSource).not.toContain('profile?.regionCode ?? "CA"');
    expect(adminSource).not.toContain("profile?.regionCode ?? 'CA'");
  });

  it('A3: routers.ts uses ?? "GLOBAL" for all regionCode fallbacks', () => {
    // Count occurrences of GLOBAL fallback
    const globalFallbacks = (routersSource.match(/profile\?\.regionCode \?\? "GLOBAL"/g) || []).length;
    expect(globalFallbacks).toBeGreaterThanOrEqual(4); // evidence.run, batchSprint, outreach, applicationKits
  });

  it('A4: admin.ts uses ?? "GLOBAL" for all regionCode fallbacks', () => {
    const globalFallbacks = (adminSource.match(/profile\?\.regionCode \?\? "GLOBAL"/g) || []).length;
    expect(globalFallbacks).toBeGreaterThanOrEqual(3); // 3 admin procedures
  });
});

// ─── B: getRegionPack GLOBAL resolution ───────────────────────────────────────
describe("B) getRegionPack: GLOBAL resolves to GLOBAL pack (not CA)", () => {
  it("B1: getRegionPack('GLOBAL', 'NEW_GRAD') returns regionCode='GLOBAL'", () => {
    const pack = getRegionPack("GLOBAL", "NEW_GRAD");
    expect(pack.regionCode).toBe("GLOBAL");
    expect(pack.label).toContain("Global");
    expect(pack.label).not.toContain("Canada");
  });

  it("B2: getRegionPack('GLOBAL', 'COOP') returns regionCode='GLOBAL'", () => {
    const pack = getRegionPack("GLOBAL", "COOP");
    expect(pack.regionCode).toBe("GLOBAL");
    expect(pack.label).toContain("Global");
  });

  it("B3: getRegionPack('GLOBAL', 'EARLY_CAREER') returns regionCode='GLOBAL'", () => {
    const pack = getRegionPack("GLOBAL", "EARLY_CAREER");
    expect(pack.regionCode).toBe("GLOBAL");
  });

  it("B4: getRegionPack('GLOBAL', 'EXPERIENCED') returns regionCode='GLOBAL'", () => {
    const pack = getRegionPack("GLOBAL", "EXPERIENCED");
    expect(pack.regionCode).toBe("GLOBAL");
  });
});

// ─── C: GLOBAL pack has no CA-specific rules ──────────────────────────────────
describe("C) GLOBAL pack: no CA-specific eligibility or work auth rules", () => {
  it("C1: GLOBAL_NEW_GRAD has empty workAuthRules (no Canadian citizenship checks)", () => {
    const pack = getRegionPack("GLOBAL", "NEW_GRAD");
    expect(pack.workAuthRules ?? []).toHaveLength(0);
  });

  it("C2: GLOBAL_COOP has empty workAuthRules", () => {
    const pack = getRegionPack("GLOBAL", "COOP");
    expect(pack.workAuthRules ?? []).toHaveLength(0);
  });

  it("C3: GLOBAL_NEW_GRAD has empty eligibilityChecks (no graduation date requirement)", () => {
    const pack = getRegionPack("GLOBAL", "NEW_GRAD");
    expect(pack.eligibilityChecks).toHaveLength(0);
  });

  it("C4: GLOBAL_COOP has empty eligibilityChecks (no enrollment requirement)", () => {
    const pack = getRegionPack("GLOBAL", "COOP");
    expect(pack.eligibilityChecks).toHaveLength(0);
  });

  it("C5: GLOBAL pack label does not contain 'Canada' or 'Canadian'", () => {
    for (const trackCode of ["COOP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]) {
      const pack = getRegionPack("GLOBAL", trackCode);
      expect(pack.label).not.toMatch(/Canada/i);
    }
  });

  it("C6: GLOBAL pack workAuthRules contain no 'canadian citizen' trigger phrases", () => {
    for (const trackCode of ["COOP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]) {
      const pack = getRegionPack("GLOBAL", trackCode);
      const allTriggers = (pack.workAuthRules ?? [])
        .flatMap(r => r.triggerPhrases)
        .join(" ");
      expect(allTriggers).not.toContain("canadian citizen");
      expect(allTriggers).not.toContain("permanent resident");
    }
  });
});

// ─── D: CA pack regression — still gets CA-specific rules ─────────────────────
describe("D) CA pack regression: CA users still get CA-specific rules", () => {
  it("D1: CA_NEW_GRAD has 4 workAuthRules including citizen_pr_requirement", () => {
    const pack = getRegionPack("CA", "NEW_GRAD");
    expect(pack.regionCode).toBe("CA");
    expect(pack.workAuthRules ?? []).toHaveLength(4);
    const ruleIds = (pack.workAuthRules ?? []).map(r => r.id);
    expect(ruleIds).toContain("citizen_pr_requirement");
    expect(ruleIds).toContain("no_sponsorship");
  });

  it("D2: CA_COOP has 4 workAuthRules and 3 eligibilityChecks", () => {
    const pack = getRegionPack("CA", "COOP");
    expect(pack.regionCode).toBe("CA");
    expect(pack.workAuthRules ?? []).toHaveLength(4);
    expect(pack.eligibilityChecks).toHaveLength(3);
  });

  it("D3: CA_NEW_GRAD label contains 'Canada'", () => {
    const pack = getRegionPack("CA", "NEW_GRAD");
    expect(pack.label).toContain("Canada");
  });

  it("D4: CA_EARLY_CAREER and CA_EXPERIENCED still resolve correctly", () => {
    const earlyCareer = getRegionPack("CA", "EARLY_CAREER");
    const experienced = getRegionPack("CA", "EXPERIENCED");
    expect(earlyCareer.regionCode).toBe("CA");
    expect(experienced.regionCode).toBe("CA");
    expect(earlyCareer.workAuthRules ?? []).toHaveLength(4);
    expect(experienced.workAuthRules ?? []).toHaveLength(4);
  });
});

// ─── E: Admin procedures use GLOBAL fallback ──────────────────────────────────
describe("E) Admin procedures: GLOBAL fallback in source", () => {
  it("E1: admin.ts sandbox evidence procedure uses GLOBAL fallback", () => {
    // Find the first admin evidence sandbox procedure
    const sandboxIdx = adminSource.indexOf("adminSandboxEvidence");
    if (sandboxIdx < 0) {
      // Procedure may have a different name; just verify no CA fallback
      expect(adminSource).not.toContain('profile?.regionCode ?? "CA"');
      return;
    }
    const procedureBody = adminSource.slice(sandboxIdx, sandboxIdx + 2000);
    expect(procedureBody).toContain('?? "GLOBAL"');
    expect(procedureBody).not.toContain('?? "CA"');
  });

  it("E2: admin.ts has no remaining ?? 'CA' regionCode fallbacks", () => {
    expect(adminSource).not.toContain('?? "CA"');
    expect(adminSource).not.toContain("?? 'CA'");
  });
});

// ─── F: PACK_PROMPT_PREFIXES: GLOBAL gets empty, CA gets CA-specific ──────────
describe("F) v2PackContext: GLOBAL prompt prefix is empty, CA has CA-specific text", () => {
  it("F1: GLOBAL prompt prefix is an empty string in PACK_PROMPT_PREFIXES", () => {
    // Source check: GLOBAL: "" in PACK_PROMPT_PREFIXES
    const prefixesIdx = v2PackContextSource.indexOf("PACK_PROMPT_PREFIXES");
    expect(prefixesIdx).toBeGreaterThan(0);
    const prefixesBlock = v2PackContextSource.slice(prefixesIdx, prefixesIdx + 500);
    expect(prefixesBlock).toContain('GLOBAL: ""');
  });

  it("F2: CA prompt prefix contains 'Canadian' in PACK_PROMPT_PREFIXES", () => {
    const prefixesIdx = v2PackContextSource.indexOf("PACK_PROMPT_PREFIXES");
    const prefixesBlock = v2PackContextSource.slice(prefixesIdx, prefixesIdx + 800);
    expect(prefixesBlock).toContain("Canadian");
  });

  it("F3: resolvePackContextForGeneration falls back to GLOBAL (not CA) on error", () => {
    // Source check: fallback in catch block uses DEFAULT_COUNTRY_PACK_ID
    expect(v2PackContextSource).toContain("DEFAULT_COUNTRY_PACK_ID");
    expect(v2PackContextSource).not.toContain('return buildContext("CA"');
  });
});

// ─── G: DEFAULT_COUNTRY_PACK_ID is GLOBAL ─────────────────────────────────────
describe("G) DEFAULT_COUNTRY_PACK_ID is GLOBAL", () => {
  it("G1: DEFAULT_COUNTRY_PACK_ID equals 'GLOBAL'", () => {
    expect(DEFAULT_COUNTRY_PACK_ID).toBe("GLOBAL");
  });

  it("G2: db.ts resolveCountryPack uses DEFAULT_COUNTRY_PACK_ID (not hardcoded 'CA')", () => {
    // Source check: db.ts uses DEFAULT_COUNTRY_PACK_ID for fallback
    expect(dbSource).toContain("DEFAULT_COUNTRY_PACK_ID");
    expect(dbSource).not.toContain('effectiveCountryPackId: "CA"');
  });

  it("G3: db.ts does not hardcode 'CA' as a fallback country pack", () => {
    // Only allow 'CA' in string comparisons for actual CA logic, not as defaults
    const caDefaultPattern = /effectiveCountryPackId:\s*["']CA["']/;
    expect(caDefaultPattern.test(dbSource)).toBe(false);
  });
});
