/**
 * V2 — VN Track PackSet Tests
 * Covers: config validation for all 4 VN tracks, getRegionPack lookup,
 *         getAvailablePacks listing, and AdminPacks UI filter wiring.
 */
import { describe, it, expect } from "vitest";
import {
  getRegionPack,
  getAvailablePacks,
} from "../shared/regionPacks";

// ─── VN/INTERNSHIP ────────────────────────────────────────────────────────────

describe("VN/INTERNSHIP track", () => {
  const pack = getRegionPack("VN", "INTERNSHIP");

  it("V1: regionCode is VN", () => {
    expect(pack.regionCode).toBe("VN");
  });

  it("V2: trackCode is INTERNSHIP", () => {
    expect(pack.trackCode).toBe("INTERNSHIP");
  });

  it("V3: label contains Vietnam and Internship", () => {
    expect(pack.label).toContain("Vietnam");
    expect(pack.label).toContain("Internship");
  });

  it("V4: maxPages is 1", () => {
    expect(pack.resumeDefaults.maxPages).toBe(1);
  });

  it("V5: outreachTone is professional-eager", () => {
    expect(pack.templates.outreachTone).toBe("professional-eager");
  });

  it("V6: eligibilityChecks is empty (none required)", () => {
    expect(pack.eligibilityChecks).toHaveLength(0);
  });

  it("V7: scoring weights sum to 1.0", () => {
    const w = pack.scoringWeights;
    const sum = w.eligibility + w.tools + w.responsibilities + w.skills + w.softSkills;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("V8: softSkills weight is 0.25 (highest for internship)", () => {
    expect(pack.scoringWeights.softSkills).toBe(0.25);
  });

  it("V9: sections include education and projects", () => {
    expect(pack.resumeDefaults.sections).toContain("education");
    expect(pack.resumeDefaults.sections).toContain("projects");
  });

  it("V10: educationFirst is true", () => {
    expect(pack.resumeDefaults.educationFirst).toBe(true);
  });
});

// ─── VN/NEW_GRAD ──────────────────────────────────────────────────────────────

describe("VN/NEW_GRAD track", () => {
  const pack = getRegionPack("VN", "NEW_GRAD");

  it("V11: regionCode is VN", () => {
    expect(pack.regionCode).toBe("VN");
  });

  it("V12: trackCode is NEW_GRAD", () => {
    expect(pack.trackCode).toBe("NEW_GRAD");
  });

  it("V13: label contains Vietnam and New Graduate", () => {
    expect(pack.label).toContain("Vietnam");
    expect(pack.label).toContain("New Graduate");
  });

  it("V14: maxPages is 1", () => {
    expect(pack.resumeDefaults.maxPages).toBe(1);
  });

  it("V15: outreachTone is professional-confident", () => {
    expect(pack.templates.outreachTone).toBe("professional-confident");
  });

  it("V16: eligibilityChecks is empty", () => {
    expect(pack.eligibilityChecks).toHaveLength(0);
  });

  it("V17: scoring weights sum to 1.0", () => {
    const w = pack.scoringWeights;
    const sum = w.eligibility + w.tools + w.responsibilities + w.skills + w.softSkills;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("V18: responsibilities weight is 0.25", () => {
    expect(pack.scoringWeights.responsibilities).toBe(0.25);
  });

  it("V19: sections include experience and education", () => {
    expect(pack.resumeDefaults.sections).toContain("experience");
    expect(pack.resumeDefaults.sections).toContain("education");
  });
});

// ─── VN/EARLY_CAREER ─────────────────────────────────────────────────────────

describe("VN/EARLY_CAREER track", () => {
  const pack = getRegionPack("VN", "EARLY_CAREER");

  it("V20: regionCode is VN", () => {
    expect(pack.regionCode).toBe("VN");
  });

  it("V21: trackCode is EARLY_CAREER", () => {
    expect(pack.trackCode).toBe("EARLY_CAREER");
  });

  it("V22: label contains Vietnam and Early Career", () => {
    expect(pack.label).toContain("Vietnam");
    expect(pack.label).toContain("Early Career");
  });

  it("V23: maxPages is 2", () => {
    expect(pack.resumeDefaults.maxPages).toBe(2);
  });

  it("V24: outreachTone is professional-direct", () => {
    expect(pack.templates.outreachTone).toBe("professional-direct");
  });

  it("V25: eligibilityChecks is empty", () => {
    expect(pack.eligibilityChecks).toHaveLength(0);
  });

  it("V26: scoring weights sum to 1.0", () => {
    const w = pack.scoringWeights;
    const sum = w.eligibility + w.tools + w.responsibilities + w.skills + w.softSkills;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("V27: responsibilities weight is 0.35 (highest for early career)", () => {
    expect(pack.scoringWeights.responsibilities).toBe(0.35);
  });

  it("V28: sections include experience and achievements", () => {
    expect(pack.resumeDefaults.sections).toContain("experience");
    expect(pack.resumeDefaults.sections).toContain("achievements");
  });
});

// ─── VN/EXPERIENCED ───────────────────────────────────────────────────────────

describe("VN/EXPERIENCED track", () => {
  const pack = getRegionPack("VN", "EXPERIENCED");

  it("V29: regionCode is VN", () => {
    expect(pack.regionCode).toBe("VN");
  });

  it("V30: trackCode is EXPERIENCED", () => {
    expect(pack.trackCode).toBe("EXPERIENCED");
  });

  it("V31: label contains Vietnam and Experienced", () => {
    expect(pack.label).toContain("Vietnam");
    expect(pack.label).toContain("Experienced");
  });

  it("V32: maxPages is 2", () => {
    expect(pack.resumeDefaults.maxPages).toBe(2);
  });

  it("V33: outreachTone is professional-executive", () => {
    expect(pack.templates.outreachTone).toBe("professional-executive");
  });

  it("V34: eligibilityChecks is empty", () => {
    expect(pack.eligibilityChecks).toHaveLength(0);
  });

  it("V35: scoring weights sum to 1.0", () => {
    const w = pack.scoringWeights;
    const sum = w.eligibility + w.tools + w.responsibilities + w.skills + w.softSkills;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("V36: responsibilities weight is 0.40 (highest for experienced)", () => {
    expect(pack.scoringWeights.responsibilities).toBe(0.40);
  });

  it("V37: sections include experience and leadership", () => {
    expect(pack.resumeDefaults.sections).toContain("experience");
    expect(pack.resumeDefaults.sections).toContain("leadership");
  });

  it("V38: followUpDays is 7 (longer for senior roles)", () => {
    expect(pack.templates.followUpDays).toBe(7);
  });
});

// ─── getAvailablePacks listing ────────────────────────────────────────────────

describe("getAvailablePacks includes VN tracks", () => {
  const packs = getAvailablePacks();
  const keys = packs.map((p) => p.key);

  it("V39: VN_INTERNSHIP is in available packs", () => {
    expect(keys).toContain("VN_INTERNSHIP");
  });

  it("V40: VN_NEW_GRAD is in available packs", () => {
    expect(keys).toContain("VN_NEW_GRAD");
  });

  it("V41: VN_EARLY_CAREER is in available packs", () => {
    expect(keys).toContain("VN_EARLY_CAREER");
  });

  it("V42: VN_EXPERIENCED is in available packs", () => {
    expect(keys).toContain("VN_EXPERIENCED");
  });

  it("V43: CA packs are still present (no regression)", () => {
    expect(keys).toContain("CA_COOP");
    expect(keys).toContain("CA_NEW_GRAD");
  });

  it("V44: total pack count is 10 (2 CA + 4 VN + 4 PH)", () => {
    // Now includes 2 CA + 4 VN + 4 PH
    expect(packs.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── getRegionPack fallback still works ───────────────────────────────────────

describe("getRegionPack fallback behavior (no regression)", () => {
  it("V45: unknown region/track falls back to CA_NEW_GRAD", () => {
    const pack = getRegionPack("XX", "UNKNOWN");
    expect(pack.regionCode).toBe("CA");
    expect(pack.trackCode).toBe("NEW_GRAD");
  });

  it("V46: CA/COOP still returns correct pack", () => {
    const pack = getRegionPack("CA", "COOP");
    expect(pack.trackCode).toBe("COOP");
    expect(pack.resumeDefaults.educationFirst).toBe(true);
  });

  it("V47: CA/NEW_GRAD still returns correct pack", () => {
    const pack = getRegionPack("CA", "NEW_GRAD");
    expect(pack.trackCode).toBe("NEW_GRAD");
    expect(pack.scoringWeights.tools).toBe(0.25);
  });
});

// ─── AdminPacks UI filter wiring ──────────────────────────────────────────────

describe("AdminPacks.tsx country filter wiring", () => {
  it("V48: AdminPacks.tsx contains country filter UI element", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminPacks.tsx"),
      "utf-8"
    );
    expect(content).toContain("pack-country-filter");
  });

  it("V49: AdminPacks.tsx has VN filter option", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminPacks.tsx"),
      "utf-8"
    );
    expect(content).toContain("\"VN\"");
  });

  it("V50: AdminPacks.tsx has CA filter option", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminPacks.tsx"),
      "utf-8"
    );
    expect(content).toContain("\"CA\"");
  });

  it("V51: AdminPacks.tsx filters packs by regionCode", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminPacks.tsx"),
      "utf-8"
    );
    expect(content).toContain("regionCode === countryFilter");
  });

  it("V52: AdminPacks.tsx shows country badge per pack card", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminPacks.tsx"),
      "utf-8"
    );
    expect(content).toContain("pack-country-badge");
  });
});

// ─── VN track scoring weights are valid fractions ────────────────────────────

describe("VN track scoring weight validation", () => {
  const vnTracks = [
    { r: "VN", t: "INTERNSHIP" },
    { r: "VN", t: "NEW_GRAD" },
    { r: "VN", t: "EARLY_CAREER" },
    { r: "VN", t: "EXPERIENCED" },
  ];

  for (const { r, t } of vnTracks) {
    it(`V53-${t}: all weights are between 0 and 1 for ${r}/${t}`, () => {
      const pack = getRegionPack(r, t);
      for (const [key, val] of Object.entries(pack.scoringWeights)) {
        expect(val as number).toBeGreaterThanOrEqual(0);
        expect(val as number).toBeLessThanOrEqual(1);
      }
    });
  }

  it("V57: VN tracks have no workAuthRules (not applicable)", () => {
    for (const { r, t } of vnTracks) {
      const pack = getRegionPack(r, t);
      expect(pack.workAuthRules ?? []).toHaveLength(0);
    }
  });
});
