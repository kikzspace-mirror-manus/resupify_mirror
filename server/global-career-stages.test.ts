/**
 * V2 — Global Career Stages Tests
 *
 * Covers:
 * - shared/trackOptions.ts: GLOBAL_TRACKS array + getTracksForCountry("GLOBAL")
 * - Profile.tsx: GLOBAL renders dropdown (not "Tracks coming soon")
 * - Profile.tsx: defaultTrackForPack is INTERNSHIP for GLOBAL (not COOP)
 * - Regression: CA still gets COOP default, V1 flag OFF unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getTracksForCountry,
  GLOBAL_TRACKS,
  CA_TRACKS,
} from "../shared/trackOptions";

const profileSrc = readFileSync(
  resolve(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

const trackOptionsSrc = readFileSync(
  resolve(__dirname, "../shared/trackOptions.ts"),
  "utf-8"
);

// ─── Unit tests: GLOBAL_TRACKS array ─────────────────────────────────────────
describe("GLOBAL_TRACKS array", () => {
  it("G1: GLOBAL_TRACKS has exactly 4 tracks", () => {
    expect(GLOBAL_TRACKS).toHaveLength(4);
  });

  it("G2: GLOBAL_TRACKS track codes are INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    const codes = GLOBAL_TRACKS.map((t) => t.code);
    expect(codes).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });

  it("G3: GLOBAL_TRACKS labels match spec exactly", () => {
    const labels = GLOBAL_TRACKS.map((t) => t.label);
    expect(labels).toEqual([
      "Internship / Student",
      "New Graduate",
      "Early Career (1–5 years)",
      "Experienced (5+ years)",
    ]);
  });

  it("G4: All GLOBAL_TRACKS have regionCode='GLOBAL'", () => {
    GLOBAL_TRACKS.forEach((t) => {
      expect(t.regionCode).toBe("GLOBAL");
    });
  });

  it("G5: All GLOBAL_TRACKS have non-empty sublabels", () => {
    GLOBAL_TRACKS.forEach((t) => {
      expect(t.sublabel.length).toBeGreaterThan(0);
    });
  });
});

// ─── Unit tests: getTracksForCountry("GLOBAL") ───────────────────────────────
describe("getTracksForCountry — GLOBAL (flag ON)", () => {
  it("G6: returns GLOBAL_TRACKS for GLOBAL pack", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.tracks).toEqual(GLOBAL_TRACKS);
  });

  it("G7: hasTracksForCountry is true for GLOBAL", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.hasTracksForCountry).toBe(true);
  });

  it("G8: defaultTrack is INTERNSHIP for GLOBAL", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.defaultTrack).toBe("INTERNSHIP");
  });

  it("G9: regionCode is GLOBAL (not CA) for GLOBAL pack", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("G10: null countryPackId returns GLOBAL tracks (flag ON)", () => {
    const result = getTracksForCountry(null, true);
    expect(result.tracks).toEqual(GLOBAL_TRACKS);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.defaultTrack).toBe("INTERNSHIP");
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("G11: undefined countryPackId returns GLOBAL tracks (flag ON)", () => {
    const result = getTracksForCountry(undefined, true);
    expect(result.tracks).toEqual(GLOBAL_TRACKS);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("G12: GLOBAL tracks are English-only (locale param ignored)", () => {
    const resultEn = getTracksForCountry("GLOBAL", true, "en");
    const resultVi = getTracksForCountry("GLOBAL", true, "vi");
    expect(resultEn.tracks).toEqual(resultVi.tracks);
  });
});

// ─── Regression: V1 flag OFF ─────────────────────────────────────────────────
describe("getTracksForCountry — GLOBAL (flag OFF, V1 regression)", () => {
  it("G13: flag OFF + GLOBAL → CA tracks unchanged (V1 regression)", () => {
    const result = getTracksForCountry("GLOBAL", false);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.regionCode).toBe("CA");
  });

  it("G14: flag OFF + null → CA tracks unchanged (V1 regression)", () => {
    const result = getTracksForCountry(null, false);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.regionCode).toBe("CA");
  });
});

// ─── Regression: CA unchanged ────────────────────────────────────────────────
describe("getTracksForCountry — CA unchanged", () => {
  it("G15: CA still returns CA_TRACKS with COOP default (not affected by GLOBAL change)", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.regionCode).toBe("CA");
    expect(result.hasTracksForCountry).toBe(true);
  });

  it("G16: CA_TRACKS has no INTERNSHIP track (GLOBAL and CA are distinct)", () => {
    const caCodes = CA_TRACKS.map((t) => t.code);
    expect(caCodes).not.toContain("INTERNSHIP");
  });
});

// ─── Source: trackOptions.ts ─────────────────────────────────────────────────
describe("trackOptions.ts source — GLOBAL_TRACKS export", () => {
  it("G17: GLOBAL_TRACKS is exported from trackOptions.ts", () => {
    expect(trackOptionsSrc).toContain("export const GLOBAL_TRACKS");
  });

  it("G18: GLOBAL_TRACKS has regionCode GLOBAL in source", () => {
    expect(trackOptionsSrc).toContain('regionCode: "GLOBAL"');
  });

  it("G19: behaviour matrix comment updated to show GLOBAL_TRACKS", () => {
    expect(trackOptionsSrc).toContain("GLOBAL_TRACKS");
    expect(trackOptionsSrc).toContain("INTERNSHIP   | GLOBAL");
  });

  it("G20: GLOBAL fallback comment says 'return neutral GLOBAL tracks'", () => {
    expect(trackOptionsSrc).toContain("return neutral GLOBAL tracks");
  });
});

// ─── Source: Profile.tsx ─────────────────────────────────────────────────────
describe("Profile.tsx — GLOBAL career stage dropdown", () => {
  it("G21: Profile.tsx still has tracks-coming-soon testid (for non-GLOBAL future regions)", () => {
    // The placeholder div is still in the code for any future region without tracks
    expect(profileSrc).toContain('data-testid="tracks-coming-soon"');
  });

  it("G22: Profile.tsx uses defaultTrackForPack (not hardcoded COOP) for trackCode init", () => {
    expect(profileSrc).toContain("defaultTrackForPack");
    expect(profileSrc).not.toContain('useState<TrackCode>("COOP")');
  });

  it("G23: Profile.tsx destructures defaultTrack from getTracksForCountry useMemo", () => {
    expect(profileSrc).toContain("defaultTrack: defaultTrackForPack");
  });

  it("G24: Profile.tsx fallback in useEffect uses defaultTrackForPack (not 'COOP')", () => {
    expect(profileSrc).toContain("?? defaultTrackForPack");
  });

  it("G25: Profile.tsx track-select testid still present (dropdown renders for GLOBAL)", () => {
    expect(profileSrc).toContain('data-testid="track-select"');
  });

  it("G26: Profile.tsx track-select-content testid still present", () => {
    expect(profileSrc).toContain('data-testid="track-select-content"');
  });

  it("G27: Profile.tsx does not hardcode 'COOP' as trackCode useState default", () => {
    // The old pattern was: useState<TrackCode>("COOP")
    // The new pattern uses defaultTrackForPack
    expect(profileSrc).not.toMatch(/useState<TrackCode>\("COOP"\)/);
  });
});

// ─── Integration: GLOBAL pack returns 4 tracks with correct structure ─────────
describe("GLOBAL_TRACKS structure integrity", () => {
  it("G28: INTERNSHIP track has correct label and sublabel", () => {
    const t = GLOBAL_TRACKS.find((t) => t.code === "INTERNSHIP")!;
    expect(t.label).toBe("Internship / Student");
    expect(t.sublabel).toBe("Students applying for internships");
    expect(t.regionCode).toBe("GLOBAL");
  });

  it("G29: NEW_GRAD track has correct label and sublabel", () => {
    const t = GLOBAL_TRACKS.find((t) => t.code === "NEW_GRAD")!;
    expect(t.label).toBe("New Graduate");
    expect(t.sublabel).toBe("0–2 years experience");
    expect(t.regionCode).toBe("GLOBAL");
  });

  it("G30: EARLY_CAREER track has correct label and sublabel", () => {
    const t = GLOBAL_TRACKS.find((t) => t.code === "EARLY_CAREER")!;
    expect(t.label).toBe("Early Career (1–5 years)");
    expect(t.sublabel).toBe("1–5 years experience");
    expect(t.regionCode).toBe("GLOBAL");
  });

  it("G31: EXPERIENCED track has correct label and sublabel", () => {
    const t = GLOBAL_TRACKS.find((t) => t.code === "EXPERIENCED")!;
    expect(t.label).toBe("Experienced (5+ years)");
    expect(t.sublabel).toBe("5+ years (senior IC/manager)");
    expect(t.regionCode).toBe("GLOBAL");
  });
});
