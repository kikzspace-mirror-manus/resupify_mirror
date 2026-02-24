/**
 * server/ca-extended-tracks.test.ts
 *
 * Tests for CA_EARLY_CAREER and CA_EXPERIENCED packs added in V2.
 * Covers:
 *   V60a – CA_EARLY_CAREER pack exists in PACKS registry
 *   V60b – CA_EXPERIENCED pack exists in PACKS registry
 *   V60c – CA_EARLY_CAREER has correct regionCode and trackCode
 *   V60d – CA_EXPERIENCED has correct regionCode and trackCode
 *   V60e – CA_EARLY_CAREER scoring weights sum to 1.0
 *   V60f – CA_EXPERIENCED scoring weights sum to 1.0
 *   V60g – CA_EARLY_CAREER maxPages is 1
 *   V60h – CA_EXPERIENCED maxPages is 2
 *   V60i – CA_EXPERIENCED has executive outreachTone
 *   V60j – CA_EARLY_CAREER has professional-confident outreachTone
 *   V60k – CA_EARLY_CAREER has workAuthRules array with 4 entries
 *   V60l – CA_EXPERIENCED has workAuthRules array with 4 entries
 *   V60m – CA_EARLY_CAREER educationFirst is false
 *   V60n – CA_EXPERIENCED educationFirst is false
 *   V60o – getRegionPack("CA","EARLY_CAREER") returns correct pack
 *   V60p – getRegionPack("CA","EXPERIENCED") returns correct pack
 *   V60q – CA_TRACKS array has 4 entries (COOP, NEW_GRAD, EARLY_CAREER, EXPERIENCED)
 *   V60r – CA_TRACKS EARLY_CAREER entry has correct sublabel
 *   V60s – CA_TRACKS EXPERIENCED entry has correct sublabel
 *   V60t – getTracksForCountry("CA", true) returns 4 tracks
 *   V60u – getTracksForCountry("CA", true) defaultTrack is COOP
 *   V60v – getTracksForCountry("CA", false) still returns 4 tracks (V1 compat)
 *   V60w – getTracksForCountry("CA", false) defaultTrack is COOP (V1 compat)
 *   V60x – EARLY_CAREER track code is valid in CA_TRACKS
 *   V60y – EXPERIENCED track code is valid in CA_TRACKS
 *   V60z – CA_EXPERIENCED responsibilities weight is 0.40 (experience-first)
 *   V60aa – CA_EARLY_CAREER responsibilities weight is 0.30
 *   V60ab – CA_EXPERIENCED coverLetterStyle is executive-brief
 *   V60ac – CA_EARLY_CAREER coverLetterStyle is professional-concise
 *   V60ad – CA_EXPERIENCED followUpDays is 7
 *   V60ae – CA_EARLY_CAREER followUpDays is 5
 *   V60af – CA_EXPERIENCED track_label localization is "Experienced"
 *   V60ag – CA_EARLY_CAREER track_label localization is "Early Career"
 *   V60ah – CA_EARLY_CAREER has 4 trackTips
 *   V60ai – CA_EXPERIENCED has 4 trackTips
 *   V60aj – CA_EXPERIENCED eligibilityChecks is empty (no graduation check)
 *   V60ak – CA_EARLY_CAREER eligibilityChecks is empty (no graduation check)
 */

import { describe, it, expect } from "vitest";
import { getRegionPack, getAvailablePacks } from "../shared/regionPacks";
import { CA_TRACKS, getTracksForCountry } from "../shared/trackOptions";

// ─── Pack registry tests ──────────────────────────────────────────────────────

describe("CA extended tracks — pack registry", () => {
  it("V60a: CA_EARLY_CAREER pack exists in PACKS registry", () => {
    const packs = getAvailablePacks();
    const keys = packs.map((p) => p.key);
    expect(keys).toContain("CA_EARLY_CAREER");
  });

  it("V60b: CA_EXPERIENCED pack exists in PACKS registry", () => {
    const packs = getAvailablePacks();
    const keys = packs.map((p) => p.key);
    expect(keys).toContain("CA_EXPERIENCED");
  });

  it("V60c: CA_EARLY_CAREER has correct regionCode and trackCode", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.regionCode).toBe("CA");
    expect(pack.trackCode).toBe("EARLY_CAREER");
  });

  it("V60d: CA_EXPERIENCED has correct regionCode and trackCode", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.regionCode).toBe("CA");
    expect(pack.trackCode).toBe("EXPERIENCED");
  });
});

