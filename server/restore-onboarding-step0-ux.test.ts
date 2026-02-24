/**
 * Restore 2/2: Onboarding Step 0 UX + Track Labels Tests
 *
 * Tests that:
 * A) Step 0 helper copy is updated to "Choose your main job market..."
 * B) Step 0 country cards do NOT render sublabel paragraphs
 * C) Step 0 filters country cards by enabledCountryPacks from featureFlags
 * D) Step 0 grid layout class is computed correctly for 1–5 packs
 * E) Track labels for VN/PH do NOT include country prefixes
 * F) GLOBAL and US are present as options in COUNTRY_OPTIONS
 * G) Auto-skip logic: when enabledCountryPacks.length === 1, Step 0 is skipped
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");

// ─── A) Step 0 helper copy ────────────────────────────────────────────────────
describe("A) Step 0 helper copy is updated", () => {
  const onboardingContent = fs.readFileSync(
    path.join(ROOT, "client/src/pages/Onboarding.tsx"),
    "utf-8"
  );

  it("A1: Step 0 CardDescription does NOT contain 'eligibility checks'", () => {
    // Find the Step 0 section (starts with "Where are you applying?")
    const step0Idx = onboardingContent.indexOf("Where are you applying?");
    expect(step0Idx).toBeGreaterThan(-1);
    const step0Section = onboardingContent.slice(step0Idx, step0Idx + 500);
    expect(step0Section).not.toMatch(/eligibility checks/);
  });

  it("A2: Step 0 CardDescription contains 'Choose your main job market'", () => {
    const step0Idx = onboardingContent.indexOf("Where are you applying?");
    const step0Section = onboardingContent.slice(step0Idx, step0Idx + 500);
    expect(step0Section).toMatch(/Choose your main job market/);
  });

  it("A3: Step 0 CardDescription contains 'personalize the next steps'", () => {
    const step0Idx = onboardingContent.indexOf("Where are you applying?");
    const step0Section = onboardingContent.slice(step0Idx, step0Idx + 500);
    expect(step0Section).toMatch(/personalize the next steps/);
  });
});

// ─── B) Step 0 country cards do NOT render sublabel ────────────────────────────
describe("B) Step 0 country cards do NOT render sublabel", () => {
  const onboardingContent = fs.readFileSync(
    path.join(ROOT, "client/src/pages/Onboarding.tsx"),
    "utf-8"
  );

  it("B1: Step 0 RadioGroup section does NOT render country.sublabel", () => {
    // Find the Step 0 country selector section
    const step0Idx = onboardingContent.indexOf("country-selector");
    expect(step0Idx).toBeGreaterThan(-1);
    const step0Section = onboardingContent.slice(step0Idx, step0Idx + 2000);
    // Should NOT have {country.sublabel} in the Step 0 section
    expect(step0Section).not.toMatch(/\{country\.sublabel\}/);
  });

  it("B2: Step 0 country card only renders flag and label", () => {
    const step0Idx = onboardingContent.indexOf("country-selector");
    const step0Section = onboardingContent.slice(step0Idx, step0Idx + 2000);
    // Should render flag
    expect(step0Section).toMatch(/\{country\.flag\}/);
    // Should render label
    expect(step0Section).toMatch(/\{country\.label\}/);
  });
});

// ─── C) Step 0 filters by enabledCountryPacks ─────────────────────────────────
describe("C) Step 0 filters country cards by enabledCountryPacks", () => {
  const onboardingContent = fs.readFileSync(
    path.join(ROOT, "client/src/pages/Onboarding.tsx"),
    "utf-8"
  );

  it("C1: enabledCountryPacks is extracted from featureFlags", () => {
    expect(onboardingContent).toMatch(/enabledCountryPacks.*flags\?\.enabledCountryPacks/);
  });

  it("C2: filteredCountries filters COUNTRY_OPTIONS by enabledCountryPacks", () => {
    expect(onboardingContent).toMatch(/filteredCountries.*COUNTRY_OPTIONS\.filter/);
    expect(onboardingContent).toMatch(/enabledCountryPacks\.includes/);
  });

  it("C3: RadioGroup maps over filteredCountries, not COUNTRY_OPTIONS", () => {
    const step0Idx = onboardingContent.indexOf("country-selector");
    const step0Section = onboardingContent.slice(step0Idx, step0Idx + 1500);
    expect(step0Section).toMatch(/filteredCountries\.map/);
  });
});

// ─── D) Step 0 grid layout class computation ──────────────────────────────────
describe("D) Step 0 grid layout class is computed for 1–5 packs", () => {
  const onboardingContent = fs.readFileSync(
    path.join(ROOT, "client/src/pages/Onboarding.tsx"),
    "utf-8"
  );

  it("D1: gridClass is computed based on filteredCountries.length", () => {
    expect(onboardingContent).toMatch(/gridClass.*filteredCountries\.length/);
  });

  it("D2: 1 pack → grid-cols-1 justify-center", () => {
    expect(onboardingContent).toMatch(/grid-cols-1 justify-center/);
  });

  it("D3: 2 packs → grid-cols-2", () => {
    expect(onboardingContent).toMatch(/grid-cols-2 gap-4/);
  });

  it("D4: 3 packs → grid-cols-3", () => {
    expect(onboardingContent).toMatch(/grid-cols-3 gap-4/);
  });

  it("D5: 4 packs → grid-cols-2 sm:grid-cols-4", () => {
    expect(onboardingContent).toMatch(/grid-cols-2 sm:grid-cols-4 gap-4/);
  });

  it("D6: 5 packs → grid-cols-2 sm:grid-cols-3 md:grid-cols-5", () => {
    expect(onboardingContent).toMatch(/grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4/);
  });

  it("D7: gridClass is passed to RadioGroup className", () => {
    expect(onboardingContent).toMatch(/className=\{gridClass\}/);
  });
});

// ─── E) Track labels do NOT include country prefixes ──────────────────────────
describe("E) Track labels for VN/PH do NOT include country prefixes", () => {
  const trackOptionsContent = fs.readFileSync(
    path.join(ROOT, "shared/trackOptions.ts"),
    "utf-8"
  );

  it("E1: VN_TRACKS labels do NOT contain 'Vietnam —'", () => {
    const vnTracksIdx = trackOptionsContent.indexOf("export const VN_TRACKS");
    const vnTracksSection = trackOptionsContent.slice(vnTracksIdx, vnTracksIdx + 800);
    expect(vnTracksSection).not.toMatch(/Vietnam \u2014/);
  });

  it("E2: PH_TRACKS labels do NOT contain 'Philippines —'", () => {
    const phTracksIdx = trackOptionsContent.indexOf("export const PH_TRACKS");
    const phTracksSection = trackOptionsContent.slice(phTracksIdx, phTracksIdx + 800);
    expect(phTracksSection).not.toMatch(/Philippines \u2014/);
  });

  it("E3: VN_TRACKS_VI labels do NOT contain 'Việt Nam —'", () => {
    const viTracksIdx = trackOptionsContent.indexOf("export const VN_TRACKS_VI");
    const viTracksSection = trackOptionsContent.slice(viTracksIdx, viTracksIdx + 800);
    expect(viTracksSection).not.toMatch(/Vi\u1ec7t Nam \u2014/);
  });

  it("E4: VN_TRACKS has 'Internship / Student' (no prefix)", () => {
    const vnTracksIdx = trackOptionsContent.indexOf("export const VN_TRACKS");
    const vnTracksSection = trackOptionsContent.slice(vnTracksIdx, vnTracksIdx + 800);
    expect(vnTracksSection).toMatch(/label: \"Internship \/ Student\"/);
  });

  it("E5: PH_TRACKS has 'New Graduate' (no prefix)", () => {
    const phTracksIdx = trackOptionsContent.indexOf("export const PH_TRACKS");
    const phTracksSection = trackOptionsContent.slice(phTracksIdx, phTracksIdx + 800);
    expect(phTracksSection).toMatch(/label: \"New Graduate\"/);
  });

  it("E6: CA_TRACKS labels are unchanged (no prefix to remove)", () => {
    const caTracksIdx = trackOptionsContent.indexOf("export const CA_TRACKS");
    const caTracksSection = trackOptionsContent.slice(caTracksIdx, caTracksIdx + 500);
    // CA should still have its original labels
    expect(caTracksSection).toMatch(/label: \"Student \/ Co-op\"/);
  });
});

// ─── F) GLOBAL and US are present in COUNTRY_OPTIONS ────────────────────────────
describe("F) GLOBAL and US are present as options", () => {
  const onboardingContent = fs.readFileSync(
    path.join(ROOT, "client/src/pages/Onboarding.tsx"),
    "utf-8"
  );

  it("F1: COUNTRY_OPTIONS includes GLOBAL", () => {
    expect(onboardingContent).toMatch(/id: \"GLOBAL\"/);
  });

  it("F2: COUNTRY_OPTIONS includes US", () => {
    expect(onboardingContent).toMatch(/id: \"US\"/);
  });

  it("F3: GLOBAL has label 'Global'", () => {
    const globalIdx = onboardingContent.indexOf('id: "GLOBAL"');
    const globalSection = onboardingContent.slice(globalIdx, globalIdx + 200);
    expect(globalSection).toMatch(/label: \"Global\"/);
  });

  it("F4: US has label 'United States'", () => {
    const usIdx = onboardingContent.indexOf('id: "US"');
    const usSection = onboardingContent.slice(usIdx, usIdx + 200);
    expect(usSection).toMatch(/label: \"United States\"/);
  });

  it("F5: COUNTRY_OPTIONS order is GLOBAL, CA, VN, PH, US", () => {
    const optionsIdx = onboardingContent.indexOf("const COUNTRY_OPTIONS");
    const optionsSection = onboardingContent.slice(optionsIdx, optionsIdx + 2000);
    const globalPos = optionsSection.indexOf('id: "GLOBAL"');
    const caPos = optionsSection.indexOf('id: "CA"');
    const vnPos = optionsSection.indexOf('id: "VN"');
    const phPos = optionsSection.indexOf('id: "PH"');
    const usPos = optionsSection.indexOf('id: "US"');
    expect(globalPos < caPos && caPos < vnPos && vnPos < phPos && phPos < usPos).toBe(true);
  });
});

// ─── G) Auto-skip logic when enabledCountryPacks.length === 1 ──────────────────
describe("G) Auto-skip Step 0 when only 1 pack is enabled", () => {
  const onboardingContent = fs.readFileSync(
    path.join(ROOT, "client/src/pages/Onboarding.tsx"),
    "utf-8"
  );

  it("G1: Step initialization checks enabledCountryPacks.length === 1", () => {
    expect(onboardingContent).toMatch(/enabledCountryPacks\.length === 1/);
  });

  it("G2: When length === 1, step is set to 1 (skip Step 0)", () => {
    const stepInitIdx = onboardingContent.indexOf("useState(() => {");
    const stepInitSection = onboardingContent.slice(stepInitIdx, stepInitIdx + 500);
    expect(stepInitSection).toMatch(/return 1.*Auto-skip if only 1 pack/);
  });

  it("G3: When flag OFF, step is set to 1 (V1 compat)", () => {
    const stepInitIdx = onboardingContent.indexOf("useState(() => {");
    const stepInitSection = onboardingContent.slice(stepInitIdx, stepInitIdx + 500);
    expect(stepInitSection).toMatch(/!v2CountryPacksEnabled.*return 1/);
  });

  it("G4: When flag ON and multiple packs, step is set to 0 (show Step 0)", () => {
    const stepInitIdx = onboardingContent.indexOf("useState(() => {");
    const stepInitSection = onboardingContent.slice(stepInitIdx, stepInitIdx + 500);
    expect(stepInitSection).toMatch(/return 0.*Show Step 0/);
  });
});
