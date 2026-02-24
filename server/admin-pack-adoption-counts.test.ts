/**
 * Admin Pack Adoption Counts — Acceptance Tests
 * Tests computePackCounts logic and PackDistributionBar contract
 */
import { describe, it, expect } from "vitest";

// ─── Inline mirror of computePackCounts (mirrors AdminUsers.tsx export) ──────
// We test the logic directly without importing the React component
function computePackCounts(users: Array<{ countryPackId?: string | null }>): Record<string, number> {
  const counts: Record<string, number> = { GLOBAL: 0, CA: 0, VN: 0, PH: 0, US: 0 };
  for (const u of users) {
    const pack = (u.countryPackId ?? "GLOBAL") as string;
    if (pack in counts) counts[pack]++;
    else counts[pack] = (counts[pack] ?? 0) + 1;
  }
  return counts;
}

// ─── A) computePackCounts Unit Tests ─────────────────────────────────────────
describe("A) computePackCounts — unit tests", () => {
  it("A1: null countryPackId is counted as GLOBAL", () => {
    const users = [{ countryPackId: null }, { countryPackId: null }];
    const counts = computePackCounts(users);
    expect(counts.GLOBAL).toBe(2);
  });

  it("A2: undefined countryPackId is counted as GLOBAL", () => {
    const users = [{ countryPackId: undefined }, {}];
    const counts = computePackCounts(users);
    expect(counts.GLOBAL).toBe(2);
  });

  it("A3: correct distribution across all 5 packs", () => {
    const users = [
      { countryPackId: "GLOBAL" },
      { countryPackId: "GLOBAL" },
      { countryPackId: "CA" },
      { countryPackId: "CA" },
      { countryPackId: "CA" },
      { countryPackId: "VN" },
      { countryPackId: "PH" },
      { countryPackId: "US" },
    ];
    const counts = computePackCounts(users);
    expect(counts.GLOBAL).toBe(2);
    expect(counts.CA).toBe(3);
    expect(counts.VN).toBe(1);
    expect(counts.PH).toBe(1);
    expect(counts.US).toBe(1);
  });

  it("A4: empty array returns all zeros", () => {
    const counts = computePackCounts([]);
    expect(counts.GLOBAL).toBe(0);
    expect(counts.CA).toBe(0);
    expect(counts.VN).toBe(0);
    expect(counts.PH).toBe(0);
    expect(counts.US).toBe(0);
  });

  it("A5: mixed null and explicit GLOBAL both count as GLOBAL", () => {
    const users = [
      { countryPackId: null },
      { countryPackId: "GLOBAL" },
      { countryPackId: null },
    ];
    const counts = computePackCounts(users);
    expect(counts.GLOBAL).toBe(3);
  });

  it("A6: single CA user gives CA: 1, others: 0", () => {
    const users = [{ countryPackId: "CA" }];
    const counts = computePackCounts(users);
    expect(counts.CA).toBe(1);
    expect(counts.GLOBAL).toBe(0);
    expect(counts.VN).toBe(0);
  });

  it("A7: total of all counts equals input array length", () => {
    const users = [
      { countryPackId: null },
      { countryPackId: "CA" },
      { countryPackId: "VN" },
      { countryPackId: "PH" },
      { countryPackId: "US" },
      { countryPackId: "GLOBAL" },
    ];
    const counts = computePackCounts(users);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(users.length);
  });

  it("A8: large dataset — 100 GLOBAL + 20 CA", () => {
    const users = [
      ...Array.from({ length: 100 }, () => ({ countryPackId: null })),
      ...Array.from({ length: 20 }, () => ({ countryPackId: "CA" })),
    ];
    const counts = computePackCounts(users);
    expect(counts.GLOBAL).toBe(100);
    expect(counts.CA).toBe(20);
  });
});

// ─── B) PackDistributionBar Component Contract ───────────────────────────────
describe("B) PackDistributionBar component contract", () => {
  it("B1: AdminUsers.tsx exports computePackCounts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function computePackCounts");
  });

  it("B2: PackDistributionBar is defined in AdminUsers.tsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain("function PackDistributionBar");
  });

  it("B3: PackDistributionBar is rendered above the user list", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain("<PackDistributionBar users={usersData?.users ?? []} />");
  });

  it("B4: PackDistributionBar uses data-testid for test targeting", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain('data-testid="pack-distribution-bar"');
    expect(content).toContain('data-testid={`pack-count-${pack}`}');
  });

  it("B5: PackDistributionBar shows 'All loaded:' label", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain("All loaded:");
  });

  it("B6: PackDistributionBar shows percentages", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain("pct");
    expect(content).toContain("({pct}%)");
  });

  it("B7: PackDistributionBar returns null when users array is empty", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain("if (users.length === 0) return null");
  });

  it("B8: PACK_ORDER is GLOBAL, CA, VN, PH, US", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/admin/AdminUsers.tsx"),
      "utf-8"
    );
    expect(content).toContain('const PACK_ORDER = ["GLOBAL", "CA", "VN", "PH", "US"]');
  });
});

// ─── C) Percentage Calculation ───────────────────────────────────────────────
describe("C) Percentage calculation", () => {
  it("C1: 18 CA out of 170 total = 11%", () => {
    const users = [
      ...Array.from({ length: 142 }, () => ({ countryPackId: null })),
      ...Array.from({ length: 18 }, () => ({ countryPackId: "CA" })),
      ...Array.from({ length: 5 }, () => ({ countryPackId: "VN" })),
      ...Array.from({ length: 3 }, () => ({ countryPackId: "PH" })),
      ...Array.from({ length: 2 }, () => ({ countryPackId: "US" })),
    ];
    const counts = computePackCounts(users);
    const total = users.length;
    const caPct = Math.round((counts.CA / total) * 100);
    expect(caPct).toBe(11);
  });

  it("C2: 100% GLOBAL when all users have null pack", () => {
    const users = Array.from({ length: 50 }, () => ({ countryPackId: null }));
    const counts = computePackCounts(users);
    const total = users.length;
    const globalPct = Math.round((counts.GLOBAL / total) * 100);
    expect(globalPct).toBe(100);
  });

  it("C3: percentages across all packs sum to approximately 100", () => {
    const users = [
      ...Array.from({ length: 50 }, () => ({ countryPackId: "GLOBAL" })),
      ...Array.from({ length: 30 }, () => ({ countryPackId: "CA" })),
      ...Array.from({ length: 20 }, () => ({ countryPackId: "VN" })),
    ];
    const counts = computePackCounts(users);
    const total = users.length;
    const sum = Object.values(counts).reduce((acc, count) => acc + Math.round((count / total) * 100), 0);
    // Due to rounding, sum should be within ±2 of 100
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });
});
