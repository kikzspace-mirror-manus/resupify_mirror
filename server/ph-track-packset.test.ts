/**
 * ph-track-packset.test.ts
 * Tests for PH track pack definitions and PH track options.
 */

import { describe, it, expect } from "vitest";
import { getRegionPack, getAvailablePacks } from "../shared/regionPacks";
import { getTracksForCountry, PH_TRACKS } from "../shared/trackOptions";

function sumWeights(regionCode: string, trackCode: string): number {
  const pack = getRegionPack(regionCode, trackCode);
  const w = pack.scoringWeights;
  return (w.eligibility ?? 0) + (w.tools ?? 0) + (w.responsibilities ?? 0) + (w.skills ?? 0) + (w.softSkills ?? 0);
}

describe("PH pack definitions — shared/regionPacks.ts", () => {
  it("T1: PH/INTERNSHIP weights sum to 1.0", () => { expect(sumWeights("PH", "INTERNSHIP")).toBeCloseTo(1.0, 10); });
  it("T2: PH/NEW_GRAD weights sum to 1.0", () => { expect(sumWeights("PH", "NEW_GRAD")).toBeCloseTo(1.0, 10); });
  it("T3: PH/EARLY_CAREER weights sum to 1.0", () => { expect(sumWeights("PH", "EARLY_CAREER")).toBeCloseTo(1.0, 10); });
  it("T4: PH/EXPERIENCED weights sum to 1.0", () => { expect(sumWeights("PH", "EXPERIENCED")).toBeCloseTo(1.0, 10); });

  it("T5: PH/INTERNSHIP has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("PH", "INTERNSHIP");
    expect(pack.regionCode).toBe("PH");
    expect(pack.trackCode).toBe("INTERNSHIP");
    expect(pack.label).toBe("Philippines — Internship / Student");
  });
  it("T6: PH/NEW_GRAD has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("PH", "NEW_GRAD");
    expect(pack.regionCode).toBe("PH");
    expect(pack.trackCode).toBe("NEW_GRAD");
    expect(pack.label).toBe("Philippines — New Graduate");
  });
  it("T7: PH/EARLY_CAREER has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("PH", "EARLY_CAREER");
    expect(pack.regionCode).toBe("PH");
    expect(pack.trackCode).toBe("EARLY_CAREER");
    expect(pack.label).toBe("Philippines — Early Career (1–5 years)");
  });
  it("T8: PH/EXPERIENCED has correct regionCode, trackCode, label", () => {
    const pack = getRegionPack("PH", "EXPERIENCED");
    expect(pack.regionCode).toBe("PH");
    expect(pack.trackCode).toBe("EXPERIENCED");
    expect(pack.label).toBe("Philippines — Experienced (5+ years)");
  });

  it("T9: PH packs have no eligibility checks", () => {
    for (const tc of ["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]) {
      expect(getRegionPack("PH", tc).eligibilityChecks).toHaveLength(0);
    }
  });

  it("T10: PH outreach tones are correct", () => {
    expect(getRegionPack("PH", "INTERNSHIP").templates.outreachTone).toBe("professional-eager");
    expect(getRegionPack("PH", "NEW_GRAD").templates.outreachTone).toBe("professional-confident");
    expect(getRegionPack("PH", "EARLY_CAREER").templates.outreachTone).toBe("professional-direct");
    expect(getRegionPack("PH", "EXPERIENCED").templates.outreachTone).toBe("professional-executive");
  });

  it("T11: PH/INTERNSHIP and PH/NEW_GRAD maxPages is 1", () => {
    expect(getRegionPack("PH", "INTERNSHIP").resumeDefaults.maxPages).toBe(1);
    expect(getRegionPack("PH", "NEW_GRAD").resumeDefaults.maxPages).toBe(1);
  });

  it("T12: PH/EARLY_CAREER and PH/EXPERIENCED maxPages is 2", () => {
    expect(getRegionPack("PH", "EARLY_CAREER").resumeDefaults.maxPages).toBe(2);
    expect(getRegionPack("PH", "EXPERIENCED").resumeDefaults.maxPages).toBe(2);
  });

  it("T13: getAvailablePacks() includes all 4 PH packs", () => {
    const packs = getAvailablePacks();
    const phKeys = packs.filter(p => p.key.startsWith("PH_")).map(p => p.key);
    expect(phKeys.sort()).toEqual(["PH_EARLY_CAREER", "PH_EXPERIENCED", "PH_INTERNSHIP", "PH_NEW_GRAD"]);
  });

  it("T14: CA packs now have exactly 4 entries", () => {
    const packs = getAvailablePacks();
    const caKeys = packs.filter(p => p.key.startsWith("CA_")).map(p => p.key);
    expect(caKeys.sort()).toEqual(["CA_COOP", "CA_EARLY_CAREER", "CA_EXPERIENCED", "CA_NEW_GRAD"]);
  });

  it("T15: VN packs still have exactly 4 entries", () => {
    const packs = getAvailablePacks();
    const vnKeys = packs.filter(p => p.key.startsWith("VN_")).map(p => p.key);
    expect(vnKeys.sort()).toEqual(["VN_EARLY_CAREER", "VN_EXPERIENCED", "VN_INTERNSHIP", "VN_NEW_GRAD"]);
  });

  it("T16: Total pack count is 12 (4 CA + 4 VN + 4 PH)", () => {
    expect(getAvailablePacks().length).toBe(12);
  });

  it("T17: CA/COOP weights are unchanged", () => {
    const pack = getRegionPack("CA", "COOP");
    expect(pack.scoringWeights.eligibility).toBeCloseTo(0.25, 10);
    expect(pack.scoringWeights.tools).toBeCloseTo(0.20, 10);
    expect(pack.scoringWeights.responsibilities).toBeCloseTo(0.20, 10);
    expect(pack.scoringWeights.skills).toBeCloseTo(0.20, 10);
    expect(pack.scoringWeights.softSkills).toBeCloseTo(0.15, 10);
  });

  it("T18: VN/INTERNSHIP weights are unchanged", () => {
    const pack = getRegionPack("VN", "INTERNSHIP");
    expect(pack.scoringWeights.eligibility).toBeCloseTo(0.15, 10);
    expect(pack.scoringWeights.tools).toBeCloseTo(0.20, 10);
    expect(pack.scoringWeights.responsibilities).toBeCloseTo(0.20, 10);
    expect(pack.scoringWeights.skills).toBeCloseTo(0.20, 10);
    expect(pack.scoringWeights.softSkills).toBeCloseTo(0.25, 10);
  });
});