// ─── Scoring weights ──────────────────────────────────────────────────────────

describe("CA extended tracks — scoring weights", () => {
  it("V60e: CA_EARLY_CAREER scoring weights sum to 1.0", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    const w = pack.scoringWeights;
    const sum = w.eligibility + w.tools + w.responsibilities + w.skills + w.softSkills;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("V60f: CA_EXPERIENCED scoring weights sum to 1.0", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    const w = pack.scoringWeights;
    const sum = w.eligibility + w.tools + w.responsibilities + w.skills + w.softSkills;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("V60z: CA_EXPERIENCED responsibilities weight is 0.40 (experience-first)", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.scoringWeights.responsibilities).toBe(0.40);
  });

  it("V60aa: CA_EARLY_CAREER responsibilities weight is 0.30", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.scoringWeights.responsibilities).toBe(0.30);
  });
});

// ─── Resume defaults ──────────────────────────────────────────────────────────

describe("CA extended tracks — resume defaults", () => {
  it("V60g: CA_EARLY_CAREER maxPages is 1", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.resumeDefaults.maxPages).toBe(1);
  });

  it("V60h: CA_EXPERIENCED maxPages is 2", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.resumeDefaults.maxPages).toBe(2);
  });

  it("V60m: CA_EARLY_CAREER educationFirst is false", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.resumeDefaults.educationFirst).toBe(false);
  });

  it("V60n: CA_EXPERIENCED educationFirst is false", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.resumeDefaults.educationFirst).toBe(false);
  });
});

// ─── Templates ───────────────────────────────────────────────────────────────

describe("CA extended tracks — templates", () => {
  it("V60i: CA_EXPERIENCED has executive outreachTone", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.templates.outreachTone).toBe("professional-executive");
  });

  it("V60j: CA_EARLY_CAREER has professional-confident outreachTone", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.templates.outreachTone).toBe("professional-confident");
  });

  it("V60ab: CA_EXPERIENCED coverLetterStyle is executive-brief", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.templates.coverLetterStyle).toBe("executive-brief");
  });

  it("V60ac: CA_EARLY_CAREER coverLetterStyle is professional-concise", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.templates.coverLetterStyle).toBe("professional-concise");
  });

  it("V60ad: CA_EXPERIENCED followUpDays is 7", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.templates.followUpDays).toBe(7);
  });

  it("V60ae: CA_EARLY_CAREER followUpDays is 5", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.templates.followUpDays).toBe(5);
  });
});

// ─── Work auth rules ──────────────────────────────────────────────────────────

describe("CA extended tracks — work auth rules", () => {
  it("V60k: CA_EARLY_CAREER has workAuthRules array with 4 entries", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(Array.isArray(pack.workAuthRules)).toBe(true);
    expect(pack.workAuthRules!.length).toBe(4);
  });

  it("V60l: CA_EXPERIENCED has workAuthRules array with 4 entries", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(Array.isArray(pack.workAuthRules)).toBe(true);
    expect(pack.workAuthRules!.length).toBe(4);
  });
});

// ─── Eligibility checks ───────────────────────────────────────────────────────

describe("CA extended tracks — eligibility checks", () => {
  it("V60aj: CA_EXPERIENCED eligibilityChecks is empty (no graduation check)", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.eligibilityChecks).toEqual([]);
  });

  it("V60ak: CA_EARLY_CAREER eligibilityChecks is empty (no graduation check)", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.eligibilityChecks).toEqual([]);
  });
});

// ─── Localization labels ──────────────────────────────────────────────────────

describe("CA extended tracks — localization labels", () => {
  it("V60af: CA_EXPERIENCED track_label localization is 'Experienced'", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.localizationLabels["track_label"]).toBe("Experienced");
  });

  it("V60ag: CA_EARLY_CAREER track_label localization is 'Early Career'", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.localizationLabels["track_label"]).toBe("Early Career");
  });
});

