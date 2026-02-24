/**
 * us-track-packset.test.ts
 *
 * Tests for US pack definitions and US track options.
 * Follows the same pattern as ph-track-packset.test.ts and ca-extended-tracks.test.ts.
 *
 * Groups:
 *   A) US pack definitions — shared/regionPacks.ts
 *   B) US_TRACKS — shared/trackOptions.ts
 *   C) getTracksForCountry("US") — locale-agnostic, English-only
 *   D) Regression — existing CA/VN/PH packs and GLOBAL fallback unchanged
 */
import { describe, it, expect } from "vitest";
import { getRegionPack, getAvailablePacks } from "../shared/regionPacks";
import { getTracksForCountry, US_TRACKS } from "../shared/trackOptions";

// ─── Weight sum helper ────────────────────────────────────────────────────────
function sumWeights(regionCode: string, trackCode: string): number {
  const pack = getRegionPack(regionCode, trackCode);
  const w = pack.scoringWeights;
  return (
    (w.eligibility ?? 0) +
    (w.tools ?? 0) +
    (w.responsibilities ?? 0) +
    (w.skills ?? 0) +
    (w.softSkills ?? 0)
  );
}

// ─── A) US pack definitions ───────────────────────────────────────────────────

describe("A) US pack definitions — shared/regionPacks.ts", () => {
  it("T1: US/INTERNSHIP weights sum to 1.0", () => {
    expect(sumWeights("US", "INTERNSHIP")).toBeCloseTo(1.0, 10);
  });

  it("T2: US/NEW_GRAD weights sum to 1.0", () => {
    expect(sumWeights("US", "NEW_GRAD")).toBeCloseTo(1.0, 10);
  });

  it("T3: US/EARLY_CAREER weights sum to 1.0", () => {
    expect(sumWeights("US", "EARLY_CAREER")).toBeCloseTo(1.0, 10);
  });

  it("T4: US/EXPERIENCED weights sum to 1.0", () => {
    expect(sumWeights("US", "EXPERIENCED")).toBeCloseTo(1.0, 10);
  });

  it("T5: US/INTERNSHIP has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("US", "INTERNSHIP");
    expect(pack.regionCode).toBe("US");
    expect(pack.trackCode).toBe("INTERNSHIP");
    expect(pack.label).toBe("Internship / Student");
  });

  it("T6: US/NEW_GRAD has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("US", "NEW_GRAD");
    expect(pack.regionCode).toBe("US");
    expect(pack.trackCode).toBe("NEW_GRAD");
    expect(pack.label).toBe("New Graduate");
  });

  it("T7: US/EARLY_CAREER has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("US", "EARLY_CAREER");
    expect(pack.regionCode).toBe("US");
    expect(pack.trackCode).toBe("EARLY_CAREER");
    expect(pack.label).toBe("Early Career (1–5 years)");
  });

  it("T8: US/EXPERIENCED has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("US", "EXPERIENCED");
    expect(pack.regionCode).toBe("US");
    expect(pack.trackCode).toBe("EXPERIENCED");
    expect(pack.label).toBe("Experienced (5+ years)");
  });

  it("T9: all US packs have no eligibility checks", () => {
    for (const tc of ["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]) {
      expect(getRegionPack("US", tc).eligibilityChecks).toHaveLength(0);
    }
  });

  it("T10: US outreach tones are correct", () => {
    expect(getRegionPack("US", "INTERNSHIP").templates.outreachTone).toBe("professional-eager");
    expect(getRegionPack("US", "NEW_GRAD").templates.outreachTone).toBe("professional-confident");
    expect(getRegionPack("US", "EARLY_CAREER").templates.outreachTone).toBe("professional-direct");
    expect(getRegionPack("US", "EXPERIENCED").templates.outreachTone).toBe("professional-executive");
  });

  it("T11: US/INTERNSHIP and US/NEW_GRAD maxPages is 1", () => {
    expect(getRegionPack("US", "INTERNSHIP").resumeDefaults.maxPages).toBe(1);
    expect(getRegionPack("US", "NEW_GRAD").resumeDefaults.maxPages).toBe(1);
  });

  it("T12: US/EARLY_CAREER and US/EXPERIENCED maxPages is 2", () => {
    expect(getRegionPack("US", "EARLY_CAREER").resumeDefaults.maxPages).toBe(2);
    expect(getRegionPack("US", "EXPERIENCED").resumeDefaults.maxPages).toBe(2);
  });

  it("T13: getAvailablePacks() includes all 4 US packs", () => {
    const packs = getAvailablePacks();
    const usKeys = packs.filter((p) => p.key.startsWith("US_")).map((p) => p.key);
    expect(usKeys.sort()).toEqual([
      "US_EARLY_CAREER",
      "US_EXPERIENCED",
      "US_INTERNSHIP",
      "US_NEW_GRAD",
    ]);
  });

  it("T14: US/INTERNSHIP sections include education and projects", () => {
    const pack = getRegionPack("US", "INTERNSHIP");
    expect(pack.resumeDefaults.sections).toContain("education");
    expect(pack.resumeDefaults.sections).toContain("projects");
  });

  it("T15: US/EXPERIENCED sections include leadership and achievements", () => {
    const pack = getRegionPack("US", "EXPERIENCED");
    expect(pack.resumeDefaults.sections).toContain("leadership");
    expect(pack.resumeDefaults.sections).toContain("achievements");
  });

  it("T16: US/INTERNSHIP specific weights match spec", () => {
    const w = getRegionPack("US", "INTERNSHIP").scoringWeights;
    expect(w.eligibility).toBeCloseTo(0.15, 10);
    expect(w.tools).toBeCloseTo(0.20, 10);
    expect(w.responsibilities).toBeCloseTo(0.20, 10);
    expect(w.skills).toBeCloseTo(0.20, 10);
    expect(w.softSkills).toBeCloseTo(0.25, 10);
  });

  it("T17: US/NEW_GRAD specific weights match spec", () => {
    const w = getRegionPack("US", "NEW_GRAD").scoringWeights;
    expect(w.eligibility).toBeCloseTo(0.15, 10);
    expect(w.tools).toBeCloseTo(0.20, 10);
    expect(w.responsibilities).toBeCloseTo(0.25, 10);
    expect(w.skills).toBeCloseTo(0.20, 10);
    expect(w.softSkills).toBeCloseTo(0.20, 10);
  });

  it("T18: US/EARLY_CAREER specific weights match spec", () => {
    const w = getRegionPack("US", "EARLY_CAREER").scoringWeights;
    expect(w.eligibility).toBeCloseTo(0.15, 10);
    expect(w.tools).toBeCloseTo(0.15, 10);
    expect(w.responsibilities).toBeCloseTo(0.35, 10);
    expect(w.skills).toBeCloseTo(0.20, 10);
    expect(w.softSkills).toBeCloseTo(0.15, 10);
  });

  it("T19: US/EXPERIENCED specific weights match spec", () => {
    const w = getRegionPack("US", "EXPERIENCED").scoringWeights;
    expect(w.eligibility).toBeCloseTo(0.20, 10);
    expect(w.tools).toBeCloseTo(0.10, 10);
    expect(w.responsibilities).toBeCloseTo(0.40, 10);
    expect(w.skills).toBeCloseTo(0.15, 10);
    expect(w.softSkills).toBeCloseTo(0.15, 10);
  });
});

