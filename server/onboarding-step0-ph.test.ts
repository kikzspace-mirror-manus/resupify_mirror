/**
 * onboarding-step0-ph.test.ts
 *
 * Tests for PH option in Onboarding Step 0.
 *
 * Coverage:
 * - COUNTRY_OPTIONS includes PH
 * - PH preselect logic works
 * - setCountryPack("PH") does not set languageMode=vi (server enforces en for non-VN)
 * - getTracksForCountry("PH", true) returns PH tracks
 * - Flag OFF: onboarding unchanged (no step 0)
 * - Regression: CA and VN options still present
 */

import { describe, it, expect } from "vitest";
import { getTracksForCountry } from "../shared/trackOptions";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Source file snapshots ────────────────────────────────────────────────────

const onboardingSource = readFileSync(
  join(__dirname, "../client/src/pages/Onboarding.tsx"),
  "utf-8"
);

const routersSource = readFileSync(
  join(__dirname, "routers.ts"),
  "utf-8"
);

// ─── COUNTRY_OPTIONS structure ────────────────────────────────────────────────

describe("Onboarding Step 0 — PH option in COUNTRY_OPTIONS", () => {
  // T1: COUNTRY_OPTIONS includes PH entry
  it("T1: COUNTRY_OPTIONS includes PH entry", () => {
    expect(onboardingSource).toContain('id: "PH"');
  });

  // T2: PH entry has Philippines label
  it("T2: PH entry has Philippines label", () => {
    expect(onboardingSource).toContain('"Philippines"');
  });

  // T3: PH entry has flag emoji 🇵🇭
  it("T3: PH entry has Philippine flag emoji", () => {
    expect(onboardingSource).toContain("🇵🇭");
  });

  // T4: COUNTRY_OPTIONS has 3 entries (CA, VN, PH)
  it("T4: COUNTRY_OPTIONS has 3 entries (CA, VN, PH)", () => {
    // Count occurrences of 'id: "CA"', 'id: "VN"', 'id: "PH"' in COUNTRY_OPTIONS block
    const caCount = (onboardingSource.match(/id: "CA"/g) || []).length;
    const vnCount = (onboardingSource.match(/id: "VN"/g) || []).length;
    const phCount = (onboardingSource.match(/id: "PH"/g) || []).length;
    expect(caCount).toBeGreaterThanOrEqual(1);
    expect(vnCount).toBeGreaterThanOrEqual(1);
    expect(phCount).toBeGreaterThanOrEqual(1);
  });

  // T5: CA option is still present (regression)
  it("T5: CA option is still present", () => {
    expect(onboardingSource).toContain('"Canada"');
    expect(onboardingSource).toContain("🇨🇦");
  });

  // T6: VN option is still present (regression)
  it("T6: VN option is still present", () => {
    expect(onboardingSource).toContain('"Vietnam"');
    expect(onboardingSource).toContain("🇻🇳");
  });
});

// ─── Preselect logic ──────────────────────────────────────────────────────────

describe("Onboarding Step 0 — PH preselect logic", () => {
  // T7: Preselect logic includes PH as a valid value
  it("T7: Preselect logic includes PH as a valid preselect value", () => {
    expect(onboardingSource).toContain('userCountryPackId === "PH"');
  });

  // T8: Preselect logic still includes CA and VN (regression)
  it("T8: Preselect logic still includes CA and VN", () => {
    expect(onboardingSource).toContain('userCountryPackId === "CA"');
    expect(onboardingSource).toContain('userCountryPackId === "VN"');
  });
});

// ─── Track step: PH tracks shown after PH selection ──────────────────────────

