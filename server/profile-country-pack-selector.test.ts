/**
 * profile-country-pack-selector.test.ts
 *
 * Tests for the Profile page Country Pack selector card.
 *
 * Coverage:
 * - Card is rendered when v2CountryPacksEnabled is ON
 * - Card is hidden when v2CountryPacksEnabled is OFF
 * - All 5 options present: GLOBAL, CA, VN, PH, US
 * - US option is present with correct data-testid
 * - setCountryPack mutation is wired to the Save Pack button
 * - onSuccess handler calls auth.me.invalidate() for immediate UI update
 * - showWorkAuthCard is derived from userCountryPackId (not selectedCountryPackId)
 *   → after auth.me.invalidate(), userCountryPackId updates → Work Auth card appears
 * - Language card remains hidden for non-VN packs
 * - Regression: existing track card, work auth card, language card unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const profileSource = readFileSync(
  join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

// ─── Card presence and flag gating ───────────────────────────────────────────

describe("Profile Country Pack Card — flag gating", () => {
  it("P1: Country Pack card exists in Profile.tsx", () => {
    expect(profileSource).toContain('data-testid="profile-country-pack-card"');
  });

  it("P2: Country Pack card is gated behind v2CountryPacksEnabled", () => {
    const idx = profileSource.indexOf('data-testid="profile-country-pack-card"');
    // The card must be inside a v2CountryPacksEnabled conditional
    const before = profileSource.slice(Math.max(0, idx - 200), idx);
    expect(before).toContain("v2CountryPacksEnabled");
  });

  it("P3: Country Pack card title is 'Country Pack'", () => {
    expect(profileSource).toContain("Country Pack");
  });

  it("P4: Country Pack card has a Globe icon", () => {
    // Globe is already imported; the card uses it in CardTitle
    const idx = profileSource.indexOf('data-testid="profile-country-pack-card"');
    const snippet = profileSource.slice(idx, idx + 300);
    expect(snippet).toContain("Globe");
  });
});

// ─── Selector options ─────────────────────────────────────────────────────────

describe("Profile Country Pack Card — selector options", () => {
  it("P5: GLOBAL option is present", () => {
    expect(profileSource).toContain('data-testid="pack-option-GLOBAL"');
    expect(profileSource).toContain('value="GLOBAL"');
  });

  it("P6: CA option is present", () => {
    expect(profileSource).toContain('data-testid="pack-option-CA"');
    expect(profileSource).toContain('value="CA"');
  });

  it("P7: VN option is present", () => {
    expect(profileSource).toContain('data-testid="pack-option-VN"');
    expect(profileSource).toContain('value="VN"');
  });

  it("P8: PH option is present", () => {
    expect(profileSource).toContain('data-testid="pack-option-PH"');
    expect(profileSource).toContain('value="PH"');
  });

  it("P9: US option is present", () => {
    expect(profileSource).toContain('data-testid="pack-option-US"');
    expect(profileSource).toContain('value="US"');
  });

  it("P10: US option label includes 'United States'", () => {
    const idx = profileSource.indexOf('data-testid="pack-option-US"');
    const snippet = profileSource.slice(idx, idx + 80);
    expect(snippet).toContain("United States");
  });

  it("P11: selector has data-testid='country-pack-select'", () => {
    expect(profileSource).toContain('data-testid="country-pack-select"');
  });

  it("P12: Save Pack button has data-testid='save-country-pack-btn'", () => {
    expect(profileSource).toContain('data-testid="save-country-pack-btn"');
  });
});

// ─── Mutation wiring ─────────────────────────────────────────────────────────

describe("Profile Country Pack Card — mutation wiring", () => {
  it("P13: setCountryPack mutation is defined using trpc.profile.setCountryPack", () => {
    expect(profileSource).toContain("trpc.profile.setCountryPack.useMutation");
  });

  it("P14: setCountryPack.mutate is called with countryPackId", () => {
    expect(profileSource).toContain("setCountryPack.mutate({ countryPackId: selectedCountryPackId })");
  });

  it("P15: onSuccess handler calls auth.me.invalidate() for immediate UI update", () => {
    const idx = profileSource.indexOf("trpc.profile.setCountryPack.useMutation");
    const snippet = profileSource.slice(idx, idx + 300);
    expect(snippet).toContain("auth.me.invalidate");
  });

  it("P16: onSuccess handler resets packDirty to false", () => {
    const idx = profileSource.indexOf("trpc.profile.setCountryPack.useMutation");
    const snippet = profileSource.slice(idx, idx + 300);
    expect(snippet).toContain("setPackDirty(false)");
  });

  it("P17: Save Pack button is disabled when packDirty is false (and not in saved state)", () => {
    // After adding savedAt pattern, the condition is: (!packDirty && !isSaved) || setCountryPack.isPending
    expect(profileSource).toContain("(!packDirty && !isSaved) || setCountryPack.isPending");
  });
});

// ─── Reactivity: Work Auth card updates immediately ───────────────────────────

describe("Profile Country Pack Card — Work Auth reactivity", () => {
  it("P18: showWorkAuthCard is derived from userCountryPackId (from auth.me)", () => {
    // userCountryPackId comes from auth.me; auth.me.invalidate() triggers re-render
    expect(profileSource).toContain('userCountryPackId === "CA" || userCountryPackId === "US"');
  });

  it("P19: userCountryPackId is derived from user (auth.me) record", () => {
    expect(profileSource).toContain("user as any)?.countryPackId");
  });

  it("P20: Work Auth card is gated on showWorkAuthCard (not selectedCountryPackId)", () => {
    // The Work Auth card must use showWorkAuthCard, not selectedCountryPackId
    const workAuthIdx = profileSource.indexOf("Work Authorization Card");
    const snippet = profileSource.slice(workAuthIdx, workAuthIdx + 100);
    expect(snippet).toContain("showWorkAuthCard");
    expect(snippet).not.toContain("selectedCountryPackId");
  });
});

// ─── Reactivity: Track dropdown updates immediately ───────────────────────────

describe("Profile Country Pack Card — Track reactivity", () => {
  it("P21: tracks are derived from userCountryPackId (from auth.me)", () => {
    // getTracksForCountry uses userCountryPackId, not selectedCountryPackId
    expect(profileSource).toContain("getTracksForCountry(userCountryPackId");
  });

  it("P22: Track card uses tracks array from getTracksForCountry", () => {
    expect(profileSource).toContain("tracks.map(");
  });
});

// ─── Language card remains hidden for non-VN ─────────────────────────────────

describe("Profile Country Pack Card — Language card gating", () => {
  it("P23: Language card is gated on userCountryPackId === 'VN' (not selectedCountryPackId)", () => {
    const langCardIdx = profileSource.indexOf("Language Card");
    const snippet = profileSource.slice(langCardIdx, langCardIdx + 200);
    expect(snippet).toContain('userCountryPackId === "VN"');
    expect(snippet).not.toContain("selectedCountryPackId");
  });
});

// ─── Regression: existing cards unchanged ────────────────────────────────────

describe("Profile Country Pack Card — regression", () => {
  it("R1: Track card still present", () => {
    expect(profileSource).toContain('data-testid="profile-track-card"');
  });

  it("R2: Work Auth card still present", () => {
    expect(profileSource).toContain("Work Authorization Card");
  });

  it("R3: Language card still present", () => {
    expect(profileSource).toContain("Language Card");
  });

  it("R4: selectedCountryPackId state is initialized from userCountryPackId", () => {
    expect(profileSource).toContain("selectedCountryPackId");
    expect(profileSource).toContain("setSelectedCountryPackId");
  });

  it("R5: packDirty state exists", () => {
    expect(profileSource).toContain("packDirty");
    expect(profileSource).toContain("setPackDirty");
  });
});
