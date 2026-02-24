/**
 * Admin Country Pack Visibility Tests
 * V2 Phase: Admin — Country Pack + Language Mode Visibility
 *
 * Tests that:
 * A) adminListUsers returns countryPackId and languageMode fields
 * B) Pack filter logic correctly filters by effective pack (null → GLOBAL)
 * C) Language mode badge logic (only shown when non-default)
 * D) Pack badge color map covers all 5 packs
 * E) Regression: existing admin user fields are preserved
 */

import { describe, it, expect } from "vitest";
import { countryPackRegistry, COUNTRY_PACK_IDS, DEFAULT_COUNTRY_PACK_ID } from "../shared/countryPacks";
import fs from "fs";
import path from "path";

// ─── A) adminListUsers returns countryPackId and languageMode ─────────────────

describe("A) adminListUsers DB helper includes V2 fields", () => {
  it("A1: adminListUsers does a full select() from users (returns all columns including countryPackId/languageMode)", () => {
    const dbContent = fs.readFileSync(path.join(__dirname, "db.ts"), "utf-8");
    const idx = dbContent.indexOf("export async function adminListUsers");
    expect(idx).toBeGreaterThan(-1);
    const slice = dbContent.slice(idx, idx + 600);
    // Uses db.select().from(users) — returns all columns
    expect(slice).toMatch(/db\.select\(\)\.from\(users\)/);
  });

  it("A2: users table schema has countryPackId column", () => {
    const schemaContent = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
    expect(schemaContent).toMatch(/countryPackId/);
  });

  it("A3: users table schema has languageMode column", () => {
    const schemaContent = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
    expect(schemaContent).toMatch(/languageMode/);
  });
});

// ─── B) Pack filter logic ─────────────────────────────────────────────────────

describe("B) Pack filter logic (client-side)", () => {
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

  const users: MockUser[] = [
    { countryPackId: null, disabled: false },       // → GLOBAL
    { countryPackId: "GLOBAL", disabled: false },
    { countryPackId: "CA", disabled: false },
    { countryPackId: "VN", disabled: false },
    { countryPackId: "PH", disabled: true },
    { countryPackId: "US", disabled: false },
  ];

  it("B1: ALL filter returns all users", () => {
    expect(applyFilters(users, false, "ALL")).toHaveLength(6);
  });

  it("B2: GLOBAL filter returns users with null or GLOBAL countryPackId", () => {
    const result = applyFilters(users, false, "GLOBAL");
    expect(result).toHaveLength(2);
    result.forEach((u) => expect(u.countryPackId ?? "GLOBAL").toBe("GLOBAL"));
  });

  it("B3: CA filter returns only CA users", () => {
    const result = applyFilters(users, false, "CA");
    expect(result).toHaveLength(1);
    expect(result[0].countryPackId).toBe("CA");
  });

  it("B4: VN filter returns only VN users", () => {
    const result = applyFilters(users, false, "VN");
    expect(result).toHaveLength(1);
    expect(result[0].countryPackId).toBe("VN");
  });

  it("B5: PH filter returns only PH users (including disabled)", () => {
    const result = applyFilters(users, false, "PH");
    expect(result).toHaveLength(1);
    expect(result[0].countryPackId).toBe("PH");
  });

  it("B6: US filter returns only US users", () => {
    const result = applyFilters(users, false, "US");
    expect(result).toHaveLength(1);
    expect(result[0].countryPackId).toBe("US");
  });

  it("B7: showDisabledOnly=true + ALL filter returns only disabled users", () => {
    const result = applyFilters(users, true, "ALL");
    expect(result).toHaveLength(1);
    expect(result[0].disabled).toBe(true);
  });

  it("B8: showDisabledOnly=true + PH filter returns disabled PH user", () => {
    const result = applyFilters(users, true, "PH");
    expect(result).toHaveLength(1);
    expect(result[0].countryPackId).toBe("PH");
    expect(result[0].disabled).toBe(true);
  });

  it("B9: showDisabledOnly=true + CA filter returns empty (CA user is not disabled)", () => {
    const result = applyFilters(users, true, "CA");
    expect(result).toHaveLength(0);
  });
});

// ─── C) Language mode badge logic ─────────────────────────────────────────────

describe("C) Language mode badge visibility logic", () => {
  function shouldShowLanguageBadge(languageMode: string | null | undefined): boolean {
    return !!(languageMode && languageMode !== "en");
  }

  it("C1: languageMode=null → badge hidden", () => {
    expect(shouldShowLanguageBadge(null)).toBe(false);
  });

  it("C2: languageMode=undefined → badge hidden", () => {
    expect(shouldShowLanguageBadge(undefined)).toBe(false);
  });

  it("C3: languageMode='en' → badge hidden (default)", () => {
    expect(shouldShowLanguageBadge("en")).toBe(false);
  });

  it("C4: languageMode='vi' → badge shown", () => {
    expect(shouldShowLanguageBadge("vi")).toBe(true);
  });

  it("C5: languageMode='bilingual' → badge shown", () => {
    expect(shouldShowLanguageBadge("bilingual")).toBe(true);
  });
});

