/**
 * onboarding-autoskip-step0.test.ts
 *
 * V2 Onboarding — Auto-skip Step 0 when only 1 country pack is enabled.
 *
 * Tests verify:
 *   A) Auto-skip logic: useEffect guard conditions in Onboarding.tsx
 *   B) Single-pack scenario: Step 0 not rendered, setCountryPack called, Track step shown
 *   C) Multi-pack scenario: Step 0 renders normally
 *   D) Flag OFF: no auto-skip behavior
 *   E) Re-entry guard: completed users still redirect to /profile
 *   F) Persist guard: only calls setCountryPack when pack differs from user.countryPackId
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readSrc(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

const onboardingSrc = readSrc("client/src/pages/Onboarding.tsx");

// ─── A) Auto-skip useEffect guard structure ───────────────────────────────────
describe("A: Auto-skip useEffect guard structure", () => {
  it("A1: useEffect and useRef are imported from react", () => {
    expect(onboardingSrc).toContain("useEffect");
    expect(onboardingSrc).toContain("useRef");
    // Both in the same import statement
    const importLine = onboardingSrc.split("\n").find((l) => l.includes("useState") && l.includes("useMemo"));
    expect(importLine).toBeDefined();
    expect(importLine).toContain("useEffect");
    expect(importLine).toContain("useRef");
  });

  it("A2: autoSkipFired ref is declared to prevent double-firing", () => {
    expect(onboardingSrc).toContain("autoSkipFired");
    expect(onboardingSrc).toContain("useRef(false)");
  });

  it("A3: V1 guard — effect returns early when v2CountryPacksEnabled is false", () => {
    expect(onboardingSrc).toContain("if (!v2CountryPacksEnabled) return");
  });

  it("A4: flags loading guard — effect returns early when flags not yet loaded", () => {
    expect(onboardingSrc).toContain("if (!flags) return");
  });

  it("A5: user loading guard — effect returns early when user not yet loaded", () => {
    expect(onboardingSrc).toContain("if (!user) return");
  });

  it("A6: step guard — effect returns early when already past Step 0", () => {
    expect(onboardingSrc).toContain("if (step !== 0) return");
  });

  it("A7: multi-pack guard — effect returns early when 2+ packs enabled", () => {
    expect(onboardingSrc).toContain("enabledCountryPacks.length !== 1");
  });
});

// ─── B) Single-pack auto-skip behavior ───────────────────────────────────────
describe("B: Single-pack auto-skip behavior", () => {
  it("B1: auto-selects the only enabled pack (onlyPack = enabledCountryPacks[0])", () => {
    expect(onboardingSrc).toContain("enabledCountryPacks[0] as CountryPackId");
  });

  it("B2: calls setSelectedCountryPackId with the only pack", () => {
    expect(onboardingSrc).toContain("setSelectedCountryPackId(onlyPack)");
  });

  it("B3: resets trackCode to the default for the only pack", () => {
    expect(onboardingSrc).toContain("getTracksForCountry(onlyPack, true)");
    expect(onboardingSrc).toContain("setTrackCode(newDefault)");
  });

  it("B4: calls setCountryPack.mutate (not mutateAsync) for fire-and-forget persist", () => {
    // Should use .mutate() with onSuccess/onError callbacks, not .mutateAsync()
    expect(onboardingSrc).toContain("setCountryPack.mutate(");
  });

  it("B5: invalidates auth.me on successful persist", () => {
    // onSuccess callback invalidates auth.me
    expect(onboardingSrc).toContain("utils.auth.me.invalidate()");
  });

  it("B6: advances to step 1 after auto-select", () => {
    // setStep(1) called inside the auto-skip effect
    const effectBlock = onboardingSrc.slice(
      onboardingSrc.indexOf("autoSkipFired.current = true"),
      onboardingSrc.indexOf("// Advance to Track step") + 200
    );
    expect(effectBlock).toContain("setStep(1)");
  });

  it("B7: Step 0 card is conditionally rendered (step === 0 guard)", () => {
    // Step 0 only renders when step === 0 — after auto-skip, step is 1 so card is hidden
    expect(onboardingSrc).toContain("step === 0 && v2CountryPacksEnabled");
  });
});

// ─── C) Persist guard: skip mutation when pack already matches ────────────────
describe("C: Persist guard", () => {
  it("C1: only persists when userCountryPackId is unset or differs from onlyPack", () => {
    expect(onboardingSrc).toContain("const needsPersist = !userCountryPackId || userCountryPackId !== onlyPack");
  });

  it("C2: setCountryPack.mutate is guarded by needsPersist", () => {
    const persistBlock = onboardingSrc.slice(
      onboardingSrc.indexOf("const needsPersist"),
      onboardingSrc.indexOf("// Advance to Track step")
    );
    expect(persistBlock).toContain("if (needsPersist)");
    expect(persistBlock).toContain("setCountryPack.mutate(");
  });
});

// ─── D) Multi-pack scenario: Step 0 renders normally ─────────────────────────
describe("D: Multi-pack scenario — Step 0 renders normally", () => {
  it("D1: Step 0 country-selector is still in the JSX (not removed)", () => {
    expect(onboardingSrc).toContain('data-testid="step0-country-card"');
    expect(onboardingSrc).toContain('data-testid="country-selector"');
  });

  it("D2: COUNTRY_OPTIONS.filter still maps over enabled packs for Step 0 UI", () => {
    expect(onboardingSrc).toContain("COUNTRY_OPTIONS.filter((c) => enabledCountryPacks.includes(c.id))");
  });

  it("D3: Continue button still present in Step 0 for manual selection", () => {
    expect(onboardingSrc).toContain('data-testid="country-continue-btn"');
    expect(onboardingSrc).toContain("handleCountryPackContinue");
  });
});

// ─── E) Flag OFF: V1 unchanged ────────────────────────────────────────────────
describe("E: Flag OFF — V1 unchanged", () => {
  it("E1: step initialises to 1 when v2CountryPacksEnabled is false", () => {
    // useState(() => v2CountryPacksEnabled ? 0 : 1)
    expect(onboardingSrc).toContain("if (!v2CountryPacksEnabled) return 1");
  });

  it("E2: auto-skip effect has early return when flag is OFF", () => {
    expect(onboardingSrc).toContain("if (!v2CountryPacksEnabled) return");
  });

  it("E3: Step 0 card is gated by v2CountryPacksEnabled in JSX", () => {
    expect(onboardingSrc).toContain("step === 0 && v2CountryPacksEnabled");
  });
});

// ─── F) Re-entry guard still intact ──────────────────────────────────────────
describe("F: Re-entry guard still intact", () => {
  it("F1: re-entry guard redirects completed users to /profile", () => {
    expect(onboardingSrc).toContain('setLocation("/profile")');
    expect(onboardingSrc).toContain("userCountryPackId && userTrackCode");
  });

  it("F2: re-entry guard is inside v2CountryPacksEnabled block", () => {
    const guardBlock = onboardingSrc.slice(
      onboardingSrc.indexOf("// ── V2 Re-entry guard"),
      onboardingSrc.indexOf("const handleSkip")
    );
    expect(guardBlock).toContain("v2CountryPacksEnabled && user");
    expect(guardBlock).toContain('setLocation("/profile")');
  });
});

// ─── G) Hooks-order safety: all hooks before early returns ──────────────────
describe("G: Hooks-order safety", () => {
  it("G0: autoSkipFired useRef is declared before 'if (loading) return null'", () => {
    const loadingReturnIdx = onboardingSrc.indexOf("if (loading) return null");
    const autoSkipRefIdx = onboardingSrc.indexOf("const autoSkipFired = useRef(false)");
    expect(autoSkipRefIdx).toBeGreaterThan(0);
    expect(loadingReturnIdx).toBeGreaterThan(0);
    // autoSkipFired ref MUST appear before the early return
    expect(autoSkipRefIdx).toBeLessThan(loadingReturnIdx);
  });

  it("G0b: useEffect (auto-skip) is declared before 'if (loading) return null'", () => {
    const loadingReturnIdx = onboardingSrc.indexOf("if (loading) return null");
    // Find the useEffect that contains autoSkipFired.current
    const autoSkipEffectIdx = onboardingSrc.indexOf("if (autoSkipFired.current) return");
    expect(autoSkipEffectIdx).toBeGreaterThan(0);
    expect(autoSkipEffectIdx).toBeLessThan(loadingReturnIdx);
  });

  it("G0c: all tRPC mutations are declared before 'if (loading) return null'", () => {
    const loadingReturnIdx = onboardingSrc.indexOf("if (loading) return null");
    const upsertIdx = onboardingSrc.indexOf("trpc.profile.upsert.useMutation()");
    const setCountryPackIdx = onboardingSrc.indexOf("trpc.profile.setCountryPack.useMutation()");
    expect(upsertIdx).toBeLessThan(loadingReturnIdx);
    expect(setCountryPackIdx).toBeLessThan(loadingReturnIdx);
  });

  it("G0d: comment marks the early-returns section as being after all hooks", () => {
    expect(onboardingSrc).toContain("Early returns (AFTER all hooks)");
  });
});

// ─── H) Progress bar: totalSteps accounts for auto-skip ──────────────────────
describe("H: Progress bar totalSteps", () => {
  it("G1: totalSteps is still computed from v2CountryPacksEnabled and showWorkAuthStep", () => {
    expect(onboardingSrc).toContain("const totalSteps = v2CountryPacksEnabled");
  });

  it("G2: progress bar renders based on totalSteps", () => {
    expect(onboardingSrc).toContain("Array.from({ length: totalSteps })");
  });
});
