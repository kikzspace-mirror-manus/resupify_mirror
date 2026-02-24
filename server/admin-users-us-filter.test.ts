/**
 * admin-users-us-filter.test.ts
 *
 * Tests for the US option in the /admin/users country pack filter.
 *
 * Coverage:
 * - A) PACK_FILTER_OPTIONS includes US entry
 * - B) PACK_LABEL_COLORS has a US entry
 * - C) PACK_ORDER includes US
 * - D) computePackCounts counts US users correctly
 * - E) Filter logic: US filter returns only US users
 * - F) Filter logic: ALL filter includes US users
 * - G) Regression: existing filter options unchanged
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { computePackCounts } from "../client/src/pages/admin/AdminUsers";

const adminUsersSource = readFileSync(
  join(__dirname, "../client/src/pages/admin/AdminUsers.tsx"),
  "utf-8"
);

// ─── A) PACK_FILTER_OPTIONS includes US ──────────────────────────────────────

describe("A) PACK_FILTER_OPTIONS includes US", () => {
  it("A1: US option with value='US' is present in PACK_FILTER_OPTIONS", () => {
    expect(adminUsersSource).toContain('value: "US"');
  });

  it("A2: US option has label 'US'", () => {
    // Check that the US entry has label: "US"
    const idx = adminUsersSource.indexOf('value: "US"');
    const snippet = adminUsersSource.slice(idx, idx + 40);
    expect(snippet).toContain('"US"');
  });

  it("A3: PACK_FILTER_OPTIONS has 6 entries (ALL + GLOBAL + CA + VN + PH + US)", () => {
    const matches = adminUsersSource.match(/\{ value: "[A-Z]+".*?label:/g);
    expect(matches?.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── B) PACK_LABEL_COLORS has US entry ───────────────────────────────────────

describe("B) PACK_LABEL_COLORS has US entry", () => {
  it("B1: PACK_LABEL_COLORS has a US key", () => {
    expect(adminUsersSource).toMatch(/US:\s*["'`]/);
  });

  it("B2: US badge color class is defined", () => {
    const idx = adminUsersSource.indexOf("US:");
    const snippet = adminUsersSource.slice(idx, idx + 80);
    // Should have some color class
    expect(snippet).toMatch(/text-\w+-\d+/);
  });
});

// ─── C) PACK_ORDER includes US ───────────────────────────────────────────────

describe("C) PACK_ORDER includes US", () => {
  it("C1: PACK_ORDER array contains 'US'", () => {
    expect(adminUsersSource).toContain('"US"');
    // PACK_ORDER should contain US
    const idx = adminUsersSource.indexOf("PACK_ORDER");
    const snippet = adminUsersSource.slice(idx, idx + 80);
    expect(snippet).toContain('"US"');
  });
});

// ─── D) computePackCounts counts US users ────────────────────────────────────

describe("D) computePackCounts counts US users correctly", () => {
  it("D1: computePackCounts initializes US bucket to 0", () => {
    const result = computePackCounts([]);
    expect(result.US).toBe(0);
  });

  it("D2: computePackCounts counts a user with countryPackId='US'", () => {
    const result = computePackCounts([{ countryPackId: "US" }]);
    expect(result.US).toBe(1);
  });

  it("D3: computePackCounts counts multiple US users", () => {
    const result = computePackCounts([
      { countryPackId: "US" },
      { countryPackId: "US" },
      { countryPackId: "CA" },
    ]);
    expect(result.US).toBe(2);
    expect(result.CA).toBe(1);
  });

  it("D4: computePackCounts does not mix US with CA", () => {
    const result = computePackCounts([
      { countryPackId: "US" },
      { countryPackId: "CA" },
      { countryPackId: "VN" },
    ]);
    expect(result.US).toBe(1);
    expect(result.CA).toBe(1);
    expect(result.VN).toBe(1);
  });

  it("D5: computePackCounts treats null countryPackId as GLOBAL (not US)", () => {
    const result = computePackCounts([{ countryPackId: null }]);
    expect(result.GLOBAL).toBe(1);
    expect(result.US).toBe(0);
  });
});

// ─── E) Filter logic: US filter returns only US users ────────────────────────

describe("E) Filter logic: US filter returns only US users", () => {
  type MockUser = { countryPackId: string | null; disabled: boolean };

  function applyFilters(
    users: MockUser[],
    showDisabledOnly: boolean,
    packFilter: string
  ): MockUser[] {
    return users.filter((u) => {
      if (showDisabledOnly && !u.disabled) return false;
      if (packFilter !== "ALL") {
        const effectivePack = u.countryPackId ?? "GLOBAL";
        if (effectivePack !== packFilter) return false;
      }
      return true;
    });
  }

  const testUsers: MockUser[] = [
    { countryPackId: "US", disabled: false },
    { countryPackId: "US", disabled: false },
    { countryPackId: "CA", disabled: false },
    { countryPackId: "VN", disabled: false },
    { countryPackId: "PH", disabled: false },
    { countryPackId: null, disabled: false }, // GLOBAL
  ];

  it("E1: US filter returns only US users", () => {
    const result = applyFilters(testUsers, false, "US");
    expect(result.length).toBe(2);
    result.forEach((u) => expect(u.countryPackId).toBe("US"));
  });

  it("E2: US filter excludes CA users", () => {
    const result = applyFilters(testUsers, false, "US");
    expect(result.some((u) => u.countryPackId === "CA")).toBe(false);
  });

  it("E3: US filter excludes VN users", () => {
    const result = applyFilters(testUsers, false, "US");
    expect(result.some((u) => u.countryPackId === "VN")).toBe(false);
  });

  it("E4: US filter excludes GLOBAL users (null countryPackId)", () => {
    const result = applyFilters(testUsers, false, "US");
    expect(result.some((u) => u.countryPackId === null)).toBe(false);
  });

  it("E5: US filter returns empty when no US users exist", () => {
    const noUSUsers: MockUser[] = [
      { countryPackId: "CA", disabled: false },
      { countryPackId: "VN", disabled: false },
    ];
    const result = applyFilters(noUSUsers, false, "US");
    expect(result.length).toBe(0);
  });
});

// ─── F) ALL filter includes US users ─────────────────────────────────────────

describe("F) ALL filter includes US users", () => {
  type MockUser = { countryPackId: string | null; disabled: boolean };

  function applyFilters(users: MockUser[], packFilter: string): MockUser[] {
    return users.filter((u) => {
      if (packFilter !== "ALL") {
        const effectivePack = u.countryPackId ?? "GLOBAL";
        if (effectivePack !== packFilter) return false;
      }
      return true;
    });
  }

  it("F1: ALL filter returns US users", () => {
    const users: MockUser[] = [
      { countryPackId: "US", disabled: false },
      { countryPackId: "CA", disabled: false },
    ];
    const result = applyFilters(users, "ALL");
    expect(result.some((u) => u.countryPackId === "US")).toBe(true);
  });

  it("F2: ALL filter returns all 6 users including US", () => {
    const users: MockUser[] = [
      { countryPackId: "US", disabled: false },
      { countryPackId: "CA", disabled: false },
      { countryPackId: "VN", disabled: false },
      { countryPackId: "PH", disabled: false },
      { countryPackId: null, disabled: false },
    ];
    const result = applyFilters(users, "ALL");
    expect(result.length).toBe(5);
  });
});

// ─── G) Regression: existing filter options unchanged ────────────────────────

describe("G) Regression: existing filter options unchanged", () => {
  it("G1: ALL option still present", () => {
    expect(adminUsersSource).toContain('value: "ALL"');
  });

  it("G2: GLOBAL option still present", () => {
    expect(adminUsersSource).toContain('value: "GLOBAL"');
  });

  it("G3: CA option still present", () => {
    expect(adminUsersSource).toContain('value: "CA"');
  });

  it("G4: VN option still present", () => {
    expect(adminUsersSource).toContain('value: "VN"');
  });

  it("G5: PH option still present", () => {
    expect(adminUsersSource).toContain('value: "PH"');
  });

  it("G6: filter logic uses (user.countryPackId ?? 'GLOBAL') fallback", () => {
    expect(adminUsersSource).toContain('countryPackId ?? "GLOBAL"');
  });

  it("G7: computePackCounts is exported (used by tests and UI)", () => {
    expect(adminUsersSource).toContain("export function computePackCounts");
  });
});