// ─── Track tips ───────────────────────────────────────────────────────────────

describe("CA extended tracks — track tips", () => {
  it("V60ah: CA_EARLY_CAREER has 4 trackTips", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.trackTips.length).toBe(4);
  });

  it("V60ai: CA_EXPERIENCED has 4 trackTips", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.trackTips.length).toBe(4);
  });
});

// ─── getRegionPack lookup ─────────────────────────────────────────────────────

describe("CA extended tracks — getRegionPack lookup", () => {
  it("V60o: getRegionPack('CA','EARLY_CAREER') returns correct pack", () => {
    const pack = getRegionPack("CA", "EARLY_CAREER");
    expect(pack.label).toContain("Early Career");
  });

  it("V60p: getRegionPack('CA','EXPERIENCED') returns correct pack", () => {
    const pack = getRegionPack("CA", "EXPERIENCED");
    expect(pack.label).toContain("Experienced");
  });
});

// ─── CA_TRACKS array ─────────────────────────────────────────────────────────

describe("CA extended tracks — CA_TRACKS array", () => {
  it("V60q: CA_TRACKS array has 4 entries (COOP, NEW_GRAD, EARLY_CAREER, EXPERIENCED)", () => {
    expect(CA_TRACKS.length).toBe(4);
    const codes = CA_TRACKS.map((t) => t.code);
    expect(codes).toContain("COOP");
    expect(codes).toContain("NEW_GRAD");
    expect(codes).toContain("EARLY_CAREER");
    expect(codes).toContain("EXPERIENCED");
  });

  it("V60r: CA_TRACKS EARLY_CAREER entry has correct sublabel", () => {
    const entry = CA_TRACKS.find((t) => t.code === "EARLY_CAREER");
    expect(entry).toBeDefined();
    expect(entry!.sublabel).toBe("2–5 years experience");
  });

  it("V60s: CA_TRACKS EXPERIENCED entry has correct sublabel", () => {
    const entry = CA_TRACKS.find((t) => t.code === "EXPERIENCED");
    expect(entry).toBeDefined();
    expect(entry!.sublabel).toBe("5+ years experience");
  });

  it("V60x: EARLY_CAREER track code is valid in CA_TRACKS", () => {
    const entry = CA_TRACKS.find((t) => t.code === "EARLY_CAREER");
    expect(entry).toBeDefined();
    expect(entry!.regionCode).toBe("CA");
  });

  it("V60y: EXPERIENCED track code is valid in CA_TRACKS", () => {
    const entry = CA_TRACKS.find((t) => t.code === "EXPERIENCED");
    expect(entry).toBeDefined();
    expect(entry!.regionCode).toBe("CA");
  });
});

// ─── getTracksForCountry ──────────────────────────────────────────────────────

describe("CA extended tracks — getTracksForCountry", () => {
  it("V60t: getTracksForCountry('CA', true) returns 4 tracks", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.tracks.length).toBe(4);
  });

  it("V60u: getTracksForCountry('CA', true) defaultTrack is COOP", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.defaultTrack).toBe("COOP");
  });

  it("V60v: getTracksForCountry('CA', false) still returns 4 tracks (V1 compat)", () => {
    // V1 mode still uses CA_TRACKS which now has 4 entries
    const result = getTracksForCountry("CA", false);
    expect(result.tracks.length).toBe(4);
  });

  it("V60w: getTracksForCountry('CA', false) defaultTrack is COOP (V1 compat)", () => {
    const result = getTracksForCountry("CA", false);
    expect(result.defaultTrack).toBe("COOP");
  });

  it("V60t2: getTracksForCountry('CA', true) includes EARLY_CAREER and EXPERIENCED", () => {
    const result = getTracksForCountry("CA", true);
    const codes = result.tracks.map((t) => t.code);
    expect(codes).toContain("EARLY_CAREER");
    expect(codes).toContain("EXPERIENCED");
  });

  it("V60t3: getTracksForCountry('CA', true) regionCode is CA", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.regionCode).toBe("CA");
    expect(result.hasTracksForCountry).toBe(true);
  });
});
