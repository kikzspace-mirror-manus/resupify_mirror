/**
 * onboarding-global-normal-flow.test.ts
 *
 * V2 Onboarding — GLOBAL follows normal flow (Country → Career stage → Education → Complete)
 *
 * Tests:
 *   A) Track step renders for GLOBAL (hasTracksForCountry = true)
 *   B) No GLOBAL-specific skip logic in Onboarding.tsx
 *   C) "Tracks coming soon" placeholder is NOT shown for GLOBAL
 *   D) 4 GLOBAL track options are available
 *   E) totalSteps = 3 for GLOBAL (no work auth step)
 *   F) handleCountryPackContinue always advances to step 1 (no GLOBAL bypass)
 *   G) Regression: CA/VN/PH/US flow unaffected
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getTracksForCountry, GLOBAL_TRACKS } from "../shared/trackOptions";

const ONBOARDING_PATH = resolve(__dirname, "../client/src/pages/Onboarding.tsx");
const onboarding = readFileSync(ONBOARDING_PATH, "utf-8");

// ── A: GLOBAL hasTracksForCountry = true ──────────────────────────────────
describe("A — GLOBAL hasTracksForCountry is true (Track step renders)", () => {
  it("A1: getTracksForCountry('GLOBAL', true).hasTracksForCountry is true", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.hasTracksForCountry).toBe(true);
  });

  it("A2: GLOBAL tracks array has exactly 4 entries", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.tracks).toHaveLength(4);
  });

  it("A3: GLOBAL tracks match GLOBAL_TRACKS export", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.tracks).toEqual(GLOBAL_TRACKS);
  });

  it("A4: GLOBAL regionCode is 'GLOBAL' (not 'CA')", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.regionCode).toBe("GLOBAL");
  });

  it("A5: GLOBAL defaultTrack is 'INTERNSHIP'", () => {
    const result = getTracksForCountry("GLOBAL", true);
    expect(result.defaultTrack).toBe("INTERNSHIP");
  });
});

// ── B: No GLOBAL-specific skip logic in Onboarding.tsx ───────────────────
describe("B — No GLOBAL-specific skip logic in Onboarding.tsx", () => {
  it("B1: Onboarding.tsx does not skip step 2 when GLOBAL is selected", () => {
    // There must be no pattern like: if (GLOBAL) setStep(2) or advance past track
    // The only setStep(2) call should be the normal track Continue button
    const skipPattern = /selectedCountryPackId\s*===\s*["']GLOBAL["']\s*[^)]*setStep\s*\(\s*2\s*\)/;
    expect(skipPattern.test(onboarding)).toBe(false);
  });

  it("B2: Onboarding.tsx does not have a GLOBAL-specific step bypass in handleCountryPackContinue", () => {
    // handleCountryPackContinue should always call setStep(1)
    const handleIdx = onboarding.indexOf("handleCountryPackContinue");
    expect(handleIdx).toBeGreaterThan(-1);
    const handleBlock = onboarding.slice(handleIdx, handleIdx + 600);
    // Must contain setStep(1)
    expect(handleBlock).toContain("setStep(1)");
    // Must NOT skip to step 2 for GLOBAL
    expect(handleBlock).not.toMatch(/GLOBAL.*setStep\s*\(\s*2\s*\)/);
  });

  it("B3: Onboarding.tsx does not advance GLOBAL past Track step in any useEffect", () => {
    // No useEffect should contain both GLOBAL and setStep(2)
    const effectPattern = /useEffect[\s\S]{0,2000}GLOBAL[\s\S]{0,200}setStep\s*\(\s*2\s*\)/;
    expect(effectPattern.test(onboarding)).toBe(false);
  });

  it("B4: The auto-skip useEffect only skips Step 0 (advances to step 1), not Step 1", () => {
    // Auto-skip fires when enabledCountryPacks.length === 1 → setStep(1)
    // It must NOT call setStep(2) anywhere
    const autoSkipIdx = onboarding.indexOf("Auto-skip Step 0");
    expect(autoSkipIdx).toBeGreaterThan(-1);
    const autoSkipBlock = onboarding.slice(autoSkipIdx, autoSkipIdx + 1600);
    expect(autoSkipBlock).toContain("setStep(1)");
    expect(autoSkipBlock).not.toMatch(/setStep\s*\(\s*2\s*\)/);
  });
});

// ── C: "Tracks coming soon" is NOT shown for GLOBAL ──────────────────────
describe("C — 'Tracks coming soon' placeholder not shown for GLOBAL", () => {
  it("C1: Track step branches on hasTracksForCountry (not on GLOBAL string)", () => {
    // The JSX must use hasTracksForCountry to decide which branch to render
    expect(onboarding).toContain("hasTracksForCountry ?");
  });

  it("C2: 'Tracks coming soon' placeholder exists in source but is gated by !hasTracksForCountry", () => {
    // The placeholder element must exist (for future unknown regions)
    expect(onboarding).toContain("tracks-coming-soon");
    expect(onboarding).toContain("Tracks coming soon for this region");
  });

  it("C3: Since GLOBAL hasTracksForCountry=true, the track selector renders (not placeholder)", () => {
    // Verify the track-selector testid exists in the source (rendered when hasTracksForCountry=true)
    expect(onboarding).toContain('data-testid="track-selector"');
  });

  it("C4: The 'Tracks coming soon' block is in the else branch (only for hasTracksForCountry=false)", () => {
    const trackSelectorIdx = onboarding.indexOf('data-testid="track-selector"');
    const comingSoonIdx = onboarding.indexOf("tracks-coming-soon");
    // track-selector must appear before tracks-coming-soon (it's in the if branch)
    expect(trackSelectorIdx).toBeLessThan(comingSoonIdx);
  });
});

// ── D: 4 GLOBAL track options ─────────────────────────────────────────────
describe("D — 4 GLOBAL track options with correct labels", () => {
  it("D1: GLOBAL track 0 is INTERNSHIP / Student", () => {
    const tracks = GLOBAL_TRACKS;
    expect(tracks[0].code).toBe("INTERNSHIP");
    expect(tracks[0].label).toBe("Internship / Student");
  });

  it("D2: GLOBAL track 1 is NEW_GRAD", () => {
    const tracks = GLOBAL_TRACKS;
    expect(tracks[1].code).toBe("NEW_GRAD");
    expect(tracks[1].label).toBe("New Graduate");
  });

  it("D3: GLOBAL track 2 is EARLY_CAREER", () => {
    const tracks = GLOBAL_TRACKS;
    expect(tracks[2].code).toBe("EARLY_CAREER");
    expect(tracks[2].label).toBe("Early Career (1–5 years)");
  });

  it("D4: GLOBAL track 3 is EXPERIENCED", () => {
    const tracks = GLOBAL_TRACKS;
    expect(tracks[3].code).toBe("EXPERIENCED");
    expect(tracks[3].label).toBe("Experienced (5+ years)");
  });

  it("D5: All 4 GLOBAL tracks have non-empty sublabels", () => {
    GLOBAL_TRACKS.forEach((track) => {
      expect(track.sublabel).toBeTruthy();
      expect(track.sublabel.length).toBeGreaterThan(5);
    });
  });
});

// ── E: totalSteps = 3 for GLOBAL (no work auth step) ─────────────────────
describe("E — totalSteps = 3 for GLOBAL (no work auth step)", () => {
  it("E1: showWorkAuthStep is false for GLOBAL (not CA or US)", () => {
    // The showWorkAuthStep guard must use selectedCountryPackId, not effectiveRegionCode
    const showWorkAuthIdx = onboarding.indexOf("showWorkAuthStep");
    expect(showWorkAuthIdx).toBeGreaterThan(-1);
    const showWorkAuthDef = onboarding.slice(showWorkAuthIdx, showWorkAuthIdx + 200);
    // Must check for CA or US explicitly
    expect(showWorkAuthDef).toContain('"CA"');
    expect(showWorkAuthDef).toContain('"US"');
    // Must use selectedCountryPackId (not effectiveRegionCode)
    expect(showWorkAuthDef).toContain("selectedCountryPackId");
  });

  it("E2: totalSteps formula gives 3 for GLOBAL (v2=true, showWorkAuth=false)", () => {
    // totalSteps = v2CountryPacksEnabled ? (showWorkAuthStep ? 4 : 3) : (showWorkAuthStep ? 3 : 2)
    // For GLOBAL: v2=true, showWorkAuth=false → 3
    const totalStepsIdx = onboarding.indexOf("totalSteps");
    expect(totalStepsIdx).toBeGreaterThan(-1);
    const totalStepsBlock = onboarding.slice(totalStepsIdx, totalStepsIdx + 200);
    expect(totalStepsBlock).toContain("showWorkAuthStep ? 4 : 3");
  });

  it("E3: Work auth step (step === 3) is gated by showWorkAuthStep", () => {
    // The work auth step must not render for GLOBAL
    expect(onboarding).toContain("step === 3 && showWorkAuthStep");
  });
});

// ── F: handleCountryPackContinue always goes to step 1 ───────────────────
describe("F — handleCountryPackContinue advances to step 1 unconditionally", () => {
  it("F1: handleCountryPackContinue contains setStep(1)", () => {
    const idx = onboarding.indexOf("handleCountryPackContinue");
    const block = onboarding.slice(idx, idx + 600);
    expect(block).toContain("setStep(1)");
  });

  it("F2: handleCountryPackContinue does not branch on GLOBAL", () => {
    const idx = onboarding.indexOf("handleCountryPackContinue");
    const block = onboarding.slice(idx, idx + 600);
    expect(block).not.toContain('"GLOBAL"');
  });

  it("F3: handleCountryPackContinue does not call setStep(2) directly", () => {
    const idx = onboarding.indexOf("handleCountryPackContinue");
    const block = onboarding.slice(idx, idx + 600);
    expect(block).not.toMatch(/setStep\s*\(\s*2\s*\)/);
  });
});

// ── G: Regression — CA/VN/PH/US unaffected ───────────────────────────────
describe("G — Regression: CA/VN/PH/US track step behavior unaffected", () => {
  it("G1: CA returns hasTracksForCountry=true with 4 tracks", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("CA");
  });

  it("G2: VN returns hasTracksForCountry=true with 4 tracks", () => {
    const result = getTracksForCountry("VN", true);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("VN");
  });

  it("G3: PH returns hasTracksForCountry=true with 4 tracks", () => {
    const result = getTracksForCountry("PH", true);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("PH");
  });

  it("G4: US returns hasTracksForCountry=true with 4 tracks", () => {
    const result = getTracksForCountry("US", true);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("US");
  });

  it("G5: V1 (flag OFF) still returns CA tracks for all packs including GLOBAL", () => {
    const result = getTracksForCountry("GLOBAL", false);
    expect(result.regionCode).toBe("CA");
    expect(result.tracks).toHaveLength(4);
  });

  it("G6: CA COOP track is still present in CA tracks", () => {
    const result = getTracksForCountry("CA", true);
    const coopTrack = result.tracks.find((t) => t.code === "COOP");
    expect(coopTrack).toBeDefined();
    expect(coopTrack!.label).toBeTruthy();
  });
});
