/**
 * country-pack-adoption.test.ts
 *
 * Tests for the Country Pack Adoption chart feature:
 *   A) getCountryPackAdoption() query shape and correctness
 *   B) tRPC admin.countryPackAdoption.daily procedure
 *   C) Frontend card rendering (source-level checks)
 *   D) Regression: existing Growth dashboard procedures unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Source file content (loaded once) ────────────────────────────────────────
const dbSource = readFileSync(join(__dirname, "../server/db.ts"), "utf-8");
const adminRouterSource = readFileSync(join(__dirname, "../server/routers/admin.ts"), "utf-8");
const growthUISource = readFileSync(join(__dirname, "../client/src/pages/admin/AdminGrowthDashboard.tsx"), "utf-8");

// ─── A) Backend query: getCountryPackAdoption ─────────────────────────────────

describe("A) getCountryPackAdoption — server/db.ts", () => {
  it("A1: function is exported from db.ts", () => {
    expect(dbSource).toContain("export async function getCountryPackAdoption(");
  });

  it("A2: function accepts rangeDays: 7 | 14 | 30", () => {
    expect(dbSource).toContain("rangeDays: 7 | 14 | 30");
  });

  it("A3: query filters by eventName = 'country_pack_selected'", () => {
    expect(dbSource).toContain("country_pack_selected");
  });

  it("A4: query extracts country_pack_id from props JSON column", () => {
    expect(dbSource).toContain("JSON_EXTRACT");
    expect(dbSource).toContain("country_pack_id");
  });

  it("A5: query groups by date bucket (DATE_FORMAT)", () => {
    expect(dbSource).toContain("DATE_FORMAT");
    expect(dbSource).toContain("GROUP BY");
  });

  it("A6: CountryPackAdoptionBucket interface exported with CA, VN, PH, US, OTHER fields", () => {
    expect(dbSource).toContain("export interface CountryPackAdoptionBucket");
    expect(dbSource).toContain("CA: number");
    expect(dbSource).toContain("VN: number");
    expect(dbSource).toContain("PH: number");
    expect(dbSource).toContain("US: number");
    expect(dbSource).toContain("OTHER: number");
  });

  it("A7: CountryPackAdoptionTotals interface exported with total field", () => {
    expect(dbSource).toContain("export interface CountryPackAdoptionTotals");
    expect(dbSource).toContain("total: number");
  });

  it("A8: function returns { data, totals } shape", () => {
    expect(dbSource).toContain("return { data, totals }");
  });

  it("A9: zero-filled buckets are seeded for all days in range", () => {
    expect(dbSource).toContain("for (let i = rangeDays - 1; i >= 0; i--)");
    expect(dbSource).toContain("CA: 0, VN: 0, PH: 0, US: 0, OTHER: 0");
  });

  it("A10: totals.total = sum of CA + VN + PH + US + OTHER", () => {
    expect(dbSource).toContain("totals.total = totals.CA + totals.VN + totals.PH + totals.US + totals.OTHER");
  });

  it("A11: unknown pack IDs fall into OTHER bucket (not US)", () => {
    // The logic: if pack !== CA, VN, PH, US → b.OTHER += cnt
    expect(dbSource).toContain("else b.OTHER += cnt");
    // US gets its own bucket now
    expect(dbSource).toContain("else if (pack === 'US') b.US += cnt");
  });

  it("A12: null country_pack_id falls into OTHER bucket", () => {
    // The logic: (row.country_pack_id ?? 'OTHER').toUpperCase()
    expect(dbSource).toContain("?? 'OTHER'");
  });

  it("A13: data is sorted ascending by date", () => {
    expect(dbSource).toContain("a.date.localeCompare(b.date)");
  });

  it("A14: returns empty result when db is null (no DB connection)", () => {
    expect(dbSource).toContain("if (!db) return empty()");
  });
});

// ─── B) tRPC procedure: admin.countryPackAdoption.daily ───────────────────────

describe("B) admin.countryPackAdoption.daily — server/routers/admin.ts", () => {
  it("B1: countryPackAdoption router is defined in admin.ts", () => {
    expect(adminRouterSource).toContain("countryPackAdoption: router({");
  });

  it("B2: daily procedure exists with rangeDays input", () => {
    expect(adminRouterSource).toContain("daily: adminProcedure.input(");
    // The countryPackAdoption.daily procedure
    const idx = adminRouterSource.indexOf("countryPackAdoption: router({");
    const snippet = adminRouterSource.slice(idx, idx + 500);
    expect(snippet).toContain("rangeDays");
  });

  it("B3: procedure is gated behind v2GrowthDashboardEnabled flag", () => {
    const idx = adminRouterSource.indexOf("countryPackAdoption: router({");
    const snippet = adminRouterSource.slice(idx, idx + 500);
    expect(snippet).toContain("v2GrowthDashboardEnabled");
  });

  it("B4: procedure calls db.getCountryPackAdoption", () => {
    expect(adminRouterSource).toContain("db.getCountryPackAdoption(");
  });

  it("B5: procedure returns { enabled, data, totals }", () => {
    const idx = adminRouterSource.indexOf("countryPackAdoption: router({");
    const snippet = adminRouterSource.slice(idx, idx + 600);
    expect(snippet).toContain("enabled: true");
    expect(snippet).toContain("data");
    expect(snippet).toContain("totals");
  });

  it("B6: procedure returns { enabled: false } when flag OFF", () => {
    const idx = adminRouterSource.indexOf("countryPackAdoption: router({");
    const snippet = adminRouterSource.slice(idx, idx + 600);
    expect(snippet).toContain("enabled: false");
  });

  it("B7: default rangeDays is 30", () => {
    const idx = adminRouterSource.indexOf("countryPackAdoption: router({");
    const snippet = adminRouterSource.slice(idx, idx + 400);
    expect(snippet).toContain(".default(30)");
  });

  it("B8: procedure is adminProcedure (not publicProcedure or protectedProcedure)", () => {
    const idx = adminRouterSource.indexOf("countryPackAdoption: router({");
    const snippet = adminRouterSource.slice(idx, idx + 400);
    expect(snippet).toContain("adminProcedure");
    expect(snippet).not.toContain("publicProcedure");
    expect(snippet).not.toContain("protectedProcedure");
  });
});

// ─── C) Frontend card: AdminGrowthDashboard.tsx ───────────────────────────────

describe("C) Country Pack Adoption card — AdminGrowthDashboard.tsx", () => {
  it("C1: trpc.admin.countryPackAdoption.daily.useQuery is called", () => {
    expect(growthUISource).toContain("trpc.admin.countryPackAdoption.daily.useQuery");
  });

  it("C2: adoptionRange state is initialized to 30", () => {
    expect(growthUISource).toContain("useState<7 | 14 | 30>(30)");
  });

  it("C3: card title is 'Country Pack Adoption'", () => {
    expect(growthUISource).toContain("Country Pack Adoption");
  });

  it("C4: range selector buttons (7d, 14d, 30d) are rendered", () => {
    // The adoption range selector uses the same pattern as the timeline range selector
    expect(growthUISource).toContain("setAdoptionRange(r)");
  });

  it("C5: CA line is rendered with red stroke", () => {
    expect(growthUISource).toContain('dataKey="CA"');
    expect(growthUISource).toContain('#ef4444');
  });

  it("C6: VN line is rendered with amber stroke", () => {
    expect(growthUISource).toContain('dataKey="VN"');
    expect(growthUISource).toContain('#f59e0b');
  });

  it("C7: PH line is rendered with blue stroke", () => {
    expect(growthUISource).toContain('dataKey="PH"');
    expect(growthUISource).toContain('#3b82f6');
  });

  it("C8: Legend component is imported and used", () => {
    expect(growthUISource).toContain("Legend");
    expect(growthUISource).toContain("<Legend");
  });

  it("C9: totals row shows CA, VN, PH counts", () => {
    expect(growthUISource).toContain("adoptionData.totals.CA");
    expect(growthUISource).toContain("adoptionData.totals.VN");
    expect(growthUISource).toContain("adoptionData.totals.PH");
  });

  it("C10: totals row shows total count", () => {
    expect(growthUISource).toContain("adoptionData.totals.total");
  });

  it("C11: loading state shows 'Loading…' placeholder", () => {
    expect(growthUISource).toContain("adoptionLoading");
  });

  it("C12: analytics-off state shows enable message", () => {
    // When analyticsEnabled is false, shows a message to enable analytics
    const idx = growthUISource.indexOf("Country Pack Adoption");
    const snippet = growthUISource.slice(idx, idx + 2000);
    expect(snippet).toContain("V2_ANALYTICS_ENABLED");
  });

  it("C13: empty state shows 'No pack selection events yet'", () => {
    expect(growthUISource).toContain("No pack selection events yet");
  });

  it("C14: Globe icon is imported and used in card title", () => {
    expect(growthUISource).toContain("Globe");
    expect(growthUISource).toContain("<Globe");
  });

  it("C15: OTHER line is conditionally rendered only when OTHER > 0", () => {
    expect(growthUISource).toContain("adoptionData.totals.OTHER > 0");
  });

  it("C17: OTHER series label is 'Global' (not 'Other') in chart legend", () => {
    expect(growthUISource).toContain('name="Global"');
    expect(growthUISource).not.toContain('name="Other"');
  });

  it("C18: totals row uses 'Global:' label (not 'Other:')", () => {
    expect(growthUISource).toContain("Global:");
    // 'Other:' must not appear in the adoption card area
    const idx = growthUISource.indexOf("Country Pack Adoption");
    const snippet = growthUISource.slice(idx, idx + 2500);
    expect(snippet).not.toContain("Other:");
  });

  it("C16: adoptionRange is shown in totals label (e.g. 'Totals (30d):')", () => {
    expect(growthUISource).toContain("Totals ({adoptionRange}d):");
  });

  it("C19: US line is rendered with green stroke", () => {
    expect(growthUISource).toContain('dataKey="US"');
    expect(growthUISource).toContain('#22c55e');
  });

  it("C20: totals row includes US count", () => {
    expect(growthUISource).toContain("adoptionData.totals.US");
  });

  it("C21: US line has name='US'", () => {
    expect(growthUISource).toContain('name="US"');
  });

  it("C22: US totals dot uses green color", () => {
    // bg-green-500 for US dot in totals row
    const idx = growthUISource.indexOf("adoptionData.totals.US");
    const snippet = growthUISource.slice(Math.max(0, idx - 100), idx + 100);
    expect(snippet).toContain("green");
  });
});

// ─── D) Regression: existing Growth dashboard procedures unchanged ─────────────

describe("D) Regression: existing Growth dashboard procedures unchanged", () => {
  it("D1: admin.growth.kpis procedure still exists", () => {
    expect(adminRouterSource).toContain("growth: router({");
    expect(adminRouterSource).toContain("kpis: adminProcedure");
  });

  it("D2: admin.timeline.daily procedure still exists", () => {
    expect(adminRouterSource).toContain("timeline: router({");
    expect(adminRouterSource).toContain("getDailyMetrics");
  });

  it("D3: getDailyMetrics function still exists in db.ts", () => {
    expect(dbSource).toContain("export async function getDailyMetrics(");
  });

  it("D4: DailyMetricBucket interface still has all original fields", () => {
    expect(dbSource).toContain("eventsTotal: number");
    expect(dbSource).toContain("newUsers: number");
    expect(dbSource).toContain("jobCardCreated: number");
    expect(dbSource).toContain("quickMatchRun: number");
    expect(dbSource).toContain("outreachGenerated: number");
  });

  it("D5: existing timeline chart in AdminGrowthDashboard still uses trpc.admin.timeline.daily", () => {
    expect(growthUISource).toContain("trpc.admin.timeline.daily.useQuery");
  });

  it("D6: existing METRIC_OPTIONS array is unchanged", () => {
    expect(growthUISource).toContain("eventsTotal");
    expect(growthUISource).toContain("newUsers");
    expect(growthUISource).toContain("jobCardCreated");
    expect(growthUISource).toContain("outreachGenerated");
  });

  it("D7: countryPackAdoption router does not modify growth.kpis response shape", () => {
    // The growth.kpis procedure returns the same shape; countryPackAdoption is a separate router
    const kpisIdx = adminRouterSource.indexOf("growth: router({");
    const kpisSnippet = adminRouterSource.slice(kpisIdx, kpisIdx + 800);
    // kpis should NOT contain countryPackAdoption
    expect(kpisSnippet).not.toContain("countryPackAdoption");
  });
});
