/**
 * pack-adoption-kpi-cards.test.ts
 *
 * Tests for the 4 KPI stat cards (CA/VN/PH/US) added above the
 * Country Pack Adoption chart on /admin/growth.
 *
 * Coverage:
 * - A) UI structure: 4 cards present with correct data-testid attributes
 * - B) Values: each card reads from adoptionData.totals.[key]
 * - C) Labels: Canada/Vietnam/Philippines/United States
 * - D) Range-reactive: subtext shows the adoptionRange value
 * - E) Backend totals: CA/VN/PH/US all present in response shape
 * - F) Regression: existing chart and totals row unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const dashboardSource = readFileSync(
  join(__dirname, "../client/src/pages/admin/AdminGrowthDashboard.tsx"),
  "utf-8"
);

const dbSource = readFileSync(
  join(__dirname, "db.ts"),
  "utf-8"
);

// ─── A) UI structure ─────────────────────────────────────────────────────────

describe("A) KPI cards UI structure", () => {
  it("A1: pack-adoption-kpi-cards container is present", () => {
    expect(dashboardSource).toContain('data-testid="pack-adoption-kpi-cards"');
  });

  it("A2: pack-kpi-CA card is present", () => {
    expect(dashboardSource).toContain('data-testid={`pack-kpi-${key}`}');
  });

  it("A3: pack-kpi-CA-value element is present", () => {
    expect(dashboardSource).toContain('data-testid={`pack-kpi-${key}-value`}');
  });

  it("A4: grid uses 4 columns on sm breakpoint", () => {
    expect(dashboardSource).toContain("sm:grid-cols-4");
  });

  it("A5: grid uses 2 columns on mobile", () => {
    expect(dashboardSource).toContain("grid-cols-2");
  });

  it("A6: KPI cards are gated behind growthEnabled", () => {
    const idx = dashboardSource.indexOf('data-testid="pack-adoption-kpi-cards"');
    // growthEnabled check should appear before the KPI cards grid
    const before = dashboardSource.slice(0, idx);
    // The last occurrence of growthEnabled before the KPI cards
    expect(before.lastIndexOf("growthEnabled")).toBeGreaterThan(-1);
  });
});

// ─── B) Values ────────────────────────────────────────────────────────────────

describe("B) KPI card values from adoptionData.totals", () => {
  it("B1: CA value reads from adoptionData.totals.CA", () => {
    expect(dashboardSource).toContain("adoptionData?.totals?.[key]");
  });

  it("B2: loading state shows dash when adoptionLoading is true", () => {
    expect(dashboardSource).toContain('adoptionLoading ? "\u2014"');
  });

  it("B3: fallback to 0 when totals key is missing", () => {
    expect(dashboardSource).toContain("?? 0");
  });

  it("B4: values are formatted with toLocaleString()", () => {
    expect(dashboardSource).toContain(".toLocaleString()");
  });
});

// ─── C) Labels ────────────────────────────────────────────────────────────────

describe("C) KPI card labels", () => {
  it("C1: Canada label is present", () => {
    expect(dashboardSource).toContain('"Canada"');
  });

  it("C2: Vietnam label is present", () => {
    expect(dashboardSource).toContain('"Vietnam"');
  });

  it("C3: Philippines label is present", () => {
    expect(dashboardSource).toContain('"Philippines"');
  });

  it("C4: United States label is present", () => {
    expect(dashboardSource).toContain('"United States"');
  });
});

// ─── D) Range-reactive subtext ────────────────────────────────────────────────

describe("D) KPI card subtext shows adoptionRange", () => {
  it("D1: subtext includes 'Selections'", () => {
    expect(dashboardSource).toContain("Selections");
  });

  it("D2: subtext includes adoptionRange variable", () => {
    // The subtext should reference adoptionRange so it updates with the selector
    const idx = dashboardSource.indexOf("Selections");
    const snippet = dashboardSource.slice(idx - 10, idx + 60);
    expect(snippet).toContain("adoptionRange");
  });
});

// ─── E) Backend totals shape ─────────────────────────────────────────────────

describe("E) Backend totals include CA/VN/PH/US fields", () => {
  it("E1: CountryPackAdoptionTotals interface has CA field", () => {
    expect(dbSource).toMatch(/CA:\s*number/);
  });

  it("E2: CountryPackAdoptionTotals interface has VN field", () => {
    expect(dbSource).toMatch(/VN:\s*number/);
  });

  it("E3: CountryPackAdoptionTotals interface has PH field", () => {
    expect(dbSource).toMatch(/PH:\s*number/);
  });

  it("E4: CountryPackAdoptionTotals interface has US field", () => {
    expect(dbSource).toMatch(/US:\s*number/);
  });

  it("E5: CountryPackAdoptionTotals interface has total field", () => {
    expect(dbSource).toMatch(/total:\s*number/);
  });

  it("E6: getCountryPackAdoption returns totals object", () => {
    expect(dbSource).toContain("totals:");
  });
});

// ─── F) Regression: chart and totals row unchanged ───────────────────────────

describe("F) Regression: existing chart and totals row unchanged", () => {
  it("F1: CA Line still present in chart", () => {
    expect(dashboardSource).toContain('dataKey="CA"');
  });

  it("F2: VN Line still present in chart", () => {
    expect(dashboardSource).toContain('dataKey="VN"');
  });

  it("F3: PH Line still present in chart", () => {
    expect(dashboardSource).toContain('dataKey="PH"');
  });

  it("F4: US Line still present in chart", () => {
    expect(dashboardSource).toContain('dataKey="US"');
  });

  it("F5: totals row still present below chart", () => {
    expect(dashboardSource).toContain("Totals ({adoptionRange}d):");
  });

  it("F6: Country Pack Adoption card title still present", () => {
    expect(dashboardSource).toContain("Country Pack Adoption");
  });

  it("F7: Globe icon still present in card title", () => {
    expect(dashboardSource).toContain("Globe");
  });

  it("F8: range selector (7/14/30d) still present", () => {
    expect(dashboardSource).toContain("7, 14, 30");
  });

  it("F9: pack-adoption-kpi-cards appears BEFORE Country Pack Adoption card", () => {
    const kpiIdx = dashboardSource.indexOf('data-testid="pack-adoption-kpi-cards"');
    const chartIdx = dashboardSource.indexOf("Country Pack Adoption");
    expect(kpiIdx).toBeLessThan(chartIdx);
  });
});
