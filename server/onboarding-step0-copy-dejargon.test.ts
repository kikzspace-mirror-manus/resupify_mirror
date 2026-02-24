/**
 * Onboarding Step 0 — Copy de-jargon + card description removal
 *
 * Phase: V2 Onboarding Phase 1 — Step 0 copy update
 * Tests:
 *   A) Helper text updated (new copy present, old copy absent)
 *   B) Country card sublabel removed from render (no sublabel paragraph in JSX)
 *   C) Country cards still render flag + name (selection unchanged)
 *   D) Regression — title, testids, flag gate, V1 path unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ONBOARDING_PATH = resolve(__dirname, "../client/src/pages/Onboarding.tsx");
const content = readFileSync(ONBOARDING_PATH, "utf-8");

// ── A: Helper text ─────────────────────────────────────────────────────────

describe("A — Step 0 helper text updated", () => {
  it("A1) New helper text is present in the file", () => {
    expect(content).toContain(
      "Choose your main job market so we can personalize the next steps."
    );
  });

  it("A2) Old jargon-heavy helper text is NOT present", () => {
    expect(content).not.toContain(
      "Choose your primary job market. This helps us show the right tracks and eligibility checks."
    );
  });

  it("A3) Helper text does not mention 'tracks' in the Step 0 CardDescription", () => {
    // Extract the CardDescription block inside step0-country-card
    const step0Start = content.indexOf('data-testid="step0-country-card"');
    const cardDescStart = content.indexOf("<CardDescription>", step0Start);
    const cardDescEnd = content.indexOf("</CardDescription>", cardDescStart);
    const descText = content.slice(cardDescStart, cardDescEnd);
    expect(descText).not.toContain("tracks");
  });

  it("A4) Helper text does not mention 'eligibility checks' in the Step 0 CardDescription", () => {
    const step0Start = content.indexOf('data-testid="step0-country-card"');
    const cardDescStart = content.indexOf("<CardDescription>", step0Start);
    const cardDescEnd = content.indexOf("</CardDescription>", cardDescStart);
    const descText = content.slice(cardDescStart, cardDescEnd);
    expect(descText).not.toContain("eligibility checks");
  });

  it("A5) Helper text does not use 'primary job market' phrasing", () => {
    const step0Start = content.indexOf('data-testid="step0-country-card"');
    const cardDescStart = content.indexOf("<CardDescription>", step0Start);
    const cardDescEnd = content.indexOf("</CardDescription>", cardDescStart);
    const descText = content.slice(cardDescStart, cardDescEnd);
    expect(descText).not.toContain("primary job market");
  });
});

// ── B: Country card sublabel removed from render ───────────────────────────

describe("B — Country card sublabel not rendered", () => {
  it("B1) The sublabel div is not rendered inside country card Label elements", () => {
    // The sublabel paragraph was: <div className="text-xs text-muted-foreground mt-1">{country.sublabel}</div>
    // After the change, country.sublabel should not appear in JSX render
    expect(content).not.toContain("{country.sublabel}");
  });

  it("B2) 'Co-op, new grad' descriptive text is not rendered in JSX", () => {
    // This was the CA sublabel value — it should remain in COUNTRY_OPTIONS data
    // but not be rendered in the card body
    // Check that it's not in the render section (after the COUNTRY_OPTIONS array definition)
    const renderStart = content.indexOf("return (");
    const renderSection = content.slice(renderStart);
    expect(renderSection).not.toContain("Co-op, new grad");
  });

  it("B3) 'Internship, new grad & experienced roles' text is not rendered in JSX", () => {
    const renderStart = content.indexOf("return (");
    const renderSection = content.slice(renderStart);
    expect(renderSection).not.toContain("Internship, new grad & experienced roles");
  });

  it("B4) Country card only renders flag + country name (no sublabel div)", () => {
    // After the map, each card should have: flag span + div > div.font-semibold
    // and NOT a second div for sublabel
    const countryMapStart = content.indexOf("COUNTRY_OPTIONS.filter");
    const countryMapEnd = content.indexOf("</RadioGroup>", countryMapStart);
    const mapBlock = content.slice(countryMapStart, countryMapEnd);
    // Should have country.label
    expect(mapBlock).toContain("{country.label}");
    // Should NOT have country.sublabel
    expect(mapBlock).not.toContain("{country.sublabel}");
  });
});

// ── C: Country cards still render correctly ────────────────────────────────

describe("C — Country cards still render flag + name", () => {
  it("C1) country.flag is still rendered in each card", () => {
    const countryMapStart = content.indexOf("COUNTRY_OPTIONS.filter");
    const countryMapEnd = content.indexOf("</RadioGroup>", countryMapStart);
    const mapBlock = content.slice(countryMapStart, countryMapEnd);
    expect(mapBlock).toContain("{country.flag}");
  });

  it("C2) country.label is still rendered in each card", () => {
    const countryMapStart = content.indexOf("COUNTRY_OPTIONS.filter");
    const countryMapEnd = content.indexOf("</RadioGroup>", countryMapStart);
    const mapBlock = content.slice(countryMapStart, countryMapEnd);
    expect(mapBlock).toContain("{country.label}");
  });

  it("C3) font-semibold class still applied to country name", () => {
    const countryMapStart = content.indexOf("COUNTRY_OPTIONS.filter");
    const countryMapEnd = content.indexOf("</RadioGroup>", countryMapStart);
    const mapBlock = content.slice(countryMapStart, countryMapEnd);
    expect(mapBlock).toContain("font-semibold");
  });

  it("C4) RadioGroupItem still present for each card (selection behavior unchanged)", () => {
    const countryMapStart = content.indexOf("COUNTRY_OPTIONS.filter");
    const countryMapEnd = content.indexOf("</RadioGroup>", countryMapStart);
    const mapBlock = content.slice(countryMapStart, countryMapEnd);
    expect(mapBlock).toContain("<RadioGroupItem");
  });

  it("C5) country-option testid template literal still present", () => {
    expect(content).toContain("`country-option-${country.id}`");
  });

  it("C6) COUNTRY_OPTIONS still has 4 entries (CA, VN, PH, US)", () => {
    const optionsBlock = content.slice(
      content.indexOf("const COUNTRY_OPTIONS"),
      content.indexOf("];", content.indexOf("const COUNTRY_OPTIONS")) + 2
    );
    expect(optionsBlock).toContain('"CA"');
    expect(optionsBlock).toContain('"VN"');
    expect(optionsBlock).toContain('"PH"');
    expect(optionsBlock).toContain('"US"');
  });

  it("C7) COUNTRY_OPTIONS sublabel data still defined (data preserved, just not rendered)", () => {
    // The sublabel field should still exist in the data structure
    const optionsBlock = content.slice(
      content.indexOf("const COUNTRY_OPTIONS"),
      content.indexOf("];", content.indexOf("const COUNTRY_OPTIONS")) + 2
    );
    expect(optionsBlock).toContain("sublabel:");
  });
});

// ── D: Regression ─────────────────────────────────────────────────────────

describe("D — Regression: Step 0 structure unchanged", () => {
  it("D1) Title 'Where are you applying?' still present", () => {
    expect(content).toContain("Where are you applying?");
  });

  it("D2) step0-country-card testid still present", () => {
    expect(content).toContain('data-testid="step0-country-card"');
  });

  it("D3) country-selector testid still present", () => {
    expect(content).toContain('data-testid="country-selector"');
  });

  it("D4) country-continue-btn testid still present", () => {
    expect(content).toContain('data-testid="country-continue-btn"');
  });

  it("D5) Step 0 is gated behind v2CountryPacksEnabled flag", () => {
    const step0Block = content.slice(
      content.indexOf("Step 0: Choose Country"),
      content.indexOf("Step 1: Choose Track")
    );
    expect(step0Block).toContain("v2CountryPacksEnabled");
  });

  it("D6) MapPin icon still used in Step 0 header", () => {
    expect(content).toContain("MapPin");
  });

  it("D7) handleCountryPackContinue still wired to Continue button", () => {
    expect(content).toContain("handleCountryPackContinue");
  });

  it("D8) V1 path (flag OFF): step starts at 1 when v2CountryPacksEnabled is false", () => {
    // The step initialization: v2CountryPacksEnabled ? 0 : 1
    expect(content).toContain("v2CountryPacksEnabled ? 0 : 1");
  });

  it("D9) 'Skip for now' button still present in Step 0", () => {
    const step0Block = content.slice(
      content.indexOf('data-testid="step0-country-card"'),
      content.indexOf('data-testid="track-continue-btn"')
    );
    expect(step0Block).toContain("Skip for now");
  });
});
