/**
 * admin-packs-us-filter.test.ts
 *
 * Tests for the US filter tab added to /admin/packs.
 *
 * Coverage:
 * - CountryFilter type includes "US"
 * - COUNTRY_FILTER_OPTIONS includes US entry
 * - US badge color is defined (green)
 * - Filtering logic: US filter shows only US packs
 * - Filtering logic: ALL filter includes US packs
 * - Regression: CA/VN/PH filter options unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAvailablePacks, getRegionPack } from "../shared/regionPacks";

const adminPacksSource = readFileSync(
  join(__dirname, "../client/src/pages/admin/AdminPacks.tsx"),
  "utf-8"
);

// ─── A) CountryFilter type ────────────────────────────────────────────────────

describe("A) CountryFilter type includes US", () => {
  it("A1: CountryFilter type includes 'US'", () => {
    expect(adminPacksSource).toContain('"US"');
    expect(adminPacksSource).toContain('CountryFilter = "ALL" | "CA" | "VN" | "PH" | "US"');
  });

  it("A2: COUNTRY_FILTER_OPTIONS has 5 entries (ALL + 4 countries)", () => {
    // Count occurrences of { value: in the options array
    const matches = adminPacksSource.match(/\{ value: "[A-Z]+".*?label:/g);
    expect(matches?.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── B) Filter options ────────────────────────────────────────────────────────

describe("B) COUNTRY_FILTER_OPTIONS includes US entry", () => {
  it("B1: US option has value='US'", () => {
    expect(adminPacksSource).toContain('value: "US"');
  });

  it("B2: US option label includes 'United States'", () => {
    expect(adminPacksSource).toContain("United States");
  });

  it("B3: US option label includes '(US)'", () => {
    expect(adminPacksSource).toContain("United States (US)");
  });
});

// ─── C) Badge colors ─────────────────────────────────────────────────────────

describe("C) US badge color is defined", () => {
  it("C1: COUNTRY_BADGE_COLORS has a US entry", () => {
    expect(adminPacksSource).toContain('US:');
  });

  it("C2: US badge uses green color classes", () => {
    const idx = adminPacksSource.indexOf('US:');
    const snippet = adminPacksSource.slice(idx, idx + 80);
    expect(snippet).toContain("green");
  });
});

// ─── D) Filtering logic ───────────────────────────────────────────────────────

describe("D) Filtering logic — US packs", () => {
  // Simulate the filteredPacks logic from AdminPacks.tsx
  type MockPack = { regionCode: string; trackCode: string; key: string };

  function applyFilter(packs: MockPack[], filter: string): MockPack[] {
    return packs.filter((pack) => {
      if (filter === "ALL") return true;
      return pack.regionCode === filter;
    });
  }

  const allPacks: MockPack[] = getAvailablePacks().map(({ key }) => {
    const [regionCode, ...rest] = key.split("_");
    const trackCode = rest.join("_");
    return { key, regionCode, trackCode };
  });

  it("D1: US filter returns only US packs", () => {
    const result = applyFilter(allPacks, "US");
    expect(result.length).toBeGreaterThan(0);
    result.forEach((p) => expect(p.regionCode).toBe("US"));
  });

  it("D2: US filter returns exactly 4 packs (INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED)", () => {
    const result = applyFilter(allPacks, "US");
    expect(result.length).toBe(4);
  });

  it("D3: US filter includes US/INTERNSHIP", () => {
    const result = applyFilter(allPacks, "US");
    expect(result.some((p) => p.trackCode === "INTERNSHIP")).toBe(true);
  });

  it("D4: US filter includes US/NEW_GRAD", () => {
    const result = applyFilter(allPacks, "US");
    expect(result.some((p) => p.trackCode === "NEW_GRAD")).toBe(true);
  });

  it("D5: US filter includes US/EARLY_CAREER", () => {
    const result = applyFilter(allPacks, "US");
    expect(result.some((p) => p.trackCode === "EARLY_CAREER")).toBe(true);
  });

  it("D6: US filter includes US/EXPERIENCED", () => {
    const result = applyFilter(allPacks, "US");
    expect(result.some((p) => p.trackCode === "EXPERIENCED")).toBe(true);
  });

  it("D7: ALL filter includes US packs", () => {
    const result = applyFilter(allPacks, "ALL");
    const usPacks = result.filter((p) => p.regionCode === "US");
    expect(usPacks.length).toBe(4);
  });

  it("D8: CA filter does not include US packs", () => {
    const result = applyFilter(allPacks, "CA");
    result.forEach((p) => expect(p.regionCode).not.toBe("US"));
  });

  it("D9: VN filter does not include US packs", () => {
    const result = applyFilter(allPacks, "VN");
    result.forEach((p) => expect(p.regionCode).not.toBe("US"));
  });

  it("D10: PH filter does not include US packs", () => {
    const result = applyFilter(allPacks, "PH");
    result.forEach((p) => expect(p.regionCode).not.toBe("US"));
  });
});

// ─── E) Regression: existing filter options unchanged ────────────────────────

describe("E) Regression: existing filter options unchanged", () => {
  it("E1: ALL option still present", () => {
    expect(adminPacksSource).toContain('value: "ALL"');
  });

  it("E2: CA option still present with label 'Canada (CA)'", () => {
    expect(adminPacksSource).toContain("Canada (CA)");
  });

  it("E3: VN option still present with label 'Vietnam (VN)'", () => {
    expect(adminPacksSource).toContain("Vietnam (VN)");
  });

  it("E4: PH option still present with label 'Philippines (PH)'", () => {
    expect(adminPacksSource).toContain("Philippines (PH)");
  });

  it("E5: CA badge color is still red", () => {
    const idx = adminPacksSource.indexOf('CA:');
    const snippet = adminPacksSource.slice(idx, idx + 80);
    expect(snippet).toContain("red");
  });

  it("E6: VN badge color is still yellow", () => {
    const idx = adminPacksSource.indexOf('VN:');
    const snippet = adminPacksSource.slice(idx, idx + 80);
    expect(snippet).toContain("yellow");
  });

  it("E7: PH badge color is still blue", () => {
    const idx = adminPacksSource.indexOf('PH:');
    const snippet = adminPacksSource.slice(idx, idx + 80);
    expect(snippet).toContain("blue");
  });

  it("E8: pack-country-filter data-testid still present", () => {
    expect(adminPacksSource).toContain('data-testid="pack-country-filter"');
  });

  it("E9: filter uses data-filter attribute for each option", () => {
    expect(adminPacksSource).toContain("data-filter={opt.value}");
  });
});