describe("PH track options — shared/trackOptions.ts", () => {
  it("T19: PH_TRACKS has exactly 4 tracks", () => { expect(PH_TRACKS).toHaveLength(4); });

  it("T20: All PH_TRACKS have regionCode PH", () => {
    for (const track of PH_TRACKS) { expect(track.regionCode).toBe("PH"); }
  });

  it("T21: PH_TRACKS codes are INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    expect(PH_TRACKS.map(t => t.code)).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });

  it("T22: getTracksForCountry(PH, true, en) returns PH_TRACKS", () => {
    const result = getTracksForCountry("PH", true, "en");
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("PH");
    expect(result.tracks).toHaveLength(4);
    expect(result.tracks.every(t => t.regionCode === "PH")).toBe(true);
  });

  it("T23: getTracksForCountry(PH, true, vi) returns same English labels (locale-invariant)", () => {
    const en = getTracksForCountry("PH", true, "en");
    const vi = getTracksForCountry("PH", true, "vi");
    expect(vi.tracks.map(t => t.label)).toEqual(en.tracks.map(t => t.label));
    expect(vi.tracks.map(t => t.sublabel)).toEqual(en.tracks.map(t => t.sublabel));
  });

  it("T24: PH labels contain no Vietnamese characters", () => {
    const result = getTracksForCountry("PH", true, "vi");
    for (const track of result.tracks) {
      expect(track.label).not.toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
    }
  });

  it("T25: getTracksForCountry(PH) defaultTrack is NEW_GRAD", () => {
    expect(getTracksForCountry("PH", true).defaultTrack).toBe("NEW_GRAD");
  });

  it("T26: getTracksForCountry(PH, false) returns CA tracks when flag OFF (V1)", () => {
    const result = getTracksForCountry("PH", false);
    expect(result.regionCode).toBe("CA");
    expect(result.tracks.every(t => t.regionCode === "CA")).toBe(true);
  });

  it("T27: CA tracks now return 4 tracks (COOP, NEW_GRAD, EARLY_CAREER, EXPERIENCED)", () => {
    const result = getTracksForCountry("CA", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("CA");
    const codes = result.tracks.map(t => t.code);
    expect(codes).toContain("EARLY_CAREER");
    expect(codes).toContain("EXPERIENCED");
  });

  it("T28: VN tracks still return 4 EN tracks (unchanged)", () => {
    const result = getTracksForCountry("VN", true, "en");
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("VN");
    expect(result.tracks[0].label).not.toContain("Việt Nam");
  });

  it("T29: VN tracks still return 4 VI tracks (no country prefix)", () => {
    const result = getTracksForCountry("VN", true, "vi");
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("VN");
    // Labels no longer contain "Việt Nam" prefix (Restore 2/2)
    expect(result.tracks[0].label).not.toContain("Việt Nam");
  });

  it("T30: GLOBAL still returns empty tracks (unchanged)", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.hasTracksForCountry).toBe(false);
    expect(result.tracks).toHaveLength(0);
  });

  it("T31: PH/INTERNSHIP label and sublabel are correct", () => {
    const track = PH_TRACKS.find(t => t.code === "INTERNSHIP")!;
    expect(track.label).toBe("Internship / Student");
    expect(track.sublabel).toBe("Best for students applying for internships");
  });

  it("T32: PH/EXPERIENCED label and sublabel are correct", () => {
    const track = PH_TRACKS.find(t => t.code === "EXPERIENCED")!;
    expect(track.label).toBe("Experienced (5+ years)");
    expect(track.sublabel).toBe("Best for senior individual contributors or managers");
  });
});
