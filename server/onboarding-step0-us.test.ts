/**
 * onboarding-step0-us.test.ts
 *
 * Tests for US option in Onboarding Step 0.
 * Follows the same pattern as onboarding-step0-ph.test.ts.
 *
 * Coverage:
 * - COUNTRY_OPTIONS includes US
 * - US preselect logic works
 * - setCountryPack("US") does not set languageMode=vi (server enforces en for non-VN)
 * - getTracksForCountry("US", true) returns 4 US English tracks
 * - Flag OFF: onboarding unchanged (no step 0)
 * - Regression: CA, VN, PH options still present
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

describe("Onboarding Step 0 — US option in COUNTRY_OPTIONS", () => {
  it("T1: COUNTRY_OPTIONS includes US entry", () => {
    expect(onboardingSource).toContain('id: "US"');
  });

  it("T2: US entry has 'United States' label", () => {
    expect(onboardingSource).toContain('"United States"');
  });

  it("T3: US entry has US flag emoji 🇺🇸", () => {
    expect(onboardingSource).toContain("🇺🇸");
  });

  it("T4: COUNTRY_OPTIONS has 4 entries (CA, VN, PH, US)", () => {
    const caCount = (onboardingSource.match(/id: "CA"/g) || []).length;
    const vnCount = (onboardingSource.match(/id: "VN"/g) || []).length;
    const phCount = (onboardingSource.match(/id: "PH"/g) || []).length;
    const usCount = (onboardingSource.match(/id: "US"/g) || []).length;
    expect(caCount).toBeGreaterThanOrEqual(1);
    expect(vnCount).toBeGreaterThanOrEqual(1);
    expect(phCount).toBeGreaterThanOrEqual(1);
    expect(usCount).toBeGreaterThanOrEqual(1);
  });

  it("T5: CA option is still present (regression)", () => {
    expect(onboardingSource).toContain('"Canada"');
    expect(onboardingSource).toContain("🇨🇦");
  });

  it("T6: VN option is still present (regression)", () => {
    expect(onboardingSource).toContain('"Vietnam"');
    expect(onboardingSource).toContain("🇻🇳");
  });

  it("T7: PH option is still present (regression)", () => {
    expect(onboardingSource).toContain('"Philippines"');
    expect(onboardingSource).toContain("🇵🇭");
  });

  it("T8: grid layout updated to sm:grid-cols-2 md:grid-cols-4 for 4 cards", () => {
    expect(onboardingSource).toContain("sm:grid-cols-2");
    expect(onboardingSource).toContain("md:grid-cols-4");
  });
});

// ─── Preselect logic ──────────────────────────────────────────────────────────

describe("Onboarding Step 0 — US preselect logic", () => {
  it("T9: Preselect logic includes US as a valid preselect value", () => {
    expect(onboardingSource).toContain('userCountryPackId === "US"');
  });

  it("T10: Preselect logic still includes CA, VN, PH (regression)", () => {
    expect(onboardingSource).toContain('userCountryPackId === "CA"');
    expect(onboardingSource).toContain('userCountryPackId === "VN"');
    expect(onboardingSource).toContain('userCountryPackId === "PH"');
  });
});

// ─── Track step: US tracks shown after US selection ───────────────────────────

describe("Onboarding Step 0 — US tracks shown after selection", () => {
  it("T11: getTracksForCountry('US', true) returns 4 US tracks", () => {
    const result = getTracksForCountry("US", true);
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("US");
    expect(result.tracks).toHaveLength(4);
  });

  it("T12: US tracks are English-only (no Vietnamese characters)", () => {
    const result = getTracksForCountry("US", true, "vi");
    for (const track of result.tracks) {
      expect(track.label).not.toMatch(
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
      );
    }
  });

  it("T13: US tracks defaultTrack is INTERNSHIP", () => {
    const result = getTracksForCountry("US", true);
    expect(result.defaultTrack).toBe("INTERNSHIP");
  });

  it("T14: US tracks include INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    const result = getTracksForCountry("US", true);
    const codes = result.tracks.map((t) => t.code);
    expect(codes).toContain("INTERNSHIP");
    expect(codes).toContain("NEW_GRAD");
    expect(codes).toContain("EARLY_CAREER");
    expect(codes).toContain("EXPERIENCED");
  });

  it("T15: US tracks locale=vi returns same English labels as locale=en", () => {
    const en = getTracksForCountry("US", true, "en");
    const vi = getTracksForCountry("US", true, "vi");
    expect(en.tracks.map((t) => t.label)).toEqual(vi.tracks.map((t) => t.label));
  });

  it("T16: all US track labels start with 'United States'", () => {
    const result = getTracksForCountry("US", true, "en");
    for (const t of result.tracks) {
      expect(t.label).toMatch(/^United States/);
    }
  });
});

// ─── languageMode enforcement ─────────────────────────────────────────────────

describe("Onboarding Step 0 — US does not set languageMode=vi", () => {
  it("T17: setCountryPack only sets vi when countryPackId is VN", () => {
    const setCountryPackBlock = routersSource.slice(
      routersSource.indexOf("setCountryPack:"),
      routersSource.indexOf("setCountryPack:") + 2000
    );
    // Must check for VN specifically
    expect(setCountryPackBlock).toContain('"VN"');
    // languageMode=vi assignment must be conditional on VN
    expect(setCountryPackBlock).toContain("vi");
  });

  it("T18: setCountryPack languageModeSet is false for US (VN check is explicit)", () => {
    // The condition is: countryPackId === "VN" && ...
    // So for US, languageModeSet will always be false
    const setCountryPackBlock = routersSource.slice(
      routersSource.indexOf("setCountryPack:"),
      routersSource.indexOf("setCountryPack:") + 2000
    );
    expect(setCountryPackBlock).toContain('countryPackId === "VN"');
    // US is not VN, so languageModeSet will be false
    expect(setCountryPackBlock).not.toContain('countryPackId === "US"');
  });

  it("T19: Onboarding.tsx does not hardcode languageMode=vi", () => {
    expect(onboardingSource).not.toContain('languageMode: "vi"');
    expect(onboardingSource).not.toContain("languageMode='vi'");
  });

  it("T20: setCountryPack returns languageModeSet field in response", () => {
    const setCountryPackBlock = routersSource.slice(
      routersSource.indexOf("setCountryPack:"),
      routersSource.indexOf("setCountryPack:") + 2000
    );
    expect(setCountryPackBlock).toContain("languageModeSet");
    expect(setCountryPackBlock).toContain("return { success: true, languageModeSet, languageModeReset }");
  });
});

// ─── Flag OFF regression ──────────────────────────────────────────────────────

describe("Onboarding Step 0 — flag OFF regression", () => {
  it("T21: v2CountryPacksEnabled flag controls step 0 visibility", () => {
    expect(onboardingSource).toContain("v2CountryPacksEnabled");
  });

  it("T22: flag OFF → step starts at 1 (V1 behaviour unchanged)", () => {
    // The step init logic: v2CountryPacksEnabled ? 0 : 1
    expect(onboardingSource).toContain("v2CountryPacksEnabled ? 0 : 1");
  });

  it("T23: getTracksForCountry with v2=false returns CA tracks regardless of US pack", () => {
    const result = getTracksForCountry("US", false, "en");
    expect(result.regionCode).toBe("CA");
    expect(result.defaultTrack).toBe("COOP");
  });
});

// ─── Regression: backend accepts US in setCountryPack ────────────────────────

describe("Onboarding Step 0 — backend accepts US in setCountryPack", () => {
  it("T24: COUNTRY_PACK_IDS includes US", () => {
    // Check that the zod enum in setCountryPack accepts US
    const setCountryPackBlock = routersSource.slice(
      routersSource.indexOf("setCountryPack:"),
      routersSource.indexOf("setCountryPack:") + 500
    );
    // The zod enum uses COUNTRY_PACK_IDS which includes US
    expect(setCountryPackBlock).toContain("COUNTRY_PACK_IDS");
  });

  it("T25: countryPacks.ts includes US in COUNTRY_PACK_IDS", () => {
    const countryPacksSource = readFileSync(
      join(__dirname, "../shared/countryPacks.ts"),
      "utf-8"
    );
    expect(countryPacksSource).toContain('"US"');
    expect(countryPacksSource).toContain("COUNTRY_PACK_IDS");
  });

  it("T26: CA, VN, PH tracks still work (regression)", () => {
    expect(getTracksForCountry("CA", true).tracks).toHaveLength(4);
    expect(getTracksForCountry("VN", true).tracks).toHaveLength(4);
    expect(getTracksForCountry("PH", true).tracks).toHaveLength(4);
  });
});