// ─── B) US_TRACKS array ───────────────────────────────────────────────────────

describe("B) US_TRACKS — shared/trackOptions.ts", () => {
  it("T20: US_TRACKS has exactly 4 entries", () => {
    expect(US_TRACKS).toHaveLength(4);
  });

  it("T21: US_TRACKS codes are INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    const codes = US_TRACKS.map((t) => t.code);
    expect(codes).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });

  it("T22: all US_TRACKS have regionCode 'US'", () => {
    for (const t of US_TRACKS) {
      expect(t.regionCode).toBe("US");
    }
  });

  it("T23: US_TRACKS INTERNSHIP label is 'Internship / Student'", () => {
    const t = US_TRACKS.find((t) => t.code === "INTERNSHIP")!;
    expect(t.label).toBe("Internship / Student");
    expect(t.sublabel).toBe("Students applying for internships");
  });

  it("T24: US_TRACKS NEW_GRAD label is 'New Graduate'", () => {
    const t = US_TRACKS.find((t) => t.code === "NEW_GRAD")!;
    expect(t.label).toBe("New Graduate");
    expect(t.sublabel).toBe("0–2 years experience");
  });

  it("T25: US_TRACKS EARLY_CAREER label is 'Early Career (1–5 years)'", () => {
    const t = US_TRACKS.find((t) => t.code === "EARLY_CAREER")!;
    expect(t.label).toBe("Early Career (1–5 years)");
    expect(t.sublabel).toBe("1–5 years experience");
  });

  it("T26: US_TRACKS EXPERIENCED label is 'Experienced (5+ years)'", () => {
    const t = US_TRACKS.find((t) => t.code === "EXPERIENCED")!;
    expect(t.label).toBe("Experienced (5+ years)");
    expect(t.sublabel).toBe("5+ years (senior IC/manager)");
  });
});

