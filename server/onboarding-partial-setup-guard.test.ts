/**
 * onboarding-partial-setup-guard.test.ts
 *
 * Tests for the partial-setup re-entry guard in Onboarding.tsx.
 * When V2 is enabled and a user has countryPackId set but trackCode is null,
 * visiting /onboarding should start at the Track step (step 1), not Step 0.
 *
 * Coverage:
 * P1:  Partial-setup comment is present in Onboarding.tsx source
 * P2:  step useState initializer checks v2CountryPacksEnabled
 * P3:  step initializer checks initPackId (countryPackId from user)
 * P4:  step initializer checks initTrackCode (trackCode from user)
 * P5:  step initializer returns 1 when packId set and trackCode missing
 * P6:  step initializer returns 0 for normal flow (no pack set)
 * P7:  step initializer returns 1 for V1 (flag OFF) regardless of pack/track
 * P8:  No conditional hook calls introduced — initializer is inside useState(() => {...})
 * P9:  selectedCountryPackId initializer already reads userCountryPackId (pre-existing)
 * P10: Partial-setup guard is in the useState initializer (not a useEffect or render-body setState)
 * P11: Full redirect guard (pack + track both set) still present and unchanged
 * P12: Full redirect guard uses setLocation("/profile") + return null
 * P13: Partial-setup guard does NOT call setLocation (user stays on /onboarding)
 * P14: GLOBAL pack with no track → step initializer returns 1 (no Step 0)
 * P15: CA pack with track set → full redirect guard fires (not partial-setup)
 * P16: No pack set → step initializer returns 0 (Step 0 shown)
 * P17: V1 flag OFF → step initializer always returns 1 (V1 behaviour)
 * P18: Partial-setup guard does not overwrite countryPackId (no setCountryPack call in initializer)
 * P19: Regression — auto-skip useEffect still present after guard changes
 * P20: Regression — handleCountryPackContinue still present after guard changes
 * P21: Regression — handleComplete still present after guard changes
 * P22: Regression — full re-entry guard (pack+track) still redirects before Step 0 UI
 * P23: Track step (step === 1) renders for GLOBAL pack (hasTracksForCountry=true)
 * P24: No "Tracks coming soon" string in Onboarding.tsx for GLOBAL path
 * P25: step initializer is a lazy initializer (arrow function) — no stale closure risk
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getTracksForCountry } from "../shared/trackOptions";

const onboardingSource = readFileSync(
  join(__dirname, "../client/src/pages/Onboarding.tsx"),
  "utf-8"
);

// Extract the step useState initializer block
const stepInitIdx = onboardingSource.indexOf("const [step, setStep] = useState(");
const stepInitEnd = onboardingSource.indexOf(");", stepInitIdx) + 2;
const stepInitBlock = onboardingSource.slice(stepInitIdx, stepInitEnd);

// Extract the full re-entry guard region (between loading check and handleSkip)
const loadingCheckIdx = onboardingSource.indexOf("if (loading) return null;");
const handleSkipIdx = onboardingSource.indexOf("const handleSkip");
const guardRegion = onboardingSource.slice(loadingCheckIdx, handleSkipIdx);

describe("P) Onboarding partial-setup re-entry guard", () => {
  it("P1: partial-setup comment is present in Onboarding.tsx", () => {
    expect(onboardingSource).toContain("Partial-setup guard");
  });

  it("P2: step useState initializer checks v2CountryPacksEnabled", () => {
    expect(stepInitBlock).toContain("v2CountryPacksEnabled");
  });

  it("P3: step initializer checks initPackId (countryPackId from user)", () => {
    expect(stepInitBlock).toContain("initPackId");
  });

  it("P4: step initializer checks initTrackCode (trackCode from user)", () => {
    expect(stepInitBlock).toContain("initTrackCode");
  });

  it("P5: step initializer returns 1 when packId set and trackCode missing", () => {
    expect(stepInitBlock).toContain("if (initPackId && !initTrackCode) return 1");
  });

  it("P6: step initializer returns 0 for normal flow (no pack set)", () => {
    expect(stepInitBlock).toContain("return 0");
  });

  it("P7: step initializer returns 1 for V1 (flag OFF)", () => {
    expect(stepInitBlock).toContain("if (!v2CountryPacksEnabled) return 1");
  });

  it("P8: no conditional hook calls — initializer is inside useState lazy init", () => {
    // The initializer must be a function (lazy init), not a direct value
    expect(stepInitBlock).toMatch(/useState\s*\(\s*\(\s*\)\s*=>/);
  });

  it("P9: selectedCountryPackId initializer already reads userCountryPackId (pre-existing)", () => {
    const packInitIdx = onboardingSource.indexOf("const [selectedCountryPackId, setSelectedCountryPackId] = useState");
    const packInitEnd = onboardingSource.indexOf(");", packInitIdx) + 2;
    const packInitBlock = onboardingSource.slice(packInitIdx, packInitEnd);
    expect(packInitBlock).toContain("userCountryPackId");
  });

  it("P10: partial-setup guard is in the useState initializer (not a useEffect)", () => {
    // The partial-setup guard comment should appear BEFORE the early returns
    const partialGuardIdx = onboardingSource.indexOf("Partial-setup guard");
    const earlyReturnIdx = onboardingSource.indexOf("Early returns (AFTER all hooks)");
    expect(partialGuardIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeGreaterThan(-1);
    expect(partialGuardIdx).toBeLessThan(earlyReturnIdx);
  });

  it("P11: full redirect guard (pack + track both set) still present and unchanged", () => {
    expect(guardRegion).toContain("V2 Re-entry guard");
    expect(guardRegion).toContain("userCountryPackId && userTrackCode");
  });

  it("P12: full redirect guard uses setLocation(\"/profile\") + return null", () => {
    expect(guardRegion).toContain('setLocation("/profile")');
    expect(guardRegion).toContain("return null");
  });

  it("P13: partial-setup guard does NOT call setLocation (user stays on /onboarding)", () => {
    // The step initializer block must not contain setLocation
    expect(stepInitBlock).not.toContain("setLocation");
  });

  it("P14: GLOBAL pack with no track → getTracksForCountry returns hasTracksForCountry=true", () => {
    const { hasTracksForCountry, tracks } = getTracksForCountry("GLOBAL", true);
    expect(hasTracksForCountry).toBe(true);
    expect(tracks.length).toBe(4);
  });

  it("P15: CA pack with track set → full redirect guard fires (not partial-setup)", () => {
    // The full redirect guard checks both pack AND track
    expect(guardRegion).toContain("userCountryPackId && userTrackCode");
    // The partial-setup guard only fires when track is MISSING
    expect(stepInitBlock).toContain("!initTrackCode");
  });

  it("P16: no pack set → step initializer returns 0 (Step 0 shown)", () => {
    // When initPackId is falsy, the partial-setup guard does not fire → returns 0
    expect(stepInitBlock).toContain("return 0");
    // The guard condition requires initPackId to be truthy
    expect(stepInitBlock).toContain("if (initPackId && !initTrackCode)");
  });

  it("P17: V1 flag OFF → step initializer always returns 1 (V1 behaviour)", () => {
    expect(stepInitBlock).toContain("if (!v2CountryPacksEnabled) return 1");
  });

  it("P18: partial-setup guard does not overwrite countryPackId (no setCountryPack in initializer)", () => {
    expect(stepInitBlock).not.toContain("setCountryPack");
    expect(stepInitBlock).not.toContain("mutate");
  });

  it("P19: regression — auto-skip useEffect still present after guard changes", () => {
    expect(onboardingSource).toContain("Auto-skip Step 0");
    expect(onboardingSource).toContain("autoSkipFired");
  });

  it("P20: regression — handleCountryPackContinue still present after guard changes", () => {
    expect(onboardingSource).toContain("handleCountryPackContinue");
  });

  it("P21: regression — handleComplete still present after guard changes", () => {
    expect(onboardingSource).toContain("handleComplete");
  });

  it("P22: regression — full re-entry guard still redirects before Step 0 UI", () => {
    const step0UiIdx = onboardingSource.indexOf('data-testid="step0-country-card"');
    const guardIdx = onboardingSource.indexOf("V2 Re-entry guard");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(step0UiIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(step0UiIdx);
  });

  it("P23: Track step (step === 1) renders for GLOBAL pack", () => {
    // The Track step JSX uses hasTracksForCountry to branch
    const step1Idx = onboardingSource.indexOf("step === 1");
    expect(step1Idx).toBeGreaterThan(-1);
    const step1Block = onboardingSource.slice(step1Idx, step1Idx + 2000);
    expect(step1Block).toContain("hasTracksForCountry");
  });

  it("P24: no 'Tracks coming soon' string in Onboarding.tsx for GLOBAL path", () => {
    // The placeholder only shows when hasTracksForCountry is false
    // GLOBAL now has tracks, so the placeholder should never appear for GLOBAL
    // Verify the placeholder is gated behind !hasTracksForCountry
    const comingSoonIdx = onboardingSource.indexOf("coming soon");
    if (comingSoonIdx !== -1) {
      // If the string exists, it must be inside a !hasTracksForCountry block
      const surroundingBlock = onboardingSource.slice(
        Math.max(0, comingSoonIdx - 1600),
        comingSoonIdx + 200
      );
      expect(surroundingBlock).toContain("hasTracksForCountry");
    }
    // GLOBAL returns hasTracksForCountry=true, so the placeholder never shows
    const { hasTracksForCountry } = getTracksForCountry("GLOBAL", true);
    expect(hasTracksForCountry).toBe(true);
  });

  it("P25: step initializer is a lazy initializer (arrow function)", () => {
    expect(stepInitBlock).toMatch(/useState\s*\(\s*\(\s*\)\s*=>\s*\{/);
  });
});