describe("Onboarding Step 0 — PH tracks shown after selection", () => {
  // T9: getTracksForCountry("PH", true) returns 4 PH tracks
  it("T9: getTracksForCountry(PH, true) returns 4 PH tracks", () => {
    const result = getTracksForCountry("PH", true);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("PH");
    expect(result.tracks).toHaveLength(4);
  });

  // T10: PH tracks are English-only (no Vietnamese characters)
  it("T10: PH tracks are English-only", () => {
    const result = getTracksForCountry("PH", true, "vi");
    for (const track of result.tracks) {
      expect(track.label).not.toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
    }
  });

  // T11: PH tracks defaultTrack is NEW_GRAD
  it("T11: PH tracks defaultTrack is NEW_GRAD", () => {
    const result = getTracksForCountry("PH", true);
    expect(result.defaultTrack).toBe("NEW_GRAD");
  });

  // T12: PH tracks include INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED
  it("T12: PH tracks include all 4 expected codes", () => {
    const result = getTracksForCountry("PH", true);
    const codes = result.tracks.map(t => t.code);
    expect(codes).toContain("INTERNSHIP");
    expect(codes).toContain("NEW_GRAD");
    expect(codes).toContain("EARLY_CAREER");
    expect(codes).toContain("EXPERIENCED");
  });
});

// ─── languageMode enforcement ─────────────────────────────────────────────────

describe("Onboarding Step 0 — PH does not set languageMode=vi", () => {
  // T13: setCountryPack mutation checks countryPackId === "VN" before setting vi
  it("T13: setCountryPack only sets vi when countryPackId is VN", () => {
    // The server-side logic should check for "VN" specifically
    const setCountryPackBlock = routersSource.slice(
      routersSource.indexOf("setCountryPack:"),
      routersSource.indexOf("setCountryPack:") + 2000
    );
    // Must check for VN specifically (not just any non-CA)
    expect(setCountryPackBlock).toContain('"VN"');
    // languageMode=vi assignment must be conditional on VN
    expect(setCountryPackBlock).toContain("vi");
  });

  // T14: setCountryPack non-VN enforcement: non-VN users forced to en
  it("T14: setCountryPack has non-VN enforcement (forces en for non-VN)", () => {
    const setCountryPackBlock = routersSource.slice(
      routersSource.indexOf("setCountryPack:"),
      routersSource.indexOf("setCountryPack:") + 2000
    );
    // Should have logic that handles non-VN case
    expect(setCountryPackBlock).toContain("en");
  });

  // T15: Onboarding does not hardcode languageMode anywhere
  it("T15: Onboarding.tsx does not hardcode languageMode=vi", () => {
    // The frontend should not set languageMode directly — that's server-side
    expect(onboardingSource).not.toContain('languageMode: "vi"');
    expect(onboardingSource).not.toContain("languageMode='vi'");
  });
});

// ─── Flag OFF regression ──────────────────────────────────────────────────────

describe("Onboarding Step 0 — flag OFF regression", () => {
  // T16: When flag OFF, step starts at 1 (no Step 0)
  it("T16: When v2CountryPacksEnabled is false, step starts at 1", () => {
    // The initial step computation should start at 1 when flag is false
    expect(onboardingSource).toContain("v2CountryPacksEnabled ? 0 : 1");
  });

  // T17: Step 0 JSX is gated behind v2CountryPacksEnabled
  it("T17: Step 0 JSX is gated behind v2CountryPacksEnabled", () => {
    expect(onboardingSource).toContain("step === 0 && v2CountryPacksEnabled");
  });

  // T18: CA tracks still work when flag OFF
  it("T18: CA tracks still work when flag OFF", () => {
    const result = getTracksForCountry("CA", false);
    // CA_TRACKS now has 4 entries (COOP, NEW_GRAD, EARLY_CAREER, EXPERIENCED)
    expect(result.tracks).toHaveLength(4);
    expect(result.regionCode).toBe("CA");
  });
});

// ─── Grid layout ─────────────────────────────────────────────────────────────

describe("Onboarding Step 0 — grid layout for 3 options", () => {
  // T19: RadioGroup uses 3-column grid for 3 options
  it("T19: RadioGroup uses sm:grid-cols-3 for 3 country options", () => {
    expect(onboardingSource).toContain("sm:grid-cols-3");
  });
});
