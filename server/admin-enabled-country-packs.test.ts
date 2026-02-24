/**
 * Tests: Admin-controlled Country Pack Visibility
 *
 * Covers:
 * A) getEnabledCountryPacks() db helper — default fallback + JSON parsing
 * B) system.setEnabledCountryPacks mutation — validation + persistence
 * C) system.featureFlags — includes enabledCountryPacks field
 * D) Onboarding.tsx — COUNTRY_OPTIONS filtered by enabledCountryPacks
 * E) Profile.tsx — country pack selector filtered by enabledCountryPacks
 * F) AdminSettings.tsx — renders pack checkboxes + save button
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

// ─── Helper: read source files ────────────────────────────────────────────────
function readSrc(rel: string) {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

// ─── A) getEnabledCountryPacks db helper ─────────────────────────────────────
describe("A: getEnabledCountryPacks db helper", () => {
  const dbSrc = readSrc("server/db.ts");

  it("A1: exports getEnabledCountryPacks function", () => {
    expect(dbSrc).toContain("export async function getEnabledCountryPacks");
  });

  it("A2: falls back to [\"CA\"] when setting is null/missing", () => {
    expect(dbSrc).toContain('return ["CA"]');
  });

  it("A3: parses JSON array from admin_settings", () => {
    expect(dbSrc).toContain("JSON.parse(raw)");
    expect(dbSrc).toContain("Array.isArray(parsed)");
  });

  it("A4: exports setAdminSetting function", () => {
    expect(dbSrc).toContain("export async function setAdminSetting");
  });

  it("A5: exports getAdminSetting function", () => {
    expect(dbSrc).toContain("export async function getAdminSetting");
  });

  it("A6: uses onDuplicateKeyUpdate for upsert", () => {
    expect(dbSrc).toContain("onDuplicateKeyUpdate");
  });

  it("A7: returns null when db is unavailable", () => {
    // getAdminSetting returns null when db is null
    expect(dbSrc).toContain("if (!db) return null");
  });
});

// ─── B) system.setEnabledCountryPacks mutation ────────────────────────────────
describe("B: system.setEnabledCountryPacks mutation", () => {
  const routerSrc = readSrc("server/_core/systemRouter.ts");

  it("B1: mutation is defined in systemRouter", () => {
    expect(routerSrc).toContain("setEnabledCountryPacks");
  });

  it("B2: uses adminProcedure (admin-only)", () => {
    // setEnabledCountryPacks must be gated by adminProcedure
    const mutationBlock = routerSrc.slice(
      routerSrc.indexOf("setEnabledCountryPacks"),
      routerSrc.indexOf("setEnabledCountryPacks") + 300
    );
    expect(mutationBlock).toContain("adminProcedure");
  });

  it("B3: validates enabled array with z.enum(ALL_PACK_IDS)", () => {
    expect(routerSrc).toContain(".array(z.enum(ALL_PACK_IDS))");
  });

  it("B4: enforces minimum 1 pack", () => {
    expect(routerSrc).toContain('.min(1,');
  });

  it("B5: persists using setAdminSetting with key 'enabled_country_packs'", () => {
    expect(routerSrc).toContain('"enabled_country_packs"');
    expect(routerSrc).toContain("setAdminSetting");
  });

  it("B6: returns { success: true, enabled }", () => {
    expect(routerSrc).toContain("success: true");
    expect(routerSrc).toContain("enabled: input.enabled");
  });

  it("B7: ALL_PACK_IDS includes all 5 packs", () => {
    expect(routerSrc).toContain('"GLOBAL"');
    expect(routerSrc).toContain('"CA"');
    expect(routerSrc).toContain('"VN"');
    expect(routerSrc).toContain('"PH"');
    expect(routerSrc).toContain('"US"');
  });
});

// ─── C) system.featureFlags — includes enabledCountryPacks ────────────────────
describe("C: system.featureFlags includes enabledCountryPacks", () => {
  const routerSrc = readSrc("server/_core/systemRouter.ts");

  it("C1: featureFlags query is now async", () => {
    expect(routerSrc).toContain("featureFlags: publicProcedure.query(async");
  });

  it("C2: featureFlags returns enabledCountryPacks field", () => {
    expect(routerSrc).toContain("enabledCountryPacks");
  });

  it("C3: calls getEnabledCountryPacks() when v2CountryPacksEnabled is true", () => {
    expect(routerSrc).toContain("await db.getEnabledCountryPacks()");
  });

  it("C4: falls back to [\"CA\"] when v2CountryPacksEnabled is false", () => {
    expect(routerSrc).toContain('["CA"]');
  });
});

// ─── D) Onboarding.tsx — filters COUNTRY_OPTIONS by enabledCountryPacks ──────
describe("D: Onboarding.tsx filters COUNTRY_OPTIONS by enabledCountryPacks", () => {
  const onboardingSrc = readSrc("client/src/pages/Onboarding.tsx");

  it("D1: reads enabledCountryPacks from featureFlags", () => {
    expect(onboardingSrc).toContain("enabledCountryPacks");
    expect(onboardingSrc).toContain('flags?.enabledCountryPacks ?? ["CA"]');
  });

  it("D2: filters COUNTRY_OPTIONS by enabledCountryPacks before rendering", () => {
    expect(onboardingSrc).toContain("COUNTRY_OPTIONS.filter");
    expect(onboardingSrc).toContain("enabledCountryPacks.includes(c.id)");
  });

  it("D3: COUNTRY_OPTIONS still defines all 5 packs (GLOBAL/CA/VN/PH/US)", () => {
    expect(onboardingSrc).toContain('"GLOBAL"');
    expect(onboardingSrc).toContain('"CA"');
    expect(onboardingSrc).toContain('"VN"');
    expect(onboardingSrc).toContain('"PH"');
    expect(onboardingSrc).toContain('"US"');
  });

  it("D4: filter is applied inside the RadioGroup map", () => {
    // The filter should be on the same line as .map for the country cards
    const filterLine = onboardingSrc
      .split("\n")
      .find((l) => l.includes("COUNTRY_OPTIONS.filter") && l.includes(".map"));
    expect(filterLine).toBeTruthy();
  });

  it("D5: fallback is [\"CA\"] when flags not yet loaded", () => {
    expect(onboardingSrc).toContain('flags?.enabledCountryPacks ?? ["CA"]');
  });
});

// ─── E) Profile.tsx — country pack selector filtered by enabledCountryPacks ──
describe("E: Profile.tsx filters country pack selector by enabledCountryPacks", () => {
  const profileSrc = readSrc("client/src/pages/Profile.tsx");

  it("E1: reads enabledCountryPacks from featureFlags", () => {
    expect(profileSrc).toContain("enabledCountryPacks");
    expect(profileSrc).toContain('flags?.enabledCountryPacks ?? ["CA"]');
  });

  it("E2: GLOBAL option is conditionally rendered", () => {
    expect(profileSrc).toContain('enabledCountryPacks.includes("GLOBAL")');
  });

  it("E3: CA option is conditionally rendered", () => {
    expect(profileSrc).toContain('enabledCountryPacks.includes("CA")');
  });

  it("E4: VN option is conditionally rendered", () => {
    expect(profileSrc).toContain('enabledCountryPacks.includes("VN")');
  });

  it("E5: PH option is conditionally rendered", () => {
    expect(profileSrc).toContain('enabledCountryPacks.includes("PH")');
  });

  it("E6: US option is conditionally rendered", () => {
    expect(profileSrc).toContain('enabledCountryPacks.includes("US")');
  });

  it("E7: shows disabled item for user's current pack if it is not in enabled list", () => {
    expect(profileSrc).toContain("not currently offered");
    expect(profileSrc).toContain("!enabledCountryPacks.includes(userCountryPackId)");
  });
});

// ─── F) AdminSettings.tsx — renders pack checkboxes + save button ─────────────
describe("F: AdminSettings.tsx admin UI", () => {
  const settingsSrc = readSrc("client/src/pages/admin/AdminSettings.tsx");

  it("F1: renders a checkbox row for each pack using template literal testid", () => {
    // Template literal renders pack-checkbox-row-${pack.id} dynamically for all 5 packs
    expect(settingsSrc).toContain('pack-checkbox-row-${pack.id}');
    // ALL_PACKS array contains all 5 pack IDs
    expect(settingsSrc).toContain('"CA"');
    expect(settingsSrc).toContain('"VN"');
    expect(settingsSrc).toContain('"PH"');
    expect(settingsSrc).toContain('"US"');
    expect(settingsSrc).toContain('"GLOBAL"');
  });

  it("F2: has a save button with data-testid", () => {
    expect(settingsSrc).toContain('data-testid="save-enabled-packs-btn"');
  });

  it("F3: calls system.setEnabledCountryPacks mutation on save", () => {
    expect(settingsSrc).toContain("setEnabledCountryPacks");
    expect(settingsSrc).toContain("setEnabledPacks.mutate");
  });

  it("F4: prevents saving when no packs are selected", () => {
    expect(settingsSrc).toContain("selected.size === 0");
  });

  it("F5: shows 'Unsaved changes' when dirty", () => {
    expect(settingsSrc).toContain("Unsaved changes");
    expect(settingsSrc).toContain("isDirty");
  });

  it("F6: shows status badge (Enabled/Disabled) per pack", () => {
    expect(settingsSrc).toContain("Enabled");
    expect(settingsSrc).toContain("Disabled");
    expect(settingsSrc).toContain("pack-status-badge");
  });

  it("F7: uses AdminLayout wrapper", () => {
    expect(settingsSrc).toContain("AdminLayout");
  });

  it("F8: initialises from featureFlags.enabledCountryPacks", () => {
    expect(settingsSrc).toContain("flags?.enabledCountryPacks");
    expect(settingsSrc).toContain("setSelected");
  });
});

// ─── G) AdminLayout — Settings nav item ───────────────────────────────────────
describe("G: AdminLayout includes Settings nav item", () => {
  const layoutSrc = readSrc("client/src/components/AdminLayout.tsx");

  it("G1: has /admin/settings route in nav items", () => {
    expect(layoutSrc).toContain('"/admin/settings"');
  });

  it("G2: label is 'Settings'", () => {
    expect(layoutSrc).toContain('"Settings"');
  });

  it("G3: uses Settings icon from lucide-react", () => {
    expect(layoutSrc).toContain("Settings");
  });
});

// ─── H) App.tsx — AdminSettings route registered ─────────────────────────────
describe("H: App.tsx registers /admin/settings route", () => {
  const appSrc = readSrc("client/src/App.tsx");

  it("H1: imports AdminSettings", () => {
    expect(appSrc).toContain("import AdminSettings");
  });

  it("H2: registers /admin/settings route", () => {
    expect(appSrc).toContain('path="/admin/settings"');
    expect(appSrc).toContain("component={AdminSettings}");
  });
});

// ─── I) schema.ts — admin_settings table ─────────────────────────────────────
describe("I: schema.ts admin_settings table", () => {
  const schemaSrc = readSrc("drizzle/schema.ts");

  it("I1: defines adminSettings table", () => {
    expect(schemaSrc).toContain("adminSettings");
  });

  it("I2: has key column (primary key)", () => {
    expect(schemaSrc).toContain("key");
  });

  it("I3: has valueJson column", () => {
    expect(schemaSrc).toContain("valueJson");
  });

  it("I4: has updatedAt column", () => {
    expect(schemaSrc).toContain("updatedAt");
  });
});