// ─── C) getTracksForCountry("US") — locale-agnostic ──────────────────────────

describe("C) getTracksForCountry('US') — locale-agnostic, English-only", () => {
  it("T27: returns 4 tracks for US (v2 ON, locale=en)", () => {
    const result = getTracksForCountry("US", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("US");
  });

  it("T28: returns 4 tracks for US (v2 ON, locale=vi) — English-only, locale ignored", () => {
    const result = getTracksForCountry("US", true, "vi");
    expect(result.tracks).toHaveLength(4);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("US");
    // Labels must be English regardless of vi locale; no country prefix (removed in V2 Onboarding Phase 2)
    for (const t of result.tracks) {
      expect(t.label).not.toMatch(/^United States/);
      expect(t.label).toMatch(/^(Internship|New Graduate|Early Career|Experienced)/);
    }
  });

  it("T29: vi locale returns same English labels as en locale for US", () => {
    const en = getTracksForCountry("US", true, "en");
    const vi = getTracksForCountry("US", true, "vi");
    expect(en.tracks.map((t) => t.label)).toEqual(vi.tracks.map((t) => t.label));
  });

  it("T30: default track for US is INTERNSHIP", () => {
    const result = getTracksForCountry("US", true, "en");
    expect(result.defaultTrack).toBe("INTERNSHIP");
  });

  it("T31: regionCode for US is 'US'", () => {
    const result = getTracksForCountry("US", true, "en");
    expect(result.regionCode).toBe("US");
  });

  it("T32: v2 OFF → returns CA tracks regardless of US pack", () => {
    const result = getTracksForCountry("US", false, "en");
    expect(result.regionCode).toBe("CA");
    expect(result.defaultTrack).toBe("COOP");
  });

  it("T33: track codes returned for US are INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    const result = getTracksForCountry("US", true, "en");
    const codes = result.tracks.map((t) => t.code);
    expect(codes).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });
});

// ─── D) Regression — existing packs and GLOBAL fallback unchanged ─────────────

describe("D) Regression — existing CA/VN/PH packs and GLOBAL fallback unchanged", () => {
  it("T34: CA tracks still return 4 entries (COOP, NEW_GRAD, EARLY_CAREER, EXPERIENCED)", () => {
    const result = getTracksForCountry("CA", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.regionCode).toBe("CA");
  });

  it("T35: VN tracks still return 4 entries (en)", () => {
    const result = getTracksForCountry("VN", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("VN");
  });

  it("T36: VN tracks still return 4 entries (vi)", () => {
    const result = getTracksForCountry("VN", true, "vi");
    expect(result.tracks).toHaveLength(4);
    // Labels no longer contain country prefix (removed in V2 Onboarding Phase 2)
    for (const t of result.tracks) {
      expect(t.label).not.toMatch(/^Việt Nam/);
    }
  });

  it("T37: PH tracks still return 4 entries (en)", () => {
    const result = getTracksForCountry("PH", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("PH");
  });

  it("T38: GLOBAL returns 4 neutral GLOBAL_TRACKS (V2 Global Career Stages)", () => {
    const result = getTracksForCountry("GLOBAL", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("GLOBAL");
    expect(result.defaultTrack).toBe("INTERNSHIP");
  });

  it("T39: null countryPackId returns GLOBAL_TRACKS (V2 Global Career Stages)", () => {
    const result = getTracksForCountry(null, true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("T40: CA/NEW_GRAD weights still sum to 1.0 (unchanged)", () => {
    expect(sumWeights("CA", "NEW_GRAD")).toBeCloseTo(1.0, 10);
  });

  it("T41: PH/EXPERIENCED weights still sum to 1.0 (unchanged)", () => {
    expect(sumWeights("PH", "EXPERIENCED")).toBeCloseTo(1.0, 10);
  });

  it("T42: getAvailablePacks() now includes 16 packs (4 CA + 4 VN + 4 PH + 4 US)", () => {
    const packs = getAvailablePacks();
    const caCount = packs.filter((p) => p.key.startsWith("CA_")).length;
    const vnCount = packs.filter((p) => p.key.startsWith("VN_")).length;
    const phCount = packs.filter((p) => p.key.startsWith("PH_")).length;
    const usCount = packs.filter((p) => p.key.startsWith("US_")).length;
    expect(caCount).toBe(4);
    expect(vnCount).toBe(4);
    expect(phCount).toBe(4);
    expect(usCount).toBe(4);
    expect(packs.length).toBeGreaterThanOrEqual(16);
  });
});