// ─── D) Pack badge color map covers all packs ─────────────────────────────────

describe("D) Pack badge color map", () => {
  const PACK_BADGE_COLORS: Record<string, string> = {
    CA: "text-red-700 border-red-300 bg-red-50",
    VN: "text-yellow-700 border-yellow-300 bg-yellow-50",
    PH: "text-blue-700 border-blue-300 bg-blue-50",
    US: "text-indigo-700 border-indigo-300 bg-indigo-50",
    GLOBAL: "text-gray-600 border-gray-300",
  };

  it("D1: PACK_BADGE_COLORS has an entry for every country pack ID", () => {
    for (const packId of COUNTRY_PACK_IDS) {
      expect(PACK_BADGE_COLORS).toHaveProperty(packId);
    }
  });

  it("D2: PACK_BADGE_COLORS has an entry for GLOBAL (default fallback)", () => {
    expect(PACK_BADGE_COLORS).toHaveProperty("GLOBAL");
  });

  it("D3: CA badge uses red color scheme", () => {
    expect(PACK_BADGE_COLORS["CA"]).toContain("red");
  });

  it("D4: VN badge uses yellow color scheme", () => {
    expect(PACK_BADGE_COLORS["VN"]).toContain("yellow");
  });
});

// ─── E) AdminUsers.tsx file structure regression ──────────────────────────────

describe("E) AdminUsers.tsx includes V2 pack visibility", () => {
  const adminUsersPath = path.join(__dirname, "../client/src/pages/admin/AdminUsers.tsx");

  it("E1: AdminUsers.tsx exists", () => {
    expect(fs.existsSync(adminUsersPath)).toBe(true);
  });

  it("E2: AdminUsers.tsx has packFilter state", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/packFilter/);
  });

  it("E3: AdminUsers.tsx has pack filter Select dropdown", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/SelectItem.*GLOBAL|GLOBAL.*SelectItem/s);
    expect(content).toMatch(/SelectItem.*CA|CA.*SelectItem/s);
    expect(content).toMatch(/SelectItem.*VN|VN.*SelectItem/s);
    expect(content).toMatch(/SelectItem.*PH|PH.*SelectItem/s);
    expect(content).toMatch(/SelectItem.*US|US.*SelectItem/s);
  });

  it("E4: AdminUsers.tsx renders country-pack-badge", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/country-pack-badge/);
  });

  it("E5: AdminUsers.tsx renders language-mode-badge conditionally", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/language-mode-badge/);
    // Must be conditional (only shown when non-default)
    expect(content).toMatch(/languageMode.*!==.*"en"/);
  });

  it("E6: AdminUsers.tsx shows Country Pack and Language Mode in user detail panel", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/Country Pack/);
    expect(content).toMatch(/Language Mode/);
  });

  it("E7: AdminUsers.tsx preserves existing admin actions (Grant Credits, Make Admin, Disable)", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/Grant Credits/);
    expect(content).toMatch(/Make Admin|Remove Admin/);
    expect(content).toMatch(/Disable Account|Enable Account/);
  });

  it("E8: AdminUsers.tsx uses effectivePack fallback (null → GLOBAL)", () => {
    const content = fs.readFileSync(adminUsersPath, "utf-8");
    expect(content).toMatch(/countryPackId.*\?\?.*"GLOBAL"|"GLOBAL".*countryPackId/);
  });
});

// ─── F) Regression: countryPackRegistry still has all 5 packs ────────────────

describe("F) countryPackRegistry regression", () => {
  it("F1: registry has 5 packs: GLOBAL, CA, VN, PH, US", () => {
    expect(COUNTRY_PACK_IDS).toHaveLength(5);
    expect(COUNTRY_PACK_IDS).toContain("GLOBAL");
    expect(COUNTRY_PACK_IDS).toContain("CA");
    expect(COUNTRY_PACK_IDS).toContain("VN");
    expect(COUNTRY_PACK_IDS).toContain("PH");
    expect(COUNTRY_PACK_IDS).toContain("US");
  });

  it("F2: DEFAULT_COUNTRY_PACK_ID is GLOBAL", () => {
    expect(DEFAULT_COUNTRY_PACK_ID).toBe("GLOBAL");
  });

  it("F3: CA pack has correct config", () => {
    const ca = countryPackRegistry["CA"];
    expect(ca).toBeDefined();
    expect(ca.defaultLanguageMode).toBe("en");
    expect(ca.translationEnabled).toBe(false);
    expect(ca.templateStyleKey).toBe("ca_english");
  });
});
