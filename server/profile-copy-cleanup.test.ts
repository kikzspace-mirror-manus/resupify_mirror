/**
 * profile-copy-cleanup.test.ts
 *
 * Tests for V2 Profile page copy renames and disabled-market behavior.
 *
 * Coverage:
 * A) Copy renames: "Job market", "Career stage", "Display language" appear
 * B) Removed copy: "eligibility checks", "Country Pack", "Track" (as card title) absent
 * C) Page subtitle updated
 * D) Disabled market: warning banner data-testid present in source
 * E) Single pack: read-only display data-testid present in source
 * F) Filtered dropdown: only enabled packs shown (no disabled options in main list)
 * G) Work Auth noteText: "eligibility mismatches" replaced with "match requirements"
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(
  join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

// ─── A) Copy renames ──────────────────────────────────────────────────────────

describe("Profile copy renames", () => {
  it("A1: 'Job market' appears as card title", () => {
    expect(src).toContain("Job market");
  });

  it("A2: 'Career stage' appears as card title", () => {
    expect(src).toContain("Career stage");
  });

  it("A3: 'Display language' appears as card title", () => {
    expect(src).toContain("Display language");
  });

  it("A4: Job market helper copy is present", () => {
    expect(src).toContain("This sets defaults for your market, like formatting and requirements.");
  });

  it("A5: Career stage helper copy is present", () => {
    expect(src).toContain("This tailors the guidance and templates you see.");
  });

  it("A6: Display language helper copy is present", () => {
    expect(src).toContain("Choose the language for labels and guidance.");
  });

  it("A7: Page subtitle updated to user-friendly language", () => {
    expect(src).toContain("Update your job market, career stage, and preferences.");
  });

  it("A8: 'Current market' label is present", () => {
    expect(src).toContain("Current market");
  });

  it("A9: 'Current career stage' label is present", () => {
    expect(src).toContain("Current career stage");
  });

  it("A10: 'Save market' button text is present", () => {
    expect(src).toContain("Save market");
  });

  it("A11: 'Save career stage' button text is present", () => {
    expect(src).toContain("Save career stage");
  });
});

// ─── B) Removed copy ─────────────────────────────────────────────────────────

describe("Profile removed copy", () => {
  it("B1: 'eligibility checks' does not appear in Profile.tsx", () => {
    // Should not appear as a user-visible string (comments are OK)
    const lines = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
    const hasEligibilityChecks = lines.some((l) => l.includes("eligibility checks"));
    expect(hasEligibilityChecks).toBe(false);
  });

  it("B2: 'Country Pack' does not appear as a card title", () => {
    // The card title should now say 'Job market', not 'Country Pack'
    // Check that the CardTitle does not contain 'Country Pack'
    const cardTitleSection = src.slice(
      src.indexOf("profile-country-pack-card"),
      src.indexOf("profile-country-pack-card") + 400
    );
    expect(cardTitleSection).not.toContain(">Country Pack<");
    expect(cardTitleSection).toContain("Job market");
  });

  it("B3: 'Track' does not appear as a standalone card title (replaced by Career stage)", () => {
    // The CardTitle for the track card should say 'Career stage', not 'Track'
    const trackCardSection = src.slice(
      src.indexOf("profile-track-card"),
      src.indexOf("profile-track-card") + 400
    );
    expect(trackCardSection).not.toContain(">Track<");
    expect(trackCardSection).toContain("Career stage");
  });

  it("B4: 'Language' does not appear as a standalone card title (replaced by Display language)", () => {
    // The CardTitle for the language card should say 'Display language', not 'Language'
    const langCardSection = src.slice(
      src.indexOf("language-card"),
      src.indexOf("language-card") + 400
    );
    expect(langCardSection).not.toContain(">Language<");
    expect(langCardSection).toContain("Display language");
  });

  it("B5: Old page subtitle is gone", () => {
    expect(src).not.toContain("Manage your track, education details, and work authorization status.");
  });

  it("B6: Old country pack helper copy is gone", () => {
    expect(src).not.toContain("Your country pack determines which resume templates and eligibility checks apply.");
  });

  it("B7: Old track helper copy is gone", () => {
    expect(src).not.toContain("Your track determines which eligibility checks and resume tips apply to you.");
  });
});

// ─── C) Work Auth noteText ────────────────────────────────────────────────────

describe("Profile Work Auth noteText", () => {
  it("C1: 'eligibility mismatches' does not appear in noteText", () => {
    expect(src).not.toContain("eligibility mismatches");
  });

  it("C2: 'match requirements' appears in noteText", () => {
    expect(src).toContain("match requirements");
  });
});

// ─── D) Disabled market banner ────────────────────────────────────────────────

describe("Profile disabled market banner", () => {
  it("D1: disabled-market-banner data-testid is present", () => {
    expect(src).toContain('data-testid="disabled-market-banner"');
  });

  it("D2: warning banner text is correct", () => {
    expect(src).toContain("This job market is not currently offered. Please switch to an available market.");
  });

  it("D3: banner is gated on userCountryPackId not in enabledCountryPacks", () => {
    // The banner is inside a conditional — look 400 chars before the testid
    const precedingCode = src.slice(
      Math.max(0, src.indexOf("disabled-market-banner") - 400),
      src.indexOf("disabled-market-banner")
    );
    expect(precedingCode).toContain("enabledCountryPacks.includes");
  });
});

// ─── E) Single pack read-only ─────────────────────────────────────────────────

describe("Profile single pack read-only", () => {
  it("E1: country-pack-readonly data-testid is present", () => {
    expect(src).toContain('data-testid="country-pack-readonly"');
  });

  it("E2: read-only is gated on enabledCountryPacks.length === 1", () => {
    const readonlySection = src.slice(
      src.indexOf("country-pack-readonly"),
      src.indexOf("country-pack-readonly") + 300
    );
    const precedingCode = src.slice(
      Math.max(0, src.indexOf("country-pack-readonly") - 200),
      src.indexOf("country-pack-readonly")
    );
    expect(precedingCode).toContain("enabledCountryPacks.length === 1");
  });

  it("E3: dropdown (Select) is inside the else branch (length > 1)", () => {
    // The Select trigger should appear after the ternary for single-pack
    const singlePackIdx = src.indexOf("enabledCountryPacks.length === 1");
    const selectIdx = src.indexOf('data-testid="country-pack-select"');
    expect(singlePackIdx).toBeGreaterThan(-1);
    expect(selectIdx).toBeGreaterThan(singlePackIdx);
  });

  it("E4: Save button is also hidden for single pack (gated on length > 1)", () => {
    // The save button is inside a conditional — look 400 chars before the testid
    const precedingCode = src.slice(
      Math.max(0, src.indexOf("save-country-pack-btn") - 400),
      src.indexOf("save-country-pack-btn")
    );
    expect(precedingCode).toContain("enabledCountryPacks.length > 1");
  });
});

// ─── F) Filtered dropdown ─────────────────────────────────────────────────────

describe("Profile filtered dropdown", () => {
  it("F1: dropdown only shows packs that are in enabledCountryPacks (no unconditional items)", () => {
    // Every SelectItem in the country pack dropdown should be guarded by enabledCountryPacks.includes
    const contentStart = src.indexOf('data-testid="country-pack-select-content"');
    const contentEnd = src.indexOf("</SelectContent>", contentStart);
    const dropdownContent = src.slice(contentStart, contentEnd);
    // All pack options should be conditional
    expect(dropdownContent).toContain('enabledCountryPacks.includes("GLOBAL")');
    expect(dropdownContent).toContain('enabledCountryPacks.includes("CA")');
    expect(dropdownContent).toContain('enabledCountryPacks.includes("VN")');
    expect(dropdownContent).toContain('enabledCountryPacks.includes("PH")');
    expect(dropdownContent).toContain('enabledCountryPacks.includes("US")');
  });

  it("F2: no disabled SelectItem for current pack in the main dropdown (removed from new implementation)", () => {
    // The new implementation removes the disabled hint item from the dropdown
    // and replaces it with the warning banner above
    const contentStart = src.indexOf('data-testid="country-pack-select-content"');
    const contentEnd = src.indexOf("</SelectContent>", contentStart);
    const dropdownContent = src.slice(contentStart, contentEnd);
    expect(dropdownContent).not.toContain("disabled");
  });
});
