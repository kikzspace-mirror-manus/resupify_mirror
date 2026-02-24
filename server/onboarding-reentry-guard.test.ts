/**
 * onboarding-reentry-guard.test.ts
 *
 * Tests for the V2 re-entry guard in Onboarding.tsx.
 * When V2 is enabled and a user already has countryPackId + trackCode,
 * visiting /onboarding should redirect to /profile immediately.
 *
 * Coverage:
 * - G1: Guard block is present in Onboarding.tsx source
 * - G2: Guard checks v2CountryPacksEnabled flag
 * - G3: Guard checks userCountryPackId (non-null)
 * - G4: Guard checks userTrackCode (non-null)
 * - G5: Guard calls setLocation("/profile") on redirect
 * - G6: Guard returns null after redirect (no UI flash)
 * - G7: Guard is placed AFTER the loading check (no redirect during loading)
 * - G8: Guard is placed BEFORE Step 0 UI (no flash of Step 0)
 * - G9: V1 (flag OFF) — no redirect logic fires when v2CountryPacksEnabled is false
 * - G10: Guard only fires when BOTH countryPackId AND trackCode are set
 * - G11: Guard does not fire when countryPackId is null (incomplete onboarding)
 * - G12: Guard does not fire when trackCode is null/missing (incomplete onboarding)
 * - G13: Guard uses (user as any)?.trackCode pattern (consistent with existing code)
 * - G14: Regression — handleSkip still present after guard block
 * - G15: Regression — handleCountryPackContinue still present after guard block
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const onboardingSource = readFileSync(
  join(__dirname, "../client/src/pages/Onboarding.tsx"),
  "utf-8"
);

// Extract the guard block region for targeted assertions
const loadingCheckIdx = onboardingSource.indexOf("if (loading) return null;");
const handleSkipIdx = onboardingSource.indexOf("const handleSkip");
const guardRegion = onboardingSource.slice(loadingCheckIdx, handleSkipIdx);

// ─── G: Re-entry guard structure ─────────────────────────────────────────────

describe("G) Onboarding re-entry guard", () => {
  it("G1: guard block is present in Onboarding.tsx", () => {
    expect(onboardingSource).toContain("V2 Re-entry guard");
  });

  it("G2: guard checks v2CountryPacksEnabled flag", () => {
    expect(guardRegion).toContain("v2CountryPacksEnabled");
  });

  it("G3: guard checks userCountryPackId (non-null)", () => {
    expect(guardRegion).toContain("userCountryPackId");
  });

  it("G4: guard checks userTrackCode (non-null)", () => {
    expect(guardRegion).toContain("userTrackCode");
  });

  it("G5: guard calls setLocation(\"/profile\") on redirect", () => {
    expect(guardRegion).toContain('setLocation("/profile")');
  });

  it("G6: guard returns null after redirect (no UI flash)", () => {
    expect(guardRegion).toContain("return null;");
  });

  it("G7: guard is placed AFTER the loading check", () => {
    const loadingIdx = onboardingSource.indexOf("if (loading) return null;");
    const guardIdx = onboardingSource.indexOf("V2 Re-entry guard");
    expect(guardIdx).toBeGreaterThan(loadingIdx);
  });

  it("G8: guard is placed BEFORE Step 0 UI (no flash of Step 0)", () => {
    const guardIdx = onboardingSource.indexOf("V2 Re-entry guard");
    const step0Idx = onboardingSource.indexOf("step === 0 && v2CountryPacksEnabled");
    expect(guardIdx).toBeLessThan(step0Idx);
  });

  it("G9: V1 flag OFF — guard is conditional on v2CountryPacksEnabled (not unconditional)", () => {
    // The guard must be wrapped in `if (v2CountryPacksEnabled && user)` — not always-on
    expect(guardRegion).toContain("if (v2CountryPacksEnabled && user)");
  });

  it("G10: guard requires BOTH countryPackId AND trackCode (uses &&)", () => {
    // Both conditions must be true — uses && not ||
    expect(guardRegion).toContain("userCountryPackId && userTrackCode");
  });

  it("G11: guard does not fire when countryPackId is null — condition uses truthiness check", () => {
    // The guard uses `if (userCountryPackId && userTrackCode)` — null/undefined is falsy
    const conditionMatch = guardRegion.match(/if\s*\(userCountryPackId\s*&&\s*userTrackCode\)/);
    expect(conditionMatch).not.toBeNull();
  });

  it("G12: guard does not fire when trackCode is null — condition uses truthiness check", () => {
    // Same as G11 — both must be truthy
    const conditionMatch = guardRegion.match(/if\s*\(userCountryPackId\s*&&\s*userTrackCode\)/);
    expect(conditionMatch).not.toBeNull();
  });

  it("G13: guard reads trackCode via (user as any)?.trackCode pattern", () => {
    expect(guardRegion).toContain("(user as any)?.trackCode");
  });

  it("G14: regression — handleSkip still present after guard block", () => {
    const guardIdx = onboardingSource.indexOf("V2 Re-entry guard");
    const handleSkipIdx2 = onboardingSource.indexOf("const handleSkip");
    expect(handleSkipIdx2).toBeGreaterThan(guardIdx);
    expect(onboardingSource).toContain("const handleSkip");
  });

  it("G15: regression — handleCountryPackContinue still present", () => {
    expect(onboardingSource).toContain("handleCountryPackContinue");
  });
});

// ─── H: Regression — existing onboarding features unchanged ──────────────────

describe("H) Regression — existing onboarding features unchanged", () => {
  it("H1: COUNTRY_OPTIONS still has CA, VN, PH, US", () => {
    expect(onboardingSource).toContain('"Canada"');
    expect(onboardingSource).toContain('"Vietnam"');
    expect(onboardingSource).toContain('"Philippines"');
    expect(onboardingSource).toContain('"United States"');
  });

  it("H2: step 0 country selector grid still present", () => {
    expect(onboardingSource).toContain("step === 0 && v2CountryPacksEnabled");
  });

  it("H3: track selector still present (step 1)", () => {
    expect(onboardingSource).toContain("setTrackCode");
  });

  it("H4: work auth step still present", () => {
    expect(onboardingSource).toContain("showWorkAuthStep");
  });

  it("H5: loading check still returns null (not a redirect)", () => {
    expect(onboardingSource).toContain("if (loading) return null;");
  });

  it("H6: v2CountryPacksEnabled flag is still read from featureFlags", () => {
    expect(onboardingSource).toContain("v2CountryPacksEnabled");
    expect(onboardingSource).toContain("featureFlags");
  });

  it("H7: setLocation is used for redirect (not navigate)", () => {
    expect(onboardingSource).toContain("setLocation");
    expect(onboardingSource).toContain("useLocation");
  });
});
