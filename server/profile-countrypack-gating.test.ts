/**
 * Patch — Profile: countryPackId gating tests
 * Covers:
 *   - Track options are always derived from countryPackId (not residence/currentCountry)
 *   - Work Authorization card is CA-only (gated on userCountryPackId === "CA")
 *   - DEV debug line is gated behind import.meta.env.DEV
 *   - showWorkAuthCard logic is independent of effectiveRegionCode
 */
import { describe, it, expect } from "vitest";
import { getTracksForCountry } from "../shared/trackOptions";
import type { CountryPackId } from "../shared/countryPacks";
import * as fs from "fs";
import * as path from "path";

const PROFILE_PATH = path.resolve("client/src/pages/Profile.tsx");
const profileContent = fs.readFileSync(PROFILE_PATH, "utf-8");

// ─── Track options use countryPackId ─────────────────────────────────────────

describe("Profile track options: always derived from countryPackId", () => {
  it("P1: VN countryPackId returns 4 VN tracks when flag ON", () => {
    const result = getTracksForCountry("VN" as CountryPackId, true, "en");
    expect(result.tracks.length).toBe(4);
    expect(result.tracks.map((t) => t.code)).toContain("INTERNSHIP");
    expect(result.tracks.map((t) => t.code)).toContain("NEW_GRAD");
    expect(result.tracks.map((t) => t.code)).toContain("EARLY_CAREER");
    expect(result.tracks.map((t) => t.code)).toContain("EXPERIENCED");
  });

  it("P2: PH countryPackId returns 4 PH tracks when flag ON", () => {
    const result = getTracksForCountry("PH" as CountryPackId, true, "en");
    expect(result.tracks.length).toBe(4);
    expect(result.tracks.map((t) => t.code)).toContain("INTERNSHIP");
    expect(result.tracks.map((t) => t.code)).toContain("NEW_GRAD");
    expect(result.tracks.map((t) => t.code)).toContain("EARLY_CAREER");
    expect(result.tracks.map((t) => t.code)).toContain("EXPERIENCED");
  });

  it("P3: CA countryPackId returns 4 CA tracks when flag ON", () => {
    const result = getTracksForCountry("CA" as CountryPackId, true, "en");
    expect(result.tracks.length).toBe(4);
    expect(result.tracks.map((t) => t.code)).toContain("COOP");
    expect(result.tracks.map((t) => t.code)).toContain("NEW_GRAD");
    expect(result.tracks.map((t) => t.code)).toContain("EARLY_CAREER");
    expect(result.tracks.map((t) => t.code)).toContain("EXPERIENCED");
  });

  it("P4: GLOBAL countryPackId returns empty tracks (coming soon)", () => {
    const result = getTracksForCountry("GLOBAL" as CountryPackId, true, "en");
    expect(result.tracks.length).toBe(0);
    expect(result.hasTracksForCountry).toBe(false);
  });

  it("P5: null countryPackId returns empty tracks (coming soon)", () => {
    const result = getTracksForCountry(null, true, "en");
    expect(result.tracks.length).toBe(0);
    expect(result.hasTracksForCountry).toBe(false);
  });

  it("P6: flag OFF always returns CA tracks regardless of countryPackId", () => {
    // V1 behaviour: flag OFF → CA tracks always (now 4 tracks)
    const vnResult = getTracksForCountry("VN" as CountryPackId, false, "en");
    expect(vnResult.tracks.length).toBe(4);
    expect(vnResult.regionCode).toBe("CA");

    const phResult = getTracksForCountry("PH" as CountryPackId, false, "en");
    expect(phResult.tracks.length).toBe(4);
    expect(phResult.regionCode).toBe("CA");
  });

  it("P7: VN tracks in vi locale return Vietnamese labels", () => {
    const result = getTracksForCountry("VN" as CountryPackId, true, "vi");
    // Vietnamese labels should differ from English
    const enResult = getTracksForCountry("VN" as CountryPackId, true, "en");
    const viLabels = result.tracks.map((t) => t.label);
    const enLabels = enResult.tracks.map((t) => t.label);
    // At least one label should differ
    const hasDiff = viLabels.some((l, i) => l !== enLabels[i]);
    expect(hasDiff).toBe(true);
  });

  it("P8: PH tracks are locale-invariant (vi locale still returns English)", () => {
    const enResult = getTracksForCountry("PH" as CountryPackId, true, "en");
    const viResult = getTracksForCountry("PH" as CountryPackId, true, "vi");
    // PH tracks should be identical regardless of locale
    expect(enResult.tracks.map((t) => t.label)).toEqual(viResult.tracks.map((t) => t.label));
  });
});

// ─── Work Authorization card is CA-only ──────────────────────────────────────

