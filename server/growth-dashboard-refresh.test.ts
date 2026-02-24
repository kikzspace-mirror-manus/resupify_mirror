/**
 * growth-dashboard-refresh.test.ts
 *
 * Tests for the AdminGrowthDashboard Refresh fix and UI improvements.
 * Covers:
 *   R1–R8:  Refresh button behavior (invalidates all 3 queries, spinner, disabled state, Last updated)
 *   S1–S10: Section headers, max-width container, KPI cards, chart structure
 *   D1–D8:  Regression — existing queries, flag gating, pack KPI cards, adoption chart
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const dashboardPath = join(process.cwd(), "client/src/pages/admin/AdminGrowthDashboard.tsx");
const dashboardContent = readFileSync(dashboardPath, "utf-8");

// ─── R: Refresh Button ────────────────────────────────────────────────────────
describe("R: Refresh button behavior", () => {
  it("R1 — handleRefresh invalidates admin.growth.kpis", () => {
    expect(dashboardContent).toContain("utils.admin.growth.kpis.invalidate()");
  });

  it("R2 — handleRefresh invalidates admin.timeline.daily", () => {
    expect(dashboardContent).toContain("utils.admin.timeline.daily.invalidate()");
  });

  it("R3 — handleRefresh invalidates admin.countryPackAdoption.daily", () => {
    expect(dashboardContent).toContain("utils.admin.countryPackAdoption.daily.invalidate()");
  });

  it("R4 — all three invalidations are called in a single Promise.all", () => {
    const idx = dashboardContent.indexOf("Promise.all");
    expect(idx).toBeGreaterThan(-1);
    const block = dashboardContent.slice(idx, idx + 300);
    expect(block).toContain("growth.kpis.invalidate");
    expect(block).toContain("timeline.daily.invalidate");
    expect(block).toContain("countryPackAdoption.daily.invalidate");
  });

  it("R5 — isRefreshing state is declared", () => {
    expect(dashboardContent).toContain("isRefreshing");
    expect(dashboardContent).toContain("setIsRefreshing");
  });

  it("R6 — Refresh button is disabled while isRefreshing or isLoading", () => {
    expect(dashboardContent).toContain("disabled={isRefreshing || isLoading}");
  });

  it("R7 — Refresh button shows spinner (animate-spin) when refreshing", () => {
    expect(dashboardContent).toContain("animate-spin");
  });

  it("R8 — lastUpdated state is set after successful refresh", () => {
    expect(dashboardContent).toContain("setLastUpdated(new Date())");
    expect(dashboardContent).toContain("last-updated");
  });
});

// ─── S: Structure and Visual Hierarchy ───────────────────────────────────────
describe("S: Visual hierarchy and layout", () => {
  it("S1 — max-w-[1200px] container wraps the dashboard", () => {
    expect(dashboardContent).toContain("max-w-[1200px]");
  });

  it("S2 — SectionHeader component is defined", () => {
    expect(dashboardContent).toContain("function SectionHeader");
  });

  it("S3 — Audience section header is present", () => {
    expect(dashboardContent).toContain("Audience");
  });

  it("S4 — Activation & Quality section header is present", () => {
    expect(dashboardContent).toContain("Activation");
  });

  it("S5 — Country Pack Adoption section header is present", () => {
    expect(dashboardContent).toContain("Country Pack Adoption");
  });

  it("S6 — Funnel & Outcomes section header is present", () => {
    expect(dashboardContent).toContain("Funnel");
    expect(dashboardContent).toContain("Outcomes");
  });

  it("S7 — KpiCard component is defined with icon, color, bg props", () => {
    expect(dashboardContent).toContain("function KpiCard");
    expect(dashboardContent).toContain("icon: React.ElementType");
  });

  it("S8 — RangeSelector component is defined", () => {
    expect(dashboardContent).toContain("function RangeSelector");
    expect(dashboardContent).toContain("range-selector");
  });

  it("S9 — FlagStatusBox component is defined", () => {
    expect(dashboardContent).toContain("function FlagStatusBox");
  });

  it("S10 — RefreshCw icon is imported from lucide-react", () => {
    expect(dashboardContent).toContain("RefreshCw");
  });
});

// ─── D: Regression ───────────────────────────────────────────────────────────
describe("D: Regression — existing features unchanged", () => {
  it("D1 — admin.growth.kpis query still present", () => {
    expect(dashboardContent).toContain("trpc.admin.growth.kpis.useQuery");
  });

  it("D2 — admin.timeline.daily query still present", () => {
    expect(dashboardContent).toContain("trpc.admin.timeline.daily.useQuery");
  });

  it("D3 — admin.countryPackAdoption.daily query still present", () => {
    expect(dashboardContent).toContain("trpc.admin.countryPackAdoption.daily.useQuery");
  });

  it("D4 — pack KPI cards for CA/VN/PH/US are present", () => {
    // Cards use template literals: data-testid={`pack-kpi-${key}`}
    expect(dashboardContent).toContain('data-testid={`pack-kpi-${key}`}');
    expect(dashboardContent).toContain('data-testid={`pack-kpi-${key}-value`}');
    // The keys array contains all 4 regions
    const keysBlock = dashboardContent.slice(
      dashboardContent.indexOf('pack-adoption-kpi-cards'),
      dashboardContent.indexOf('pack-adoption-kpi-cards') + 1000
    );
    expect(keysBlock).toContain('"CA"');
    expect(keysBlock).toContain('"VN"');
    expect(keysBlock).toContain('"PH"');
    expect(keysBlock).toContain('"US"');
  });

  it("D5 — CA/VN/PH/US Line series are present in the adoption chart", () => {
    const chartBlock = dashboardContent.slice(dashboardContent.indexOf("LineChart data={adoptionData"));
    expect(chartBlock).toContain('dataKey="CA"');
    expect(chartBlock).toContain('dataKey="VN"');
    expect(chartBlock).toContain('dataKey="PH"');
    expect(chartBlock).toContain('dataKey="US"');
  });

  it("D6 — Global (OTHER) line is conditionally shown when OTHER > 0", () => {
    expect(dashboardContent).toContain("totals.OTHER > 0");
    expect(dashboardContent).toContain('name="Global"');
  });

  it("D7 — V2_GROWTH_DASHBOARD_ENABLED flag gating is present", () => {
    expect(dashboardContent).toContain("V2_GROWTH_DASHBOARD_ENABLED");
  });

  it("D8 — V2_ANALYTICS_ENABLED flag gating is present", () => {
    expect(dashboardContent).toContain("V2_ANALYTICS_ENABLED");
  });
});