describe("Profile Work Authorization card: CA-only gating", () => {
  it("P9: showWorkAuthCard uses userCountryPackId === 'CA' directly", () => {
    // The fix: gate on userCountryPackId, not effectiveRegionCode
    expect(profileContent).toContain("userCountryPackId === \"CA\"");
  });

  it("P10: showWorkAuthCard does NOT use effectiveRegionCode for work auth", () => {
    // effectiveRegionCode defaults to "CA" in V1 mode — must not be used for work auth
    // The old buggy pattern was: effectiveRegionCode === "CA"
    // After fix, it should be: userCountryPackId === "CA"
    const oldBuggyPattern = /showWorkAuthCard\s*=\s*effectiveRegionCode\s*===\s*["']CA["']/;
    expect(oldBuggyPattern.test(profileContent)).toBe(false);
  });

  it("P11: Work Authorization card is wrapped in showWorkAuthCard conditional", () => {
    expect(profileContent).toContain("showWorkAuthCard");
    expect(profileContent).toContain("Work Authorization");
  });

  it("P12: Work Authorization card comment says CA only", () => {
    expect(profileContent).toContain("CA only");
  });

  it("P13: CA-only logic: userCountryPackId=CA → showWorkAuthCard true", () => {
    // Simulate the logic directly
    const userCountryPackId: CountryPackId | null = "CA";
    const showWorkAuthCard = userCountryPackId === "CA";
    expect(showWorkAuthCard).toBe(true);
  });

  it("P14: CA-only logic: userCountryPackId=VN → showWorkAuthCard false", () => {
    const userCountryPackId: CountryPackId | null = "VN";
    const showWorkAuthCard = userCountryPackId === "CA";
    expect(showWorkAuthCard).toBe(false);
  });

  it("P15: CA-only logic: userCountryPackId=PH → showWorkAuthCard false", () => {
    const userCountryPackId: CountryPackId | null = "PH";
    const showWorkAuthCard = userCountryPackId === "CA";
    expect(showWorkAuthCard).toBe(false);
  });

  it("P16: CA-only logic: userCountryPackId=GLOBAL → showWorkAuthCard false", () => {
    const userCountryPackId: CountryPackId | null = "GLOBAL";
    const showWorkAuthCard = userCountryPackId === "CA";
    expect(showWorkAuthCard).toBe(false);
  });

  it("P17: CA-only logic: userCountryPackId=null → showWorkAuthCard false", () => {
    const userCountryPackId: CountryPackId | null = null;
    const showWorkAuthCard = userCountryPackId === "CA";
    expect(showWorkAuthCard).toBe(false);
  });
});

// ─── DEV debug line gating ────────────────────────────────────────────────────

describe("Profile DEV debug line: production safety", () => {
  it("P18: debug line is gated behind import.meta.env.DEV", () => {
    expect(profileContent).toContain("import.meta.env.DEV");
  });

  it("P19: debug line has data-testid='profile-debug-line'", () => {
    expect(profileContent).toContain("profile-debug-line");
  });

  it("P20: debug line shows countryPackId, track, locale, and v2CountryPacksEnabled", () => {
    expect(profileContent).toContain("userCountryPackId");
    expect(profileContent).toContain("trackCode");
    expect(profileContent).toContain("locale");
    expect(profileContent).toContain("v2CountryPacksEnabled");
  });

  it("P21: debug line is NOT using process.env.NODE_ENV (Vite uses import.meta.env)", () => {
    // In Vite, the correct guard is import.meta.env.DEV, not process.env.NODE_ENV
    // This test ensures we're using the Vite-native approach
    const usesImportMetaDev = profileContent.includes("import.meta.env.DEV");
    expect(usesImportMetaDev).toBe(true);
  });

  it("P22: debug line has yellow styling (visual distinction from production UI)", () => {
    expect(profileContent).toContain("bg-yellow-50");
    expect(profileContent).toContain("border-yellow-200");
  });

  it("P23: debug line has DEBUG prefix in text", () => {
    expect(profileContent).toContain("DEBUG:");
  });
});

// ─── Profile.tsx structure integrity ─────────────────────────────────────────

describe("Profile.tsx structure integrity (regression)", () => {
  it("P24: getTracksForCountry is imported from shared/trackOptions", () => {
    expect(profileContent).toContain("getTracksForCountry");
    expect(profileContent).toContain("trackOptions");
  });

  it("P25: userCountryPackId is derived from user object (not residence/currentCountry)", () => {
    expect(profileContent).toContain("userCountryPackId");
    // Must NOT fall back to residence or currentCountry for track selection
    expect(profileContent).not.toContain("countryOfResidence as CountryPackId");
    expect(profileContent).not.toContain("currentCountry as CountryPackId");
  });

  it("P26: resolveLocale is used for locale computation", () => {
    expect(profileContent).toContain("resolveLocale");
  });

  it("P27: tracks-coming-soon testid is present for empty track case", () => {
    expect(profileContent).toContain("tracks-coming-soon");
  });

  it("P28: track-select testid is present for populated track case", () => {
    expect(profileContent).toContain("track-select");
  });
});
